import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, apiFetch } from '../api';
import type { EventRecord } from '../events/model';
import { REGISTRATION_CLOSED_MESSAGE, registerErrorMessage, registrationClosed, type RegistrationRecord } from './model';

/** Register area on a participant's event detail (F-03). The API enforces every rule; this only reflects them. */
export function RegisterPanel({ event, onFull, onRefresh }: { event: EventRecord; onFull?: () => void; onRefresh?: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const remainingMs = Date.parse(event.effectiveCutoff) - Date.parse(event.serverTime);
  useEffect(() => {
    setExpired(false);
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) return;
    const end = performance.now() + remainingMs;
    let timer: ReturnType<typeof setTimeout>;
    function schedule() {
      const delay = end - performance.now();
      if (delay <= 0) setExpired(true);
      else timer = setTimeout(schedule, Math.min(delay, 2147483647));
    }
    schedule();
    return () => clearTimeout(timer);
  }, [event.id, event.serverTime, remainingMs]);

  if (event.myRegistration) {
    return <div className="register-panel">
      {error && <p role="alert" className="alert">{error}</p>}
      <p role="status"><strong>You are registered</strong></p>
      <Link className="event-action" to={`/registrations/${event.myRegistration.id}`}>View registration</Link>
    </div>;
  }

  async function register() {
    setBusy(true);
    setError('');
    try {
      const registration = await apiFetch<RegistrationRecord>(`/api/events/${event.id}/registrations`, { method: 'POST' });
      navigate(`/registrations/${registration.id}`, { state: { registered: true } });
    } catch (e) {
      setError(registerErrorMessage(e));
      if (e instanceof ApiError && e.code === 'EVENT_FULL') onFull?.();
      if (e instanceof ApiError && e.code === 'REGISTRATION_CLOSED') setExpired(true);
      // Registered in another tab: reload so the page shows the registration instead of a Register button.
      if (e instanceof ApiError && e.code === 'ALREADY_REGISTERED') onRefresh?.();
      setBusy(false);
    }
  }

  if (expired || (Number.isFinite(remainingMs) ? remainingMs <= 0 : registrationClosed(event.startsAt))) {
    return <div className="register-panel"><p role="status">{REGISTRATION_CLOSED_MESSAGE}</p></div>;
  }

  return <div className="register-panel">
    {error && <p role="alert" className="alert">{error}</p>}
    {event.remainingPlaces > 0 && <button type="button" onClick={register} disabled={busy}>{busy ? 'Registering...' : 'Register'}</button>}
  </div>;
}
