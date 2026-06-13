import { useDisplay } from '../../context/DisplayContext';

const LABELS = {
  soft: 'Soft',
  normal: 'Normal',
  bright: 'Bright',
  vivid: 'Vivid',
};

export default function ScreenBrightnessControl() {
  const { brightness, cycleBrightness } = useDisplay();

  return (
    <button
      type="button"
      className="display-toggle btn btn-ghost"
      onClick={cycleBrightness}
      title="Cycle screen brightness"
    >
      <span className="display-toggle-icon" data-level={brightness} aria-hidden="true">
        {brightness === 'soft' ? '◐' : brightness === 'bright' ? '◑' : brightness === 'vivid' ? '☀' : '◯'}
      </span>
      Brightness {LABELS[brightness] || 'Normal'}
    </button>
  );
}