function MetricCard({ value, unit, label, accent }) {
  return (
    <div className="body-metric-card" style={{ '--metric-accent': accent }}>
      <div className="body-metric-value">
        {value ?? '—'}
        {unit && value != null && <span>{unit}</span>}
      </div>
      <div className="body-metric-label">{label}</div>
    </div>
  );
}

export default function BodyScanResults({ result, previewUrl }) {
  if (!result) return null;

  const hasError = !result.estimated_bmi && result.nutritional_advice && !result.physique_notes;

  if (hasError) {
    return (
      <div className="scan-results body-scan-results">
        <p className="error">{result.nutritional_advice}</p>
      </div>
    );
  }

  return (
    <div className="scan-results body-scan-results">
      <div className="scan-results-hero">
        {previewUrl && (
          <div className="scan-preview-frame body-preview">
            <img src={previewUrl} alt="Body scan" />
          </div>
        )}
        <div className="scan-results-summary">
          <span className="scan-badge">10-pass verified</span>
          <h3>Body composition estimate</h3>
          {result.physique_notes && (
            <p className="scan-desc">{result.physique_notes}</p>
          )}
          {result.review_passes && (
            <p className="scan-meta">
              Vision + profile cross-check · {result.review_passes} reviews
            </p>
          )}
        </div>
      </div>

      <div className="body-metric-grid">
        <MetricCard value={result.estimated_bmi} label="Est. BMI" accent="#22d3ee" />
        <MetricCard value={result.body_fat_pct} unit="%" label="Body fat" accent="#a855f7" />
        <MetricCard value={result.muscle_mass_kg} unit="kg" label="Muscle mass" accent="#34d399" />
      </div>

      {result.nutritional_advice && (
        <div className="body-advice-card">
          <h4>Nutrition advice</h4>
          <p>{result.nutritional_advice}</p>
        </div>
      )}

      {result.goal_recommendations?.length > 0 && (
        <div className="body-tips-card">
          <h4>Goal recommendations</h4>
          <ul>
            {result.goal_recommendations.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="scan-disclaimer">AI estimate only — not a medical measurement.</p>
    </div>
  );
}