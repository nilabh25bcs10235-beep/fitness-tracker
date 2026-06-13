from typing import Optional

# MET values — calories = MET * weight_kg * (minutes / 60)
ACTIVITY_METS = {
    "walking": 3.5,
    "brisk walk": 4.3,
    "jogging": 7.0,
    "running": 9.8,
    "sprint": 12.0,
    "cycling": 7.5,
    "swimming": 8.0,
    "yoga": 3.0,
    "pilates": 3.5,
    "weight training": 6.0,
    "strength training": 6.0,
    "hiit": 9.0,
    "dancing": 5.5,
    "hiking": 6.5,
    "rowing": 7.0,
    "elliptical": 5.5,
    "stair climbing": 8.5,
    "jump rope": 11.0,
    "football": 8.0,
    "soccer": 8.0,
    "basketball": 6.5,
    "tennis": 7.3,
    "badminton": 5.5,
    "cricket": 4.8,
    "boxing": 9.0,
    "martial arts": 8.5,
    "crossfit": 8.5,
}


def _normalize_activity(activity: str) -> str:
    return activity.strip().lower()


def _match_met(activity: str) -> Optional[float]:
    key = _normalize_activity(activity)
    if key in ACTIVITY_METS:
        return ACTIVITY_METS[key]
    for name, met in ACTIVITY_METS.items():
        if name in key or key in name:
            return met
    return None


def calculate_targets_local(
    age: int,
    weight_kg: float,
    height_cm: Optional[float],
    goal: str,
    gender: Optional[str] = None,
) -> dict:
    height = height_cm or (175 if (gender or "").lower() in ("male", "m") else 162)
    is_male = (gender or "").lower() in ("male", "m")

    if is_male:
        bmr = 10 * weight_kg + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height - 5 * age - 161

    tdee = bmr * 1.55

    if goal in ("fat_loss", "lose_weight"):
        calories = int(tdee * 0.82)
        protein = int(weight_kg * 2.0)
        reasoning = "Moderate deficit with high protein to preserve muscle during fat loss."
    elif goal in ("muscle_gain", "gain_muscle"):
        calories = int(tdee * 1.12)
        protein = int(weight_kg * 2.2)
        reasoning = "Slight surplus with elevated protein to support muscle growth."
    else:
        calories = int(tdee)
        protein = int(weight_kg * 1.6)
        reasoning = "Maintenance calories with balanced macros for everyday health."

    fat = max(40, int(calories * 0.25 / 9))
    carbs = max(80, int((calories - protein * 4 - fat * 9) / 4))

    return {
        "daily_calorie_target": calories,
        "daily_protein_target": protein,
        "daily_carbs_target": carbs,
        "daily_fat_target": fat,
        "reasoning": reasoning,
    }


def estimate_calorie_burn_local(
    activity: str,
    duration_min: int,
    intensity: str,
    weight_kg: float,
) -> Optional[dict]:
    met = _match_met(activity)
    if met is None:
        return None

    multiplier = {"light": 0.85, "moderate": 1.0, "vigorous": 1.2}.get(intensity, 1.0)
    calories = int(met * multiplier * weight_kg * (duration_min / 60))

    related = [
        name.title()
        for name, _ in sorted(ACTIVITY_METS.items(), key=lambda x: -x[1])[:3]
        if name != _normalize_activity(activity)
    ][:3]

    return {
        "activity": activity.strip().title(),
        "duration_min": duration_min,
        "calories_burned": max(1, calories),
        "notes": f"Estimate based on MET {met:.1f} at {intensity} intensity for {weight_kg:.0f}kg.",
        "related_exercises": related or ["Walking", "Cycling", "Swimming"],
        "source": "local",
    }