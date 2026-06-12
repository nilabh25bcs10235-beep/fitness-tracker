import { useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { GoogleIcon, EmailIcon } from './icons';

export default function AuthScreen() {
  const [authMode, setAuthMode] = useState('login');
  const [emailView, setEmailView] = useState('hidden');
  const [email, setEmail] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSignup = authMode === 'signup';

  if (!supabaseConfigured) {
    return (
      <div className="auth-shell">
        <div className="auth-glass auth-card">
          <h2>FitTrack AI</h2>
          <p className="auth-subtitle">
            Cloud accounts are not configured. Add <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> to enable sign-in.
          </p>
        </div>
      </div>
    );
  }

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: isSignup ? 'consent' : 'select_account' },
        },
      });
      if (authError) throw authError;
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  const handleEmailLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: isSignup,
          emailRedirectTo: window.location.origin,
        },
      });
      if (authError) throw authError;
      setLinkSent(true);
    } catch (err) {
      setError(err.message || 'Email sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const resetEmail = () => {
    setEmailView('hidden');
    setLinkSent(false);
    setEmail('');
    setError('');
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    resetEmail();
  };

  return (
    <div className="auth-shell">
      <div className="auth-glass auth-card">
        <div className="auth-brand">
          <h1>FitTrack AI</h1>
          <p className="auth-tagline">
            {isSignup
              ? 'Create your profile and start tracking nutrition across the cosmos.'
              : 'Welcome back — sign in to continue your journey.'}
          </p>
        </div>

        <div className="auth-mode-toggle">
          <button
            type="button"
            className={authMode === 'login' ? 'active' : ''}
            onClick={() => switchMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={authMode === 'signup' ? 'active' : ''}
            onClick={() => switchMode('signup')}
          >
            Sign Up
          </button>
        </div>

        {error && <p className="auth-error">{error}</p>}

        {emailView === 'hidden' && (
          <div className="auth-providers">
            <button
              type="button"
              className="auth-provider-btn google"
              onClick={handleGoogle}
              disabled={loading}
            >
              <GoogleIcon />
              <span>SIGN IN WITH GOOGLE</span>
            </button>

            <button
              type="button"
              className="auth-provider-btn email"
              onClick={() => setEmailView('form')}
              disabled={loading}
            >
              <EmailIcon />
              <span>
                {isSignup ? 'SIGN IN WITH EMAIL' : 'SIGN IN WITH EMAIL'}
              </span>
            </button>

            {isSignup && (
              <p className="auth-footnote">
                First time here? Use email to receive a magic link and set up your profile.
              </p>
            )}
          </div>
        )}

        {emailView === 'form' && (
          <form onSubmit={handleEmailLink} className="auth-form">
            <button type="button" className="auth-back" onClick={resetEmail}>
              ← Back
            </button>
            <div className="form-group">
              <label>Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={linkSent}
              />
            </div>
            {linkSent ? (
              <p className="auth-hint auth-link-sent">
                A sign in link has been sent to your inbox. Click the link in the email to continue.
              </p>
            ) : (
              <button type="submit" className="btn btn-glow" disabled={loading}>
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}