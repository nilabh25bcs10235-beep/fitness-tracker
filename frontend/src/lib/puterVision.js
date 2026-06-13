const PUTER_VISION_MODELS = [
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'openai/gpt-5.4-nano',
];

const PUTER_LOAD_TIMEOUT_MS = 10_000;

export function isPuterAvailable() {
  return typeof window !== 'undefined' && Boolean(window.puter?.ai?.chat);
}

export function waitForPuter(timeoutMs = PUTER_LOAD_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    if (isPuterAvailable()) {
      resolve(window.puter);
      return;
    }

    const started = Date.now();
    const timer = setInterval(() => {
      if (isPuterAvailable()) {
        clearInterval(timer);
        resolve(window.puter);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        clearInterval(timer);
        reject(new Error('Puter.js did not load. Check your network connection.'));
      }
    }, 50);
  });
}

export function extractPuterText(response) {
  if (!response) return '';
  if (typeof response === 'string') return response;

  const msg = response.message ?? response;
  const content = msg?.content ?? response?.text ?? response?.content;

  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text ?? ''))
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

export function parseJsonFromModelText(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) throw new Error('Empty AI response');

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : trimmed).trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error('AI response was not valid JSON');
  }
}

export async function puterVisionJson({
  systemPrompt,
  userPrompt,
  file,
  models = PUTER_VISION_MODELS,
}) {
  const puter = await waitForPuter();
  const prompt = `${systemPrompt.trim()}\n\n${userPrompt.trim()}\n\nReturn ONLY valid JSON. No markdown fences.`;

  let lastError = null;
  for (const model of models) {
    try {
      const response = await puter.ai.chat(prompt, file, {
        model,
        temperature: 0.25,
      });
      const text = extractPuterText(response);
      const data = parseJsonFromModelText(text);
      return { ...data, source: 'puter', is_ai: true };
    } catch (err) {
      lastError = err;
      console.warn(`Puter vision failed (${model}):`, err);
    }
  }

  throw lastError || new Error('Puter vision analysis failed');
}