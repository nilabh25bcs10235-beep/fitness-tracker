import { api } from '../api';
import { isPuterAvailable, puterVisionJson } from './puterVision';

const MEAL_VISION_SYSTEM = `You are a strict nutrition vision expert for Indian and global meals.
Identify food items in the image and estimate nutrition realistically.

Be conservative for burgers, waffles, fried foods, fast food, desserts, and oily restaurant meals.
These are typically calorie-dense with high sugar, saturated fat, and sodium and poor protein density.
Do NOT underestimate sugar_g or saturated_fat_g. High calories with low protein is rarely "good".

Return ONLY valid JSON:
{
  "name": "meal name",
  "description": "what you see",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "confidence": "high|medium|low",
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
}`;

const BODY_VISION_SYSTEM = `You are a fitness assessor analyzing a full-body photo.
Estimate BMI range, body composition, and give nutritional goal advice.
This is an AI estimate only — not medical advice. Return ONLY valid JSON:
{
  "estimated_bmi": number,
  "body_fat_pct": number,
  "muscle_mass_kg": number,
  "physique_notes": "what you observe about build/posture",
  "nutritional_advice": "2-3 sentences tailored to their goal",
  "goal_recommendations": ["actionable tip 1", "tip 2", "tip 3"],
  "confidence": "high|medium|low"
}`;

async function analyzeWithPuterThenServer({
  file,
  systemPrompt,
  userPrompt,
  serverFallback,
}) {
  if (isPuterAvailable()) {
    try {
      return await puterVisionJson({ systemPrompt, userPrompt, file });
    } catch (err) {
      console.warn('Puter vision unavailable, using server fallback:', err);
    }
  }

  return serverFallback();
}

export function analyzeMealImageVision(file, dietaryRestrictions = '') {
  const userPrompt = `Analyze this meal photo. Dietary restrictions: ${dietaryRestrictions || 'none'}`;
  return analyzeWithPuterThenServer({
    file,
    systemPrompt: MEAL_VISION_SYSTEM,
    userPrompt,
    serverFallback: () => api.analyzeMealImage(file),
  });
}

export function analyzeBodyImageVision(file, userContext = {}) {
  const userPrompt = `Analyze this full-body image. User profile: ${JSON.stringify(userContext)}`;
  return analyzeWithPuterThenServer({
    file,
    systemPrompt: BODY_VISION_SYSTEM,
    userPrompt,
    serverFallback: () => api.analyzeBodyImage(file),
  });
}