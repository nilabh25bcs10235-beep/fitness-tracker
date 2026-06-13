import { useVitality } from '../../context/VitalityContext';

const LEVELS = ['low', 'medium', 'high', 'off'];

export default function VitalityIntensityControl() {
  const { intensity, setIntensity } = useVitality();

  const cycle = () => {
    const idx = LEVELS.indexOf(intensity);
    setIntensity(LEVELS[(idx + 1) % LEVELS.length]);
  };

  const label = intensity === 'off' ? 'Vitality off' : `Vitality ${intensity}`;

  return (
    <button
      type="button"
      className="vitality-toggle btn btn-ghost"
      onClick={cycle}
      title="Cycle background vitality intensity"
    >
      <span className="vitality-toggle-dot" data-level={intensity} />
      {label}
    </button>
  );
}