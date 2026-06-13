import { useState } from 'react';
import { normalizeVideoId, youtubeThumbnailUrl } from '../lib/youtube';

export default function YouTubeThumbnail({ videoId, title = 'Watch video', onClick, className = '' }) {
  const id = normalizeVideoId(videoId);
  const [quality, setQuality] = useState('maxresdefault');

  if (!id) return null;

  const src = youtubeThumbnailUrl(id, quality);

  const handleError = () => {
    if (quality !== 'hqdefault') setQuality('hqdefault');
  };

  return (
    <button
      type="button"
      className={`youtube-thumb ${className}`.trim()}
      onClick={() => onClick?.(id, title)}
      aria-label={`Play video: ${title}`}
    >
      <img
        src={src}
        alt=""
        className="youtube-thumb-img"
        loading="lazy"
        onError={handleError}
      />
      <span className="youtube-thumb-scrim" aria-hidden="true" />
      <span className="youtube-thumb-play" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span className="youtube-thumb-label">Watch demo</span>
    </button>
  );
}