import { useEffect, useState } from 'react';
import { api } from '../api';
import ReactiveField from './reactive/ReactiveField';

const SUGGESTED_QUERIES = [
  'gym workout playlist',
  'HIIT workout music',
  'lifting motivation playlist',
  'cardio running playlist',
  'yoga flow playlist',
];

export default function WorkoutMusic() {
  const [query, setQuery] = useState('gym workout playlist');
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);

  const search = async (term) => {
    const q = term.trim();
    if (!q) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.searchWorkoutPlaylists(q);
      setPlaylists(res.items || []);
      setUnavailable(false);
    } catch (e) {
      setPlaylists([]);
      if (e.status === 503) {
        setUnavailable(true);
        setError('');
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search('gym workout playlist');
  }, []);

  if (unavailable) {
    return (
      <div className="card card-lively workout-music-card">
        <h2>Workout Music</h2>
        <p className="muted-note">YouTube playlists will appear here once YT_KEY is configured on the server.</p>
      </div>
    );
  }

  return (
    <div className="card card-lively workout-music-card">
      <h2>Workout Music</h2>
      <p className="muted-note">
        Browse workout playlists and open them in YouTube Music for background play.
      </p>

      <div className="chip-row workout-music-chips">
        {SUGGESTED_QUERIES.map((term) => (
          <button
            key={term}
            type="button"
            className={`chip ${query === term ? 'chip-active' : ''}`}
            onClick={() => {
              setQuery(term);
              search(term);
            }}
          >
            {term.replace(' playlist', '').replace(' music', '')}
          </button>
        ))}
      </div>

      <form
        className="workout-music-search"
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
      >
        <ReactiveField
          theme="workout"
          label="Search playlists"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. gym workout playlist"
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="workout-music-grid">
        {playlists.map((pl) => (
          <div key={pl.id} className="workout-music-item glass-card">
            <div className="workout-music-thumb-wrap">
              {pl.thumbnail_url ? (
                <img src={pl.thumbnail_url} alt="" className="workout-music-thumb" loading="lazy" />
              ) : (
                <div className="workout-music-thumb workout-music-thumb-fallback" />
              )}
              <span className="workout-music-thumb-badge">Playlist</span>
            </div>
            <div className="workout-music-meta">
              <h4>{pl.title}</h4>
              {pl.channel && <p className="muted-note">{pl.channel}</p>}
              <button
                type="button"
                className="btn btn-glow btn-sm"
                onClick={() => window.open(`https://music.youtube.com/playlist?list=${pl.id}`, '_blank', 'noopener,noreferrer')}
              >
                Play in YouTube Music
              </button>
            </div>
          </div>
        ))}
      </div>

      {!loading && playlists.length === 0 && !error && (
        <p className="muted-note">No playlists found. Try another search.</p>
      )}
    </div>
  );
}