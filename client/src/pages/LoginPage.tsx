import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError, NETWORK_ERROR_MESSAGE, roleHome } from '../api';
import { useAuth } from '../auth/AuthContext';

type Errors = { email?: string; password?: string };

export function LoginPage() {
  const { status, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [alert, setAlert] = useState('');
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  if (status === 'loading') return <main className="page"><p>Loading...</p></main>;
  if (user) return <Navigate to={roleHome(user.role)} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAlert('');
    const next: Errors = {};
    if (!email.trim()) next.email = 'Email is required.';
    if (!password) next.password = 'Password is required.';
    setErrors(next);
    if (next.email) return emailRef.current?.focus();
    if (next.password) return passwordRef.current?.focus();

    setBusy(true);
    try {
      const signedIn = await login(email.trim(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : roleHome(signedIn.role), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VALIDATION_ERROR' && error.details.length) {
        const fieldErrors: Errors = {};
        for (const detail of error.details) {
          if (detail.field === 'email' || detail.field === 'password') fieldErrors[detail.field] = detail.message;
        }
        setErrors(fieldErrors);
        (fieldErrors.email ? emailRef : passwordRef).current?.focus();
      } else {
        setAlert(error instanceof ApiError ? error.message : NETWORK_ERROR_MESSAGE);
      }
      setBusy(false);
    }
  }

  return (
    <main className="page auth-page">
      <p className="eyebrow">University workshops</p>
      <h1>Log in to Event Planner</h1>
      <form className="form" onSubmit={handleSubmit} noValidate>
        {alert && <div className="alert" role="alert">{alert}</div>}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email" ref={emailRef} type="email" autoComplete="username" value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && <p className="field-error" id="email-error">{errors.email}</p>}
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password" ref={passwordRef} type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && <p className="field-error" id="password-error">{errors.password}</p>}
        </div>
        <button type="submit" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
      </form>
    </main>
  );
}
