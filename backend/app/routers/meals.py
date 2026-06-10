import os
import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Meal
from ..schemas import MealCreate, MealResponse, MealAnalysis
from ..llm.groq_client import estimate_meal_from_text, analyze_meal_image, AIError

router = APIRouter(prefix="/api/meals", tags=["meals"])
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _to_meal_analysis(result: dict) -> MealAnalysis:
    if result.get("error"):
        raise AIError(result["error"])
    return MealAnalysis(
        name=result.get("name", "Meal"),
        description=result.get("description", ""),
        calories=float(result.get("calories", 0)),
        protein_g=float(result.get("protein_g", 0)),
        carbs_g=float(result.get("carbs_g", 0)),
        fat_g=float(result.get("fat_g", 0)),
        fiber_g=float(result.get("fiber_g", 0)),
        confidence=result.get("confidence", "medium"),
        notes=result.get("notes", ""),
    )


@router.post("/analyze-text", response_model=MealAnalysis)
def analyze_text(description: str, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        result = estimate_meal_from_text(description, user.dietary_restrictions)
        return _to_meal_analysis(result)
    except AIError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/analyze-image", response_model=MealAnalysis)
async def analyze_image(
    user_id: int = Form(...),
    meal_type: str = Form("lunch"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    image_bytes = await file.read()
    try:
        result = analyze_meal_image(image_bytes, user.dietary_restrictions)
        return _to_meal_analysis(result)
    except AIError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/{user_id}", response_model=MealResponse)
def log_meal(user_id: int, payload: MealCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    meal = Meal(user_id=user_id, log_date=date.today(), **payload.model_dump())
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal


@router.post("/{user_id}/with-image", response_model=MealResponse)
async def log_meal_with_image(
    user_id: int,
    meal_type: str = Form("lunch"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    image_bytes = await file.read()
    try:
        analysis = analyze_meal_image(image_bytes, user.dietary_restrictions)
    except AIError as e:
        raise HTTPException(status_code=503, detail=str(e))

    ext = os.path.splitext(file.filename or "meal.jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(image_bytes)

    meal = Meal(
        user_id=user_id,
        name=analysis.get("name", "Meal from photo"),
        description=analysis.get("description", ""),
        meal_type=meal_type,
        calories=analysis.get("calories", 0),
        protein_g=analysis.get("protein_g", 0),
        carbs_g=analysis.get("carbs_g", 0),
        fat_g=analysis.get("fat_g", 0),
        fiber_g=analysis.get("fiber_g", 0),
        image_path=filename,
        ai_analysis=analysis.get("notes", ""),
        log_date=date.today(),
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal


@router.get("/{user_id}", response_model=list[MealResponse])
def get_meals(user_id: int, log_date: date | None = None, db: Session = Depends(get_db)):
    query = db.query(Meal).filter(Meal.user_id == user_id)
    if log_date:
        query = query.filter(Meal.log_date == log_date)
    return query.order_by(Meal.logged_at.desc()).all()