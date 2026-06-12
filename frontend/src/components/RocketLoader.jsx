export default function RocketLoader({ active }) {
  if (!active) return null;
  return (
    <div className="rocket-loader" aria-hidden="true">
      <div className="rocket-ship">🚀</div>
      <div className="rocket-trail" />
      <p className="rocket-label">Launching...</p>
    </div>
  );
}