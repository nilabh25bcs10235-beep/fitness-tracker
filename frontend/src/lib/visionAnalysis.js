import { api } from '../api';
import { isPuterAvailable, puterVisionJson } from './puterVision';

const REVIEW_PASSES = 10;
const TOTAL_STAGES = 12;

const MEAL_VISION_SYSTEM = `You are a strict nutrition vision expert for Indian and global meals.
Identify food items in the image and estimate nutrition realistically.
Do NOT output confidence scores.

Return ONLY valid JSON with name, description, calories, protein_g, carbs_g, fat_g, fiber_g,
notes, micronutrients object, and micro_description.`;

const BODY_VISION_SYSTEM = `You are a fitness assessor analyzing a full-body photo.
Estimate BMI, body composition, and nutritional goal advice.
Do NOT output confidence scores.

Return ONLY valid JSON with estimated_bmi, body_fat_pct, muscle_mass_kg, physique_notes,
nutritional_advice, and goal_recommendations array.`;

const STAGE_LABELS = [
  'Vision scan',
  'Text cross-check',
  ...Array.from({ length: REVIEW_PASSES }, (_, i) => `Review pass ${i + 1}/${REVIEW_PASSES}`),
  'Finalizing',
];

function runSimulatedProgress(onProgress, signal) {
  let stageIndex = 0;
  onProgress?.({ stageIndex, stageLabel: STAGE_LABELS[0], progress: 0 });

  const interval = setInterval(() => {
    if (signal?.aborted) {
      clearInterval(interval);
      return;
    }
    stageIndex = Math.min(stageIndex + 1, TOTAL_STAGES - 1);
    const progress = Math.round(((stageIndex + 1) / TOTAL_STAGES) * 100);
    onProgress?.({
      stageIndex,
      stageLabel: STAGE_LABELS[stageIndex] || 'Finalizing',
      progress,
    });
    if (stageIndex >= TOTAL_STAGES - 1) {
      clearInterval(interval);
    }
  }, 2800);

  return () => clearInterval(interval);
}

async function analyzeWithServerThenPuter({
  file,
  systemPrompt,
  userPrompt,
  serverAnalyze,
  onProgress,
  signal,
}) {
  const stopProgress = onProgress ? runSimulatedProgress(onProgress, signal) : null;

  try {
    const result = await serverAnalyze();
    onProgress?.({
      stageIndex: TOTAL_STAGES - 1,
      stageLabel: 'Finalized',
      progress: 100,
    });
    return result;
  } catch (err) {
    console.warn('Server vision unavailable, trying Puter fallback:', err);
  } finally {
    stopProgress?.();
  }

  if (isPuterAvailable()) {
    onProgress?.({ stageIndex: 0, stageLabel: 'Puter vision fallback', progress: 10 });
    const result = await puterVisionJson({ systemPrompt, userPrompt, file });
    onProgress?.({ stageIndex: TOTAL_STAGES - 1, stageLabel: 'Finalized', progress: 100 });
    return result;
  }

  throw new Error('Vision analysis unavailable. Check server API keys or network.');
}

export function analyzeMealImageVision(file, dietaryRestrictions = '', options = {}) {
  const userPrompt = `Analyze this meal photo. Dietary restrictions: ${dietaryRestrictions || 'none'}`;
  return analyzeWithServerThenPuter({
    file,
    systemPrompt: MEAL_VISION_SYSTEM,
    userPrompt,
    serverAnalyze: () => api.analyzeMealImage(file),
    onProgress: options.onProgress,
    signal: options.signal,
  });
}

export function analyzeBodyImageVision(file, userContext = {}, options = {}) {
  const userPrompt = `Analyze this full-body image. User profile: ${JSON.stringify(userContext)}`;
  return analyzeWithServerThenPuter({
    file,
    systemPrompt: BODY_VISION_SYSTEM,
    userPrompt,
    serverAnalyze: () => api.analyzeBodyImage(file),
    onProgress: options.onProgress,
    signal: options.signal,
  });
}