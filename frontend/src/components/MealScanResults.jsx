const MICRO_LABELS = {
  iron_mg: 'Iron',
  calcium_mg: 'Calcium',
  vitamin_c_mg: 'Vitamin C',
  sodium_mg: 'Sodium',
  potassium_mg: 'Potassium',
  zinc_mg: 'Zinc',
  vitamin_a_mcg: 'Vitamin A',
  vitamin_d_mcg: 'Vitamin D',
  sugar_g: 'Sugar',
  saturated_fat_g: 'Sat. fat',
};

function MacroRing({ label, value, unit, color, max }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="macro-ring" style={{ '--ring-color': color, '--ring-pct': `${pct}%` }}>
      <div className="macro-ring-inner">
        <strong>{Math.round(value)}</strong>
        <span>{unit}</span>
      </div>
      <p>{label}</p>
    </div>
  );
}

export default function MealScanResults({ analysis, previewUrl }) {
  if (!analysis) return null;

  const micros = analysis.micronutrients || {};
  const macroTotal = analysis.protein_g + analysis.carbs_g + analysis.fat_g || 1;

  return (
    <div className="scan-results meal-scan-results">
      <div className="scan-results-hero">
        {previewUrl && (
          <div className="scan-preview-frame">
            <img src={previewUrl} alt="Uploaded meal" />
          </div>
        )}
        <div className="scan-results-summary">
          <span className="scan-badge">5-pass verified</span>
          <h3>{analysis.name}</h3>
          <p className="scan-desc">{analysis.description}</p>
          {analysis.notes && <p className="scan-notes">{analysis.notes}</p>}
          {analysis.review_passes && (
            <p className="scan-meta">
              Vision + text collaborative analysis · {analysis.review_passes} reviews
            </p>
          )}
        </div>
      </div>

      <div className="scan-calorie-banner">
        <span className="scan-calorie-value">{Math.round(analysis.calories)}</span>
        <span className="scan-calorie-label">kcal estimated</span>
      </div>

      <div className="macro-ring-grid">
        <MacroRing label="Protein" value={analysis.protein_g} unit="g" color="#22d3ee" max={macroTotal} />
        <MacroRing label="Carbs" value={analysis.carbs_g} unit="g" color="#a855f7" max={macroTotal} />
        <MacroRing label="Fat" value={analysis.fat_g} unit="g" color="#fbbf24" max={macroTotal} />
        <MacroRing label="Fibre" value={analysis.fiber_g} unit="g" color="#34d399" max={30} />
      </div>

      {(analysis.micro_description || Object.keys(micros).length > 0) && (
        <details className="scan-micro-panel" open>
          <summary>Micronutrients</summary>
          {analysis.micro_description && (
            <p className="micro-desc">{analysis.micro_description}</p>
          )}
          {Object.keys(micros).length > 0 && (
            <div className="scan-micro-grid">
              {Object.entries(micros).map(([key, val]) => (
                <div key={key} className="scan-micro-item">
                  <span>{MICRO_LABELS[key] || key}</span>
                  <strong>{typeof val === 'number' ? Math.round(val * 10) / 10 : val}</strong>
                </div>
              ))}
            </div>
          )}
        </details>
      )}
    </div>
  );
}