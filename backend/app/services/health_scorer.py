import json
from typing import Optional

HEALTH_SCORES = ("excellent", "very_good", "good", "could_be_better", "unhealthy")

DISPLAY_LABELS = {
    "excellent": "Excellent",
    "very_good": "Very Good",
    "good": "Good",
    "could_be_better": "Could Be Better",
    "unhealthy": "Unhealthy",
}


def _parse_micros(ai_analysis: Optional[str]) -> dict:
    if not ai_analysis:
        return {}
    try:
        data = json.loads(ai_analysis)
        return data.get("micronutrients") or {}
    except (json.JSONDecodeError, TypeError):
        return {}


def score_meal_health(
    *,
    calories: float,
    protein_g: float,
    carbs_g: float,
    fat_g: float,
    fiber_g: float,
    daily_calorie_target: Optional[int],
    daily_protein_target: Optional[int],
    goal: str = "",
    ai_analysis: Optional[str] = None,
) -> str:
    cal_target = daily_calorie_target or 2000
    protein_target = daily_protein_target or 80
    meal_cal_budget = cal_target / 4

    points = 0

    if protein_g >= 28:
        points += 3
    elif protein_g >= 18:
        points += 2
    elif protein_g >= 10:
        points += 1
    elif protein_g < 5 and calories > 200:
        points -= 1

    if fiber_g >= 8:
        points += 2
    elif fiber_g >= 4:
        points += 1

    if calories <= meal_cal_budget * 1.05:
        points += 2
    elif calories <= meal_cal_budget * 1.3:
        points += 1
    elif calories > meal_cal_budget * 1.8:
        points -= 2
    elif calories > meal_cal_budget * 2.5:
        points -= 3

    if calories > 0:
        protein_ratio = (protein_g * 4) / calories
        if protein_ratio >= 0.25:
            points += 1
        fat_ratio = (fat_g * 9) / calories
        if fat_ratio > 0.55:
            points -= 2
        elif fat_ratio > 0.45:
            points -= 1

    micros = _parse_micros(ai_analysis)
    sugar = float(micros.get("sugar_g", 0) or 0)
    sat_fat = float(micros.get("saturated_fat_g", 0) or 0)
    sodium = float(micros.get("sodium_mg", 0) or 0)

    if sugar > 25:
        points -= 2
    elif sugar > 15:
        points -= 1
    if sat_fat > 12:
        points -= 2
    elif sat_fat > 8:
        points -= 1
    if sodium > 1200:
        points -= 1

    if goal in ("fat_loss", "lose_weight") and calories > meal_cal_budget * 1.4:
        points -= 1
    if goal in ("muscle_gain", "gain_muscle") and protein_g >= 25:
        points += 1

    if points >= 7:
        return "excellent"
    if points >= 5:
        return "very_good"
    if points >= 2:
        return "good"
    if points >= 0:
        return "could_be_better"
    return "unhealthy"