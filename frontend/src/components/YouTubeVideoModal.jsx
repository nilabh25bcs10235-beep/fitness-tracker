import { useEffect, useRef } from 'react';
import { normalizeVideoId, youtubeEmbedUrl } from '../lib/youtube';

export default function YouTubeVideoModal({ videoId, title, onClose }) {
  const id = normalizeVideoId(videoId);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!id) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [id, onClose]);

  if (!id) return null;

  const embedSrc = youtubeEmbedUrl(id, true);

  return (
    <div
      className="youtube-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="youtube-modal glass-card" role="dialog" aria-modal="true" aria-label={title || 'Video player'}>
        <div className="youtube-modal-header">
          {title && <h3 className="youtube-modal-title">{title}</h3>}
          <button
            ref={closeRef}
            type="button"
            className="youtube-modal-close btn-icon"
            onClick={onClose}
            aria-label="Close video"
          >
            ✕
          </button>
        </div>
        <div className="youtube-modal-player">
          <iframe
            title={title || 'YouTube video'}
            src={embedSrc}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}