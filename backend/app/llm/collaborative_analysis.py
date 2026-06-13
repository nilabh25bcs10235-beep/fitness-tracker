"""
Collaborative image analysis: Groq vision + Groq text work together,
then run REVIEW_PASSES reconciliation rounds before finalizing stats.
"""

import json
from typing import Callable, Dict, List, Optional

from .groq_client import (
    AIError,
    _ai_result,
    _chat_json,
    _vision_json,
    estimate_body_composition,
    estimate_meal_from_text,
)

REVIEW_PASSES = 5

MEAL_VISION_SYSTEM = """You are a strict nutrition vision expert for Indian and global meals.
Identify every visible food item and estimate nutrition realistically.

Be conservative for burgers, waffles, fried foods, fast food, desserts, and oily restaurant meals.
These are typically calorie-dense with high sugar, saturated fat, and sodium and poor protein density.
Do NOT underestimate sugar_g or saturated_fat_g. High calories with low protein is rarely "good".

Return ONLY valid JSON:
{
  "name": "meal name",
  "description": "detailed description of what you see",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "notes": "brief note",
  "micronutrients": {
    "iron_mg": number,
    "calcium_mg": number,
    "vitamin_c_mg": number,
    "sodium_mg": number,
    "potassium_mg": number,
    "zinc_mg": number,
    "vitamin_a_mcg": number,
    "vitamin_d_mcg": number,
    "sugar_g": number,
    "saturated_fat_g": number
  },
  "micro_description": "2-3 sentence micronutrient summary"
}"""

MEAL_REVIEW_SYSTEM = """You are a senior nutrition auditor reconciling vision AI and text AI estimates.
Each pass must cross-check both sources, fix inconsistencies, and refine numbers conservatively.
Do NOT output confidence scores.

Return ONLY valid JSON:
{
  "name": "meal name",
  "description": "refined description",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "notes": "what changed this pass and why",
  "micronutrients": {
    "iron_mg": number,
    "calcium_mg": number,
    "vitamin_c_mg": number,
    "sodium_mg": number,
    "potassium_mg": number,
    "zinc_mg": number,
    "vitamin_a_mcg": number,
    "vitamin_d_mcg": number,
    "sugar_g": number,
    "saturated_fat_g": number
  },
  "micro_description": "2-3 sentence micronutrient summary"
}"""

BODY_STATS_SCHEMA = """{
  "estimated_bmi": number,
  "bmi_category": "underweight|normal|overweight|obese",
  "body_fat_pct": number,
  "muscle_mass_kg": number,
  "lean_mass_kg": number,
  "fat_mass_kg": number,
  "skeletal_muscle_pct": number,
  "visceral_fat_level": number,
  "waist_to_height_ratio": number,
  "metabolic_age": number,
  "basal_metabolic_rate_kcal": number,
  "daily_calorie_estimate_kcal": number,
  "protein_target_g": number,
  "hydration_target_ml": number,
  "posture_score": number,
  "body_type": "ectomorph|mesomorph|endomorph|mixed",
  "fitness_level": "beginner|intermediate|advanced",
  "physique_notes": "what you observe about build/posture",
  "muscle_balance": "brief note on upper/lower/core balance from photo",
  "nutritional_advice": "2-3 sentences tailored to their goal",
  "goal_recommendations": ["actionable tip 1", "tip 2", "tip 3"]
}"""

BODY_VISION_SYSTEM = f"""You are a fitness assessor analyzing a full-body photo.
Estimate comprehensive body composition and metabolic stats from the image and user profile.
This is an AI estimate only — not medical advice. Do NOT output confidence scores.

Return ONLY valid JSON:
{BODY_STATS_SCHEMA}"""

BODY_REVIEW_SYSTEM = f"""You are a senior fitness assessor reconciling vision AI and profile-based text AI.
Cross-check photo observations with user profile data. Refine all stats conservatively and coherently.
Do NOT output confidence scores.

Return ONLY valid JSON:
{BODY_STATS_SCHEMA}"""


def _num(value, default=0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _merge_meal_estimates(vision: Dict, text: Dict) -> Dict:
    micro_keys = [
        "iron_mg", "calcium_mg", "vitamin_c_mg", "sodium_mg", "potassium_mg",
        "zinc_mg", "vitamin_a_mcg", "vitamin_d_mcg", "sugar_g", "saturated_fat_g",
    ]
    vision_micro = vision.get("micronutrients") or {}
    text_micro = text.get("micronutrients") or {}
    micronutrients = {
        key: round((_num(vision_micro.get(key)) + _num(text_micro.get(key))) / 2, 2)
        for key in micro_keys
    }

    return {
        "name": vision.get("name") or text.get("name", "Meal"),
        "description": vision.get("description") or text.get("description", ""),
        "calories": round((_num(vision.get("calories")) + _num(text.get("calories"))) / 2, 1),
        "protein_g": round((_num(vision.get("protein_g")) + _num(text.get("protein_g"))) / 2, 1),
        "carbs_g": round((_num(vision.get("carbs_g")) + _num(text.get("carbs_g"))) / 2, 1),
        "fat_g": round((_num(vision.get("fat_g")) + _num(text.get("fat_g"))) / 2, 1),
        "fiber_g": round((_num(vision.get("fiber_g")) + _num(text.get("fiber_g"))) / 2, 1),
        "notes": vision.get("notes") or text.get("notes", ""),
        "micronutrients": micronutrients,
        "micro_description": vision.get("micro_description") or text.get("micro_description", ""),
    }


BODY_NUMERIC_KEYS = [
    "estimated_bmi", "body_fat_pct", "muscle_mass_kg", "lean_mass_kg", "fat_mass_kg",
    "skeletal_muscle_pct", "visceral_fat_level", "waist_to_height_ratio", "metabolic_age",
    "basal_metabolic_rate_kcal", "daily_calorie_estimate_kcal", "protein_target_g",
    "hydration_target_ml", "posture_score",
]


def _avg_field(vision: Dict, text: Dict, key: str, text_key: Optional[str] = None) -> float:
    v = _num(vision.get(key))
    t = _num(text.get(text_key or key))
    if v and t:
        return round((v + t) / 2, 1)
    return v or t


def _merge_body_estimates(vision: Dict, text: Dict, user_context: Dict) -> Dict:
    weight = _num(user_context.get("weight_kg"), 70)
    text_muscle = _num(text.get("muscle_mass_kg"), weight * 0.4)
    vision_muscle = _num(vision.get("muscle_mass_kg"))
    muscle_mass = round((vision_muscle + text_muscle) / 2, 1) if vision_muscle and text_muscle else vision_muscle or text_muscle

    merged = {
        "estimated_bmi": _avg_field(vision, text, "estimated_bmi", "bmi"),
        "body_fat_pct": _avg_field(vision, text, "body_fat_pct"),
        "muscle_mass_kg": muscle_mass,
        "physique_notes": vision.get("physique_notes", ""),
        "muscle_balance": vision.get("muscle_balance", ""),
        "nutritional_advice": vision.get("nutritional_advice", ""),
        "goal_recommendations": vision.get("goal_recommendations") or [],
        "bmi_category": vision.get("bmi_category", ""),
        "body_type": vision.get("body_type", ""),
        "fitness_level": vision.get("fitness_level", ""),
    }

    for key in BODY_NUMERIC_KEYS:
        if key in merged:
            continue
        val = _num(vision.get(key))
        if val:
            merged[key] = val

    if not merged.get("lean_mass_kg") and weight and merged.get("body_fat_pct"):
        merged["lean_mass_kg"] = round(weight * (1 - merged["body_fat_pct"] / 100), 1)
    if not merged.get("fat_mass_kg") and weight and merged.get("body_fat_pct"):
        merged["fat_mass_kg"] = round(weight * merged["body_fat_pct"] / 100, 1)

    return merged


def _meal_review_pass(
    vision: Dict,
    text: Dict,
    current: Dict,
    pass_num: int,
    dietary_restrictions: str,
) -> Dict:
    user = json.dumps({
        "review_pass": pass_num,
        "total_passes": REVIEW_PASSES,
        "dietary_restrictions": dietary_restrictions or "none",
        "vision_analysis": vision,
        "text_analysis": text,
        "current_estimate": current,
        "instruction": (
            "Reconcile vision and text. Prefer conservative calorie and fat estimates "
            "for indulgent meals. Keep micronutrients internally consistent."
        ),
    })
    return _chat_json(MEAL_REVIEW_SYSTEM, user)


def _body_review_pass(
    vision: Dict,
    text: Dict,
    current: Dict,
    pass_num: int,
    user_context: Dict,
) -> Dict:
    user = json.dumps({
        "review_pass": pass_num,
        "total_passes": REVIEW_PASSES,
        "user_profile": user_context,
        "vision_analysis": vision,
        "text_analysis": text,
        "current_estimate": current,
        "instruction": (
            "Reconcile photo-based and profile-based estimates. "
            "Align BMI, body fat, and muscle mass into a coherent assessment."
        ),
    })
    return _chat_json(BODY_REVIEW_SYSTEM, user)


def analyze_meal_image_collaborative(
    image_bytes: bytes,
    dietary_restrictions: str = "",
    on_stage: Optional[Callable[[str, int, int], None]] = None,
) -> Dict:
    total_stages = 2 + REVIEW_PASSES + 1

    def stage(label: str, step: int) -> None:
        if on_stage:
            on_stage(label, step, total_stages)

    stage("Vision scan", 1)
    vision = _vision_json(
        MEAL_VISION_SYSTEM,
        f"Analyze this meal photo. Dietary restrictions: {dietary_restrictions or 'none'}",
        image_bytes,
    )

    stage("Text cross-check", 2)
    description = vision.get("description") or vision.get("name", "meal from photo")
    text = estimate_meal_from_text(description, dietary_restrictions)
    if text.get("is_ai"):
        text = {k: v for k, v in text.items() if k not in ("is_ai", "source")}

    current = _merge_meal_estimates(vision, text)

    for i in range(1, REVIEW_PASSES + 1):
        stage(f"Review pass {i}/{REVIEW_PASSES}", 2 + i)
        current = _meal_review_pass(vision, text, current, i, dietary_restrictions)

    stage("Finalizing", total_stages)
    result = _ai_result({
        **current,
        "review_passes": REVIEW_PASSES,
        "analysis_method": "groq_vision+text_collaborative",
        "vision_summary": vision.get("description", ""),
        "text_summary": text.get("description", ""),
    })
    return result


def analyze_body_image_collaborative(
    image_bytes: bytes,
    user_context: Dict,
    on_stage: Optional[Callable[[str, int, int], None]] = None,
) -> Dict:
    total_stages = 2 + REVIEW_PASSES + 1

    def stage(label: str, step: int) -> None:
        if on_stage:
            on_stage(label, step, total_stages)

    stage("Vision scan", 1)
    vision = _vision_json(
        BODY_VISION_SYSTEM,
        f"Analyze this full-body image. User profile: {json.dumps(user_context)}",
        image_bytes,
        max_tokens=1800,
    )

    stage("Text cross-check", 2)
    text = estimate_body_composition(
        age=int(user_context.get("age") or 30),
        weight_kg=_num(user_context.get("weight_kg"), 70),
        height_cm=user_context.get("height_cm"),
        gender=user_context.get("gender"),
        goal=user_context.get("goal") or "maintain",
    )

    current = _merge_body_estimates(vision, text, user_context)

    for i in range(1, REVIEW_PASSES + 1):
        stage(f"Review pass {i}/{REVIEW_PASSES}", 2 + i)
        current = _body_review_pass(vision, text, current, i, user_context)

    stage("Finalizing", total_stages)
    result = _ai_result({
        **current,
        "review_passes": REVIEW_PASSES,
        "analysis_method": "groq_vision+text_collaborative",
        "vision_summary": vision.get("physique_notes", ""),
        "text_summary": text.get("notes", ""),
    })
    return result