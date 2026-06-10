"""
Groq LLM wrapper for FitTrack AI.
All nutrition knowledge comes from Groq — no hardcoded fitness database.
"""

import os
import json
import base64
from typing import Dict, Optional
from openai import OpenAI

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
TEXT_MODEL = os.environ.get("GROQ_TEXT_MODEL", "llama-3.3-70b-versatile")
VISION_MODEL = os.environ.get("GROQ_VISION_MODEL", "llama-3.2-90b-vision-preview")

client = None
if GROQ_API_KEY:
    client = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")


class AIError(Exception):
    pass


def _ai_available() -> bool:
    return client is not None


def _require_ai():
    if not _ai_available():
        raise AIError("GROQ_API_KEY not configured. Add it to backend/.env")


def _chat_json(system: str, user: str, model: str = TEXT_MODEL) -> Dict:
    _require_ai()
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.4,
            max_tokens=1500,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except AIError:
        raise
    except Exception as e:
        raise AIError(f"Groq API error: {e}") from e


def calculate_targets(
    age: int,
    weight_kg: float,
    height_cm: Optional[float],
    goal: str,
    gender: Optional[str] = None,
    dietary_restrictions: str = "",
) -> Dict:
    system = """You are a sports nutritionist. Compute personalized daily macro targets from the user profile.
Return ONLY valid JSON:
{
  "daily_calorie_target": number,
  "daily_protein_target": number,
  "daily_carbs_target": number,
  "daily_fat_target": number,
  "reasoning": "one sentence explaining the targets"
}"""
    user = json.dumps({
        "age": age,
        "weight_kg": weight_kg,
        "height_cm": height_cm,
        "gender": gender,
        "goal": goal,
        "dietary_restrictions": dietary_restrictions,
    })
    result = _chat_json(system, user)
    return {
        "daily_calorie_target": int(result["daily_calorie_target"]),
        "daily_protein_target": int(result["daily_protein_target"]),
        "daily_carbs_target": int(result.get("daily_carbs_target", 0)),
        "daily_fat_target": int(result.get("daily_fat_target", 0)),
        "reasoning": result.get("reasoning", ""),
    }


def estimate_body_composition(
    age: int,
    weight_kg: float,
    height_cm: Optional[float],
    gender: Optional[str],
    goal: str,
) -> Dict:
    system = """You are a fitness assessor. Estimate body composition from profile data only.
Return ONLY valid JSON:
{
  "body_fat_pct": number,
  "muscle_mass_kg": number,
  "bmi": number,
  "notes": "brief caveat that this is an AI estimate, not a measurement"
}"""
    user = json.dumps({
        "age": age,
        "weight_kg": weight_kg,
        "height_cm": height_cm,
        "gender": gender,
        "goal": goal,
    })
    return _chat_json(system, user)


def estimate_meal_from_text(description: str, dietary_restrictions: str = "") -> Dict:
    system = """You are a nutrition expert specializing in Indian cuisine.
Estimate calories and macros for the described meal. Return ONLY valid JSON:
{
  "name": "short meal name",
  "description": "brief description",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "confidence": "high|medium|low",
  "notes": "brief nutrition note"
}"""
    user = f"Meal: {description}\nDietary restrictions: {dietary_restrictions or 'none'}"
    result = _chat_json(system, user)
    result["is_ai"] = True
    result["source"] = "groq"
    return result


def analyze_meal_image(image_bytes: bytes, dietary_restrictions: str = "") -> Dict:
    _require_ai()
    try:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        response = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": """You are a nutrition vision expert for Indian meals.
Identify food items in the image and estimate nutrition. Return ONLY valid JSON:
{
  "name": "meal name",
  "description": "what you see",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "confidence": "high|medium|low",
  "notes": "brief note"
}""",
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"Analyze this meal photo. Dietary restrictions: {dietary_restrictions or 'none'}",
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                        },
                    ],
                },
            ],
            temperature=0.3,
            max_tokens=1000,
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
        result["is_ai"] = True
        result["source"] = "groq"
        return result
    except AIError:
        raise
    except Exception as e:
        raise AIError(f"Vision analysis failed: {e}") from e


def generate_recipes(
    goal: str,
    dietary_restrictions: str,
    calorie_target: int,
    count: int = 3,
) -> Dict:
    system = """You are an Indian cuisine nutrition chef.
Create recipes matching the user's goal and restrictions.
Return ONLY valid JSON:
{
  "recipes": [
    {
      "name": "recipe name",
      "description": "one line",
      "calories": number,
      "protein_g": number,
      "prep_time_min": number,
      "ingredients": ["item with qty"],
      "instructions": ["step"],
      "tags": ["tag"]
    }
  ],
  "grocery_list": ["consolidated items"],
  "ai_notes": "brief tip"
}"""
    user = (
        f"Goal: {goal}\nRestrictions: {dietary_restrictions or 'none'}\n"
        f"Daily calorie target: {calorie_target}\nGenerate {count} unique recipes."
    )
    return _chat_json(system, user)


def get_smart_insight(
    query: str,
    user_context: Dict,
    today_macros: Dict,
) -> Dict:
    system = """You are FitTrack AI, a friendly fitness and nutrition coach.
Give practical, specific advice tailored to the user's profile and today's intake.
Return ONLY valid JSON:
{
  "answer": "2-4 sentence helpful answer",
  "suggestions": ["actionable tip 1", "tip 2", "tip 3"]
}"""
    user = (
        f"User question: {query}\n"
        f"Profile: {json.dumps(user_context)}\n"
        f"Today's intake: {json.dumps(today_macros)}"
    )
    result = _chat_json(system, user)
    result["is_ai"] = True
    result["source"] = "groq"
    return result