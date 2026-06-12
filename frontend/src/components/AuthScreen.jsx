import { useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';

const MODES = [
  { id: 'google', label: 'Google' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
];

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('google');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!supabaseConfigured) {
    return (
      <div className="card auth-card">
        <h2>Sign in to FitTrack AI</h2>
        <p className="auth-subtitle">
          Cloud accounts are not configured yet. Add <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> to enable Google, email, and phone sign-in.
        </p>
      </div>
    );
  }

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const redirectTo = window.location.origin;
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (authError) throw authError;
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  const handleEmailOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!otpSent) {
        const { error: authError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: true },
        });
        if (authError) throw authError;
        setOtpSent(true);
      } else {
        const { error: authError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otp.trim(),
          type: 'email',
        });
        if (authError) throw authError;
        onAuthenticated?.();
      }
    } catch (err) {
      setError(err.message || 'Email sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const normalizedPhone = phone.trim().startsWith('+') ? phone.trim() : `+${phone.trim()}`;
      if (!otpSent) {
        const { error: authError } = await supabase.auth.signInWithOtp({
          phone: normalizedPhone,
          options: { shouldCreateUser: true },
        });
        if (authError) throw authError;
        setOtpSent(true);
      } else {
        const { error: authError } = await supabase.auth.verifyOtp({
          phone: normalizedPhone,
          token: otp.trim(),
          type: 'sms',
        });
        if (authError) throw authError;
        onAuthenticated?.();
      }
    } catch (err) {
      setError(err.message || 'Phone sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const resetOtp = (nextMode) => {
    setMode(nextMode);
    setOtpSent(false);
    setOtp('');
    setError('');
  };

  return (
    <div className="card auth-card">
      <h2>Sign in to FitTrack AI</h2>
      <p className="auth-subtitle">
        Your data is saved to your account in the cloud. Each login only sees your own profile.
      </p>

      <div className="auth-tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={mode === m.id ? 'active' : ''}
            onClick={() => resetOtp(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {error && <p className="auth-error">{error}</p>}

      {mode === 'google' && (
        <button type="button" className="btn btn-primary auth-provider-btn" onClick={handleGoogle} disabled={loading}>
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </button>
      )}

      {mode === 'email' && (
        <form onSubmit={handleEmailOtp} className="auth-form">
          <div className="form-group">
            <label>Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={otpSent}
            />
          </div>
          {otpSent && (
            <div className="form-group">
              <label>Verification code</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code from email"
                required
              />
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : otpSent ? 'Verify & Sign In' : 'Send Email Code'}
          </button>
        </form>
      )}

      {mode === 'phone' && (
        <form onSubmit={handlePhoneOtp} className="auth-form">
          <div className="form-group">
            <label>Phone number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              disabled={otpSent}
            />
          </div>
          {otpSent && (
            <div className="form-group">
              <label>SMS code</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit SMS code"
                required
              />
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : otpSent ? 'Verify & Sign In' : 'Send SMS Code'}
          </button>
        </form>
      )}
    </div>
  );
}