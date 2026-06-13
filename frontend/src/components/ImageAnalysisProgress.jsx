const REVIEW_PASSES = 5;

const STAGES = [
  { key: 'vision', label: 'Vision scan', icon: '👁' },
  { key: 'text', label: 'Text cross-check', icon: '📝' },
  ...Array.from({ length: REVIEW_PASSES }, (_, i) => ({
    key: `review-${i + 1}`,
    label: `Review ${i + 1}`,
    icon: '🔍',
  })),
  { key: 'done', label: 'Finalized', icon: '✓' },
];

export default function ImageAnalysisProgress({ stageIndex = 0, stageLabel = '', active = false }) {
  if (!active) return null;

  const progress = Math.min(100, Math.round(((stageIndex + 1) / STAGES.length) * 100));

  return (
    <div className="scan-progress-panel" role="status" aria-live="polite">
      <div className="scan-progress-header">
        <div className="scan-progress-ring" style={{ '--progress': `${progress}%` }}>
          <span>{progress}%</span>
        </div>
        <div>
          <p className="scan-progress-title">AI deep analysis</p>
          <p className="scan-progress-stage">{stageLabel || STAGES[stageIndex]?.label || 'Working...'}</p>
          <p className="scan-progress-sub">
            Groq vision + Groq text · {REVIEW_PASSES} review passes
          </p>
        </div>
      </div>
      <div className="scan-pipeline">
        {STAGES.map((stage, i) => {
          const state = i < stageIndex ? 'done' : i === stageIndex ? 'active' : 'pending';
          return (
            <div key={stage.key} className={`scan-pipeline-step scan-pipeline-${state}`}>
              <span className="scan-pipeline-icon">{stage.icon}</span>
              <span className="scan-pipeline-label">{stage.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}