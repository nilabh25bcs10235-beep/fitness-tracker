export const HEALTH_LABELS = {
  excellent: 'Excellent',
  very_good: 'Very Good',
  good: 'Good',
  could_be_better: 'Could Be Better',
  unhealthy: 'Unhealthy',
};

export function healthScoreClass(score) {
  return score ? `health-score health-${score}` : '';
}