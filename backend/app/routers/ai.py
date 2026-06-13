import json
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_user_profile
from ..models import User, Meal, CoachConversation, CoachMessage
from ..schemas import (
    InsightRequest,
    InsightResponse,
    BodyImageAnalysis,
    ExercisePlanResponse,
    ExerciseItem,
    CalorieBurnRequest,
    CalorieBurnResponse,
    CoachMessageCreate,
    CoachMessageResponse,
    CoachConversationSummary,
    CoachConversationResponse,
    CoachChatResponse,
)
from ..data.exercise_templates import get_template
from ..llm.groq_client import (
    get_smart_insight,
    coach_reply,
    get_exercise_plan,
    estimate_calorie_burn,
    AIError,
)
from ..llm.collaborative_analysis import analyze_body_image_collaborative
from ..services.ai_cache import get_cached, set_cached
from ..services.nutrition_math import estimate_calorie_burn_local
from ..services.youtube_search import enrich_items_with_videos

router = APIRouter(prefix="/api/ai", tags=["ai"])

MAX_HISTORY_MESSAGES = 24


def _message_response(msg: CoachMessage) -> CoachMessageResponse:
    suggestions = []
    if msg.suggestions_json:
        try:
            suggestions = json.loads(msg.suggestions_json)
        except json.JSONDecodeError:
            suggestions = []
    return CoachMessageResponse(
        id=msg.id,
        role=msg.role,
        content=msg.content,
        suggestions=suggestions,
        created_at=msg.created_at,
    )


def _conversation_title(text: str) -> str:
    cleaned = " ".join(text.strip().split())
    if not cleaned:
        return "New conversation"
    return cleaned[:60] + ("…" if len(cleaned) > 60 else "")


def _get_owned_conversation(
    conversation_id: int,
    user: User,
    db: Session,
) -> CoachConversation:
    conv = (
        db.query(CoachConversation)
        .filter(CoachConversation.id == conversation_id, CoachConversation.user_id == user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


def _today_macros(user: User, db: Session) -> dict:
    today_meals = db.query(Meal).filter(Meal.user_id == user.id, Meal.log_date == date.today()).all()
    return {
        "calories": sum(m.calories for m in today_meals),
        "protein": sum(m.protein_g for m in today_meals),
        "carbs": sum(m.carbs_g for m in today_meals),
        "fat": sum(m.fat_g for m in today_meals),
        "meals_logged": len(today_meals),
    }


def _user_context(user: User) -> dict:
    return {
        "name": user.name,
        "age": user.age,
        "weight_kg": user.weight_kg,
        "height_cm": user.height_cm,
        "gender": user.gender,
        "goal": user.goal,
        "dietary_restrictions": user.dietary_restrictions,
        "daily_calorie_target": user.daily_calorie_target,
        "daily_protein_target": user.daily_protein_target,
    }


@router.post("/me/insight", response_model=InsightResponse)
def get_insight(
    payload: InsightRequest,
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    today_macros = _today_macros(user, db)
    ctx = _user_context(user)
    cache_payload = {
        "query": payload.query.strip().lower(),
        "macros": today_macros,
        "goal": user.goal,
    }
    cached = get_cached("insight", cache_payload)
    if cached:
        result = cached
    else:
        try:
            result = get_smart_insight(payload.query, ctx, today_macros)
            set_cached("insight", cache_payload, result, ttl=1800)
        except AIError as e:
            raise HTTPException(status_code=503, detail=str(e))

    return InsightResponse(
        answer=result.get("answer", ""),
        suggestions=result.get("suggestions", []),
        is_ai=True,
        source="ai",
    )


@router.post("/me/body-image", response_model=BodyImageAnalysis)
async def analyze_body(
    file: UploadFile = File(...),
    user: User = Depends(get_user_profile),
):
    image_bytes = await file.read()
    try:
        result = analyze_body_image_collaborative(image_bytes, _user_context(user))
    except AIError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return BodyImageAnalysis(
        estimated_bmi=float(result.get("estimated_bmi", 0)),
        bmi_category=result.get("bmi_category"),
        body_fat_pct=result.get("body_fat_pct"),
        muscle_mass_kg=result.get("muscle_mass_kg"),
        lean_mass_kg=result.get("lean_mass_kg"),
        fat_mass_kg=result.get("fat_mass_kg"),
        skeletal_muscle_pct=result.get("skeletal_muscle_pct"),
        visceral_fat_level=result.get("visceral_fat_level"),
        waist_to_height_ratio=result.get("waist_to_height_ratio"),
        metabolic_age=result.get("metabolic_age"),
        basal_metabolic_rate_kcal=result.get("basal_metabolic_rate_kcal"),
        daily_calorie_estimate_kcal=result.get("daily_calorie_estimate_kcal"),
        protein_target_g=result.get("protein_target_g"),
        hydration_target_ml=result.get("hydration_target_ml"),
        posture_score=result.get("posture_score"),
        body_type=result.get("body_type"),
        fitness_level=result.get("fitness_level"),
        physique_notes=result.get("physique_notes", ""),
        muscle_balance=result.get("muscle_balance"),
        nutritional_advice=result.get("nutritional_advice", ""),
        goal_recommendations=result.get("goal_recommendations", []),
        review_passes=result.get("review_passes", 5),
        analysis_method=result.get("analysis_method", ""),
    )


@router.post("/me/exercises", response_model=ExercisePlanResponse)
def get_exercises(
    body_part: str,
    user: User = Depends(get_user_profile),
):
    part = body_part.strip()
    if not part:
        raise HTTPException(status_code=400, detail="body_part is required")

    template = get_template(part)
    used_template = bool(template)
    if template:
        result = template
    else:
        cache_payload = {"body_part": part.lower(), "goal": user.goal}
        cached = get_cached("exercises", cache_payload)
        if cached:
            result = cached
        else:
            try:
                result = get_exercise_plan(part, _user_context(user))
                set_cached("exercises", cache_payload, result, ttl=86400)
            except AIError as e:
                raise HTTPException(status_code=503, detail=str(e))

    raw_exercises = result.get("exercises", [])
    if not used_template:
        raw_exercises = enrich_items_with_videos(raw_exercises, kind="exercise")
    exercises = [ExerciseItem(**e) for e in raw_exercises]
    return ExercisePlanResponse(
        body_part=result.get("body_part", body_part),
        exercises=exercises,
        cardio_options=result.get("cardio_options", []),
        tips=result.get("tips", []),
    )


@router.post("/me/calorie-burn", response_model=CalorieBurnResponse)
def calorie_burn(
    payload: CalorieBurnRequest,
    user: User = Depends(get_user_profile),
):
    local = estimate_calorie_burn_local(
        payload.activity,
        payload.duration_min,
        payload.intensity,
        user.weight_kg,
    )
    if local:
        result = local
    else:
        cache_payload = {
            "activity": payload.activity.strip().lower(),
            "duration": payload.duration_min,
            "intensity": payload.intensity,
            "weight": round(user.weight_kg),
        }
        cached = get_cached("calorie_burn", cache_payload)
        if cached:
            result = cached
        else:
            try:
                result = estimate_calorie_burn(
                    payload.activity,
                    payload.duration_min,
                    payload.intensity,
                    _user_context(user),
                )
                set_cached("calorie_burn", cache_payload, result, ttl=86400)
            except AIError as e:
                raise HTTPException(status_code=503, detail=str(e))

    return CalorieBurnResponse(
        activity=result.get("activity", payload.activity),
        duration_min=int(result.get("duration_min", payload.duration_min)),
        calories_burned=int(result.get("calories_burned", 0)),
        notes=result.get("notes", ""),
        related_exercises=result.get("related_exercises", []),
    )


@router.get("/me/conversations", response_model=list[CoachConversationSummary])
def list_conversations(
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    conversations = (
        db.query(CoachConversation)
        .filter(CoachConversation.user_id == user.id)
        .order_by(CoachConversation.updated_at.desc())
        .all()
    )
    summaries = []
    for conv in conversations:
        msgs = conv.messages
        preview = ""
        if msgs:
            last = msgs[-1]
            preview = last.content[:120] + ("…" if len(last.content) > 120 else "")
        summaries.append(
            CoachConversationSummary(
                id=conv.id,
                title=conv.title,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                message_count=len(msgs),
                preview=preview,
            )
        )
    return summaries


@router.post("/me/conversations", response_model=CoachConversationResponse)
def create_conversation(
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    conv = CoachConversation(user_id=user.id, title="New conversation")
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return CoachConversationResponse(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[],
    )


@router.get("/me/conversations/{conversation_id}", response_model=CoachConversationResponse)
def get_conversation(
    conversation_id: int,
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    conv = _get_owned_conversation(conversation_id, user, db)
    return CoachConversationResponse(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[_message_response(m) for m in conv.messages],
    )


@router.delete("/me/conversations/{conversation_id}", status_code=204)
def delete_conversation(
    conversation_id: int,
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    conv = _get_owned_conversation(conversation_id, user, db)
    db.delete(conv)
    db.commit()
    return None


@router.post("/me/conversations/{conversation_id}/messages", response_model=CoachChatResponse)
def send_coach_message(
    conversation_id: int,
    payload: CoachMessageCreate,
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    conv = _get_owned_conversation(conversation_id, user, db)
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    user_msg = CoachMessage(
        conversation_id=conv.id,
        role="user",
        content=content,
    )
    db.add(user_msg)
    db.flush()

    if conv.title == "New conversation":
        conv.title = _conversation_title(content)

    prior_msgs = (
        db.query(CoachMessage)
        .filter(CoachMessage.conversation_id == conv.id, CoachMessage.id != user_msg.id)
        .order_by(CoachMessage.created_at)
        .all()
    )
    history = [
        {"role": m.role, "content": m.content}
        for m in prior_msgs[-MAX_HISTORY_MESSAGES:]
    ]
    history.append({"role": "user", "content": content})

    try:
        result = coach_reply(history, _user_context(user), _today_macros(user, db))
    except AIError as e:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(e))

    assistant_msg = CoachMessage(
        conversation_id=conv.id,
        role="assistant",
        content=result.get("answer", ""),
        suggestions_json=json.dumps(result.get("suggestions", [])),
    )
    db.add(assistant_msg)
    conv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(assistant_msg)

    return CoachChatResponse(
        conversation_id=conv.id,
        message=_message_response(assistant_msg),
    )