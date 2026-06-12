export default function StarfieldBackground() {
  return (
    <div className="starfield" aria-hidden="true">
      <div className="starfield-nebula" />
      <div className="starfield-grid" />
      {Array.from({ length: 48 }).map((_, i) => (
        <span
          key={i}
          className="star"
          style={{
            '--x': `${(i * 37) % 100}%`,
            '--y': `${(i * 53) % 100}%`,
            '--d': `${2 + (i % 4)}s`,
            '--delay': `${(i % 10) * 0.4}s`,
            '--size': `${1 + (i % 3)}px`,
          }}
        />
      ))}
    </div>
  );
}