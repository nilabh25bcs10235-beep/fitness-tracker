export const VITALITY_QUOTES = {
  dashboard: [
    'Small daily improvements compound into staggering results.',
    'The body achieves what the mind believes.',
    'Progress is built one consistent day at a time.',
    'Your future self is shaped by what you do today.',
    'Long-term vision beats short-term comfort.',
  ],
  meals: [
    'Discipline is choosing between what you want now and what you want most.',
    'Fuel the body with intention — every meal is a decision.',
    'Consistency at the table builds consistency everywhere else.',
    'Nourish progress, not just hunger.',
    'What you eat becomes the energy you bring to life.',
  ],
  workouts: [
    'Strength grows in the moments when you think you can\'t go on but you keep going anyway.',
    'The resistance you fight in the gym builds the strength you carry outside it.',
    'Push limits with patience — progress respects both.',
    'Every rep is a vote for the person you are becoming.',
    'Resilience is trained, not wished for.',
  ],
  recipes: [
    'Plan today so discipline is easier tomorrow.',
    'Preparation is a quiet form of self-respect.',
    'Structure creates freedom in your nutrition.',
    'Good habits start in the kitchen and echo through the day.',
  ],
  ai: [
    'Growth begins where comfort ends.',
    'Clarity is a skill — sharpen it daily.',
    'Ask better questions, become a better athlete.',
    'Mindset is the engine; habits are the wheels.',
    'You don\'t have to be great to start, but you have to start to be great.',
  ],
};

export const SUCCESS_QUOTES = {
  meals: 'Logged with intention — momentum earned.',
  workouts: 'Effort recorded. Strength compounds.',
  water: 'Hydration is quiet discipline in action.',
  recipe: 'Plan saved — future you will thank you.',
  default: 'Progress noted. Keep building.',
};

const POWER_WORDS = /\b(heavy|pr|personal record|consistent|discipline|strong|push|limit|protein|endurance|sprint|max|rep)\b/i;

export function detectPowerWords(text) {
  return POWER_WORDS.test(text || '');
}