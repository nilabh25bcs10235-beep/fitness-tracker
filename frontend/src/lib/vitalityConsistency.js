/**
 * Detect low weekly consistency → calmer, slower energy flow (gentle accountability).
 */
export function computeCalmMode(tracker) {
  if (!tracker?.days?.length) return false;

  const today = tracker.today;
  const past = tracker.days.filter((d) => !d.is_today);
  const recent = past.slice(-3);

  const todayLow = (today?.overall_progress_pct ?? 100) < 32;
  const recentLowCount = recent.filter((d) => d.overall_progress_pct < 42).length;
  const weekAvg =
    tracker.days.reduce((s, d) => s + (d.overall_progress_pct || 0), 0) /
    tracker.days.length;

  return weekAvg < 38 || recentLowCount >= 2 || (todayLow && recentLowCount >= 1);
}

export function cardRectFromElement(el) {
  if (!el?.closest) return null;
  const card = el.closest('.card, .glass-card, .panel-box');
  return card?.getBoundingClientRect() || null;
}