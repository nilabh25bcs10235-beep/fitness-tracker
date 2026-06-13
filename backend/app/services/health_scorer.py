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

JUNK_KEYWORDS = (
    "waffle", "burger", "pizza", "fries", "fried", "donut", "doughnut", "candy",
    "soda", "milkshake", "shake", "pastry", "pancake", "syrup", "bacon", "hot dog",
    "hotdog", "nachos", "nugget", "chips", "cookie", "cake", "ice cream", "icecream",
    "steak burger", "cheeseburger", "fast food", "deep fried", "deep-fried", "oily",
    "ramen", "instant noodle", "pop tart", "croissant", "muffin", "bagel", "samosa",
    "pakora", "bhatura", "puri", "kachori", "vada", "spring roll", "mozzarella stick",
    "onion ring", "loaded", "smothered", "gravy", "mayo", "ranch",
)


def _parse_ai_payload(ai_analysis: Optional[str]) -> dict:
    if not ai_analysis:
        return {}
    try:
        data = json.loads(ai_analysis)
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def _meal_text(name: str, description: str, ai_analysis: Optional[str]) -> str:
    payload = _parse_ai_payload(ai_analysis)
    notes = str(payload.get("notes", "") or "")
    return f"{name} {description} {notes}".lower()


def _is_junk_food(name: str, description: str, ai_analysis: Optional[str]) -> bool:
    text = _meal_text(name, description, ai_analysis)
    return any(kw in text for kw in JUNK_KEYWORDS)


def _is_fried_or_sweet_indulgence(name: str, description: str, ai_analysis: Optional[str]) -> bool:
    text = _meal_text(name, description, ai_analysis)
    markers = ("fried", "deep fried", "deep-fried", "oily", "waffle", "pancake", "syrup", "dessert", "candy")
    return any(m in text for m in markers)


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
    name: str = "",
    description: str = "",
) -> str:
    cal_target = daily_calorie_target or 2000
    protein_target = daily_protein_target or 80
    meal_cal_budget = cal_target / 4

    points = 0
    protein_ratio = 0.0
    junk = _is_junk_food(name, description, ai_analysis)
    indulgent = _is_fried_or_sweet_indulgence(name, description, ai_analysis)

    if protein_g >= 32:
        points += 3
    elif protein_g >= 22:
        points += 2
    elif protein_g >= 14:
        points += 1
    elif protein_g < 8 and calories > 250:
        points -= 2
    elif protein_g < 5 and calories > 180:
        points -= 3

    if fiber_g >= 8:
        points += 2
    elif fiber_g >= 4:
        points += 1
    elif fiber_g < 2 and calories > 350:
        points -= 1

    if calories <= meal_cal_budget * 0.95:
        points += 2
    elif calories <= meal_cal_budget * 1.15:
        points += 1
    elif calories > meal_cal_budget * 1.45:
        points -= 2
    elif calories > meal_cal_budget * 1.75:
        points -= 3
    elif calories > meal_cal_budget * 2.2:
        points -= 5

    if calories > 0:
        protein_ratio = (protein_g * 4) / calories
        protein_per_100_kcal = protein_g / (calories / 100)

        if protein_ratio >= 0.28:
            points += 2
        elif protein_ratio >= 0.22:
            points += 1
        elif protein_ratio < 0.15 and calories >= 300:
            points -= 3
        elif protein_ratio < 0.18 and calories >= 400:
            points -= 2

        if protein_per_100_kcal < 6 and calories >= 400:
            points -= 4
        elif protein_per_100_kcal < 8 and calories >= 300:
            points -= 2

        fat_ratio = (fat_g * 9) / calories
        if fat_ratio > 0.5:
            points -= 3
        elif fat_ratio > 0.42:
            points -= 2
        elif fat_ratio > 0.35 and calories > 450:
            points -= 1

        carb_ratio = (carbs_g * 4) / calories
        if carb_ratio > 0.62 and protein_ratio < 0.18:
            points -= 2

    payload = _parse_ai_payload(ai_analysis)
    micros = payload.get("micronutrients") or {}
    if not isinstance(micros, dict):
        micros = {}

    sugar = float(micros.get("sugar_g", 0) or 0)
    sat_fat = float(micros.get("saturated_fat_g", 0) or 0)
    sodium = float(micros.get("sodium_mg", 0) or 0)

    if indulgent and sugar < 12:
        sugar = max(sugar, 18.0)
    if junk and sat_fat < 8:
        sat_fat = max(sat_fat, 10.0)
    if junk and sodium < 600:
        sodium = max(sodium, 900.0)

    if sugar > 20:
        points -= 3
    elif sugar > 12:
        points -= 2
    elif sugar > 8 and calories > 350:
        points -= 1

    if sat_fat > 14:
        points -= 3
    elif sat_fat > 9:
        points -= 2
    elif sat_fat > 6 and calories > 400:
        points -= 1

    if sodium > 1400:
        points -= 2
    elif sodium > 900:
        points -= 1

    if goal in ("fat_loss", "lose_weight") and calories > meal_cal_budget * 1.2:
        points -= 2
    if goal in ("muscle_gain", "gain_muscle") and protein_g >= 28 and protein_ratio >= 0.22:
        points += 1

    if junk:
        points -= 4
        if calories >= 500:
            points -= 2
        if protein_g < 25:
            points -= 2

    if indulgent and calories >= 350:
        points -= 2

    if points >= 8:
        score = "excellent"
    elif points >= 5:
        score = "very_good"
    elif points >= 2:
        score = "good"
    elif points >= -1:
        score = "could_be_better"
    else:
        score = "unhealthy"

    if junk and score in ("excellent", "very_good", "good"):
        score = "could_be_better" if points >= -2 else "unhealthy"

    if indulgent and calories >= 450 and score in ("excellent", "very_good", "good"):
        score = "could_be_better"

    if calories >= 600 and protein_g < 22 and score in ("excellent", "very_good", "good"):
        score = "could_be_better" if protein_g >= 15 else "unhealthy"

    return score