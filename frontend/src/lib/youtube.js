const ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const URL_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

export function normalizeVideoId(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (ID_RE.test(text)) return text;
  for (const pattern of URL_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function youtubeThumbnailUrl(videoId, quality = 'maxresdefault') {
  const id = normalizeVideoId(videoId);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`;
}

export function youtubeEmbedUrl(videoId, autoplay = true) {
  const id = normalizeVideoId(videoId);
  if (!id) return null;
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    rel: '0',
    modestbranding: '1',
  });
  return `https://www.youtube.com/embed/${id}?${params}`;
}