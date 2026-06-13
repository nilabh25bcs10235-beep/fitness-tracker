export const VITALITY_QUOTES = {
  dashboard: [
    'Small daily improvements compound into staggering results.',
    'The body achieves what the mind believes.',
    'Progress is built one consistent day at a time.',
    'Your future self is shaped by what you do today.',
    'Long-term vision beats short-term comfort.',
    'You don\'t have to be great to start, but you have to start to be great.',
  ],
  meals: [
    'Discipline is choosing between what you want now and what you want most.',
    'Fuel the body with intention — every meal is a decision.',
    'Consistency at the table builds consistency everywhere else.',
    'Nourish progress, not just hunger.',
    'What you eat becomes the energy you bring to life.',
    'The body achieves what the mind believes.',
  ],
  workouts: [
    'Strength grows in the moments when you think you can\'t go on but you keep going anyway.',
    'The resistance you fight in the gym builds the strength you carry outside it.',
    'Push limits with patience — progress respects both.',
    'Every rep is a vote for the person you are becoming.',
    'Resilience is trained, not wished for.',
    'Discipline is choosing between what you want now and what you want most.',
  ],
  recipes: [
    'Plan today so discipline is easier tomorrow.',
    'Preparation is a quiet form of self-respect.',
    'Structure creates freedom in your nutrition.',
    'Good habits start in the kitchen and echo through the day.',
    'Small daily improvements compound into staggering results.',
  ],
  ai: [
    'You don\'t have to be great to start, but you have to start to be great.',
    'Growth begins where comfort ends.',
    'Clarity is a skill — sharpen it daily.',
    'Ask better questions, become a better athlete.',
    'Mindset is the engine; habits are the wheels.',
    'The body achieves what the mind believes.',
  ],
};

export const FOCUS_QUOTES = {
  dashboard: [
    'Show up today. Momentum follows.',
    'One honest entry moves the whole week forward.',
  ],
  meals: [
    'Name it clearly — awareness is the first macro.',
    'Fuel with purpose, not impulse.',
    'Consistency at the table builds consistency everywhere else.',
  ],
  workouts: [
    'Name the effort — what gets measured gets stronger.',
    'Push with intention. Recovery earns the growth.',
    'Strength grows in the moments you choose to continue.',
  ],
  recipes: [
    'A plan today protects discipline tomorrow.',
    'Structure is how freedom becomes sustainable.',
  ],
  ai: [
    'Ask honestly — clarity is a form of training.',
    'Growth begins where comfort ends.',
    'The right question can reset the whole week.',
  ],
};

export const SUCCESS_QUOTES = {
  meals: 'Logged with intention — momentum earned.',
  workouts: 'Effort recorded. Strength compounds quietly.',
  water: 'Hydration is discipline you can feel.',
  recipe: 'Plan saved — future you is already stronger.',
  default: 'Progress noted. Keep building.',
};

export const THEME_TO_CONTEXT = {
  food: 'meals',
  fire: 'workouts',
  workout: 'workouts',
  recipe: 'recipes',
  chat: 'ai',
  water: 'dashboard',
};

const POWER_WORDS = /\b(heavy|pr|personal record|consistent|discipline|strong|push|limit|protein|endurance|sprint|max|rep)\b/i;

export function detectPowerWords(text) {
  return POWER_WORDS.test(text || '');
}

export function pickQuote(pool, exclude = null) {
  const list = exclude ? pool.filter((q) => q !== exclude) : pool;
  if (!list.length) return pool[0] || '';
  return list[Math.floor(Math.random() * list.length)];
}