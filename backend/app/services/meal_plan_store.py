import json
import uuid
from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from ..models import User, UserMealPlan

DAY_NAMES = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
MEAL_TYPES = ("breakfast", "lunch", "dinner", "snack")


def _loads(raw: str, fallback: Any) -> Any:
    try:
        return json.loads(raw) if raw else fallback
    except json.JSONDecodeError:
        return fallback


def _dumps(data: Any) -> str:
    return json.dumps(data)


def get_or_create_plan(user: User, db: Session) -> UserMealPlan:
    plan = db.query(UserMealPlan).filter(UserMealPlan.user_id == user.id).first()
    if plan:
        return plan
    plan = UserMealPlan(user_id=user.id)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def today_name() -> str:
    return DAY_NAMES[date.today().weekday()]


def parse_schedule_from_ai(schedule_lines: list[str], recipes: list[dict]) -> list[dict]:
    recipe_by_name = {r.get("name", "").lower(): r for r in recipes}
    entries: list[dict] = []

    for line in schedule_lines:
        lower = line.lower()
        day = next((d for d in DAY_NAMES if d.lower() in lower), None)
        meal_type = next((m for m in MEAL_TYPES if m in lower), "lunch")
        if not day:
            continue

        matched = None
        for name, recipe in recipe_by_name.items():
            if name and name in lower:
                matched = recipe
                break

        entries.append({
            "id": str(uuid.uuid4()),
            "day": day,
            "meal_type": meal_type,
            "name": matched.get("name", line.split(":", 1)[-1].strip()) if matched else line,
            "description": matched.get("description", "") if matched else "",
            "calories": matched.get("calories", 0) if matched else 0,
            "protein_g": matched.get("protein_g", 0) if matched else 0,
            "notes": "",
        })

    if not entries and recipes:
        for i, day in enumerate(DAY_NAMES):
            recipe = recipes[i % len(recipes)]
            for meal_type in ("breakfast", "lunch", "dinner"):
                entries.append({
                    "id": str(uuid.uuid4()),
                    "day": day,
                    "meal_type": meal_type,
                    "name": recipe.get("name", "Meal"),
                    "description": recipe.get("description", ""),
                    "calories": recipe.get("calories", 0),
                    "protein_g": recipe.get("protein_g", 0),
                    "notes": "",
                })
    return entries


def grocery_from_ai(items: list[str]) -> list[dict]:
    return [{"id": str(uuid.uuid4()), "text": item, "checked": False} for item in items]


def resolve_today_plan(weekly: list[dict], today_override: list[dict]) -> list[dict]:
    day = today_name()
    base = [e for e in weekly if e.get("day") == day]
    if not today_override:
        return base

    override_map = {e.get("id"): e for e in today_override if e.get("id")}
    result = []
    for entry in base:
        oid = entry.get("id")
        result.append(override_map.get(oid, entry))
    extra = [e for e in today_override if e.get("id") not in {x.get("id") for x in base}]
    return result + extra


def plan_to_response(plan: UserMealPlan) -> dict:
    recipes = _loads(plan.recipes_json, [])
    weekly = _loads(plan.weekly_schedule_json, [])
    grocery = _loads(plan.grocery_list_json, [])
    today_override = _loads(plan.today_plan_json, [])
    today_plan = resolve_today_plan(weekly, today_override)

    return {
        "recipes": recipes,
        "weekly_schedule": weekly,
        "grocery_list": grocery,
        "today_plan": today_plan,
        "today_name": today_name(),
        "ai_notes": plan.ai_notes or "",
        "consumption_schedule": [
            f"{e['day']} {e['meal_type']}: {e['name']}" for e in weekly
        ],
        "updated_at": plan.updated_at.isoformat() if plan.updated_at else None,
    }


def save_generated_plan(
    user: User,
    db: Session,
    *,
    recipes: list[dict],
    grocery: list[str],
    schedule_lines: list[str],
    ai_notes: str,
) -> dict:
    plan = get_or_create_plan(user, db)
    weekly = parse_schedule_from_ai(schedule_lines, recipes)
    plan.recipes_json = _dumps(recipes)
    plan.weekly_schedule_json = _dumps(weekly)
    plan.grocery_list_json = _dumps(grocery_from_ai(grocery))
    plan.today_plan_json = _dumps([])
    plan.ai_notes = ai_notes
    db.commit()
    db.refresh(plan)
    return plan_to_response(plan)