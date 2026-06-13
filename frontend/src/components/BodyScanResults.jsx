function MetricCard({ value, unit, label, accent, sublabel }) {
  return (
    <div className="body-metric-card" style={{ '--metric-accent': accent }}>
      <div className="body-metric-value">
        {value ?? '—'}
        {unit && value != null && <span>{unit}</span>}
      </div>
      <div className="body-metric-label">{label}</div>
      {sublabel && <div className="body-metric-sub">{sublabel}</div>}
    </div>
  );
}

function StatSection({ title, children }) {
  return (
    <div className="body-stats-section">
      <h4 className="body-stats-heading">{title}</h4>
      <div className="body-metric-grid body-metric-grid-wide">{children}</div>
    </div>
  );
}

function TagPill({ label, value }) {
  if (!value) return null;
  return (
    <span className="body-tag-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
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
          <span className="scan-badge">5-pass verified</span>
          <h3>Full body composition report</h3>
          {result.physique_notes && (
            <p className="scan-desc">{result.physique_notes}</p>
          )}
          <div className="body-tag-row">
            <TagPill label="BMI class" value={result.bmi_category} />
            <TagPill label="Body type" value={result.body_type} />
            <TagPill label="Fitness" value={result.fitness_level} />
          </div>
          {result.review_passes && (
            <p className="scan-meta">
              Vision + profile cross-check · {result.review_passes} reviews
            </p>
          )}
        </div>
      </div>

      <StatSection title="Composition">
        <MetricCard value={result.estimated_bmi} label="BMI" accent="#22d3ee" sublabel={result.bmi_category} />
        <MetricCard value={result.body_fat_pct} unit="%" label="Body fat" accent="#a855f7" />
        <MetricCard value={result.muscle_mass_kg} unit="kg" label="Muscle mass" accent="#34d399" />
        <MetricCard value={result.lean_mass_kg} unit="kg" label="Lean mass" accent="#60a5fa" />
        <MetricCard value={result.fat_mass_kg} unit="kg" label="Fat mass" accent="#f472b6" />
        <MetricCard value={result.skeletal_muscle_pct} unit="%" label="Skeletal muscle" accent="#4ade80" />
      </StatSection>

      <StatSection title="Metabolic & health markers">
        <MetricCard value={result.metabolic_age} unit="yrs" label="Metabolic age" accent="#fbbf24" />
        <MetricCard value={result.basal_metabolic_rate_kcal} unit="kcal" label="BMR" accent="#fb923c" />
        <MetricCard value={result.daily_calorie_estimate_kcal} unit="kcal" label="Daily calories" accent="#f97316" />
        <MetricCard value={result.visceral_fat_level} label="Visceral fat" accent="#ef4444" />
        <MetricCard value={result.waist_to_height_ratio} label="Waist/height" accent="#c084fc" />
        <MetricCard value={result.posture_score} unit="/100" label="Posture score" accent="#2dd4bf" />
      </StatSection>

      <StatSection title="Your targets">
        <MetricCard value={result.protein_target_g} unit="g" label="Protein target" accent="#22d3ee" />
        <MetricCard value={result.hydration_target_ml} unit="ml" label="Hydration" accent="#38bdf8" />
      </StatSection>

      {result.muscle_balance && (
        <div className="body-advice-card">
          <h4>Muscle balance</h4>
          <p>{result.muscle_balance}</p>
        </div>
      )}

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