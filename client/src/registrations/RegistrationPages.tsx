import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ApiError, apiFetch } from '../api';
import { errorMessage, formatTime } from '../events/model';
import type { RegistrationRecord } from './model';
import '../events/events.css';

export function MyRegistrationsPage() {
  const [items, setItems] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    apiFetch<{ items: RegistrationRecord[] }>('/api/registrations/mine')
      .then((data) => { if (active) setItems(data.items); })
      .catch((e) => { if (active) setError(errorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <section className="events-page">
    <h1>My registrations</h1>
    {loading ? <p>Loading...</p> : error ? <p role="alert" className="alert">{error}</p> : items.length === 0
      ? <p>You have not registered for any events</p>
      : <table className="event-table">
        <thead><tr><th>Event</th><th>Start (Bangkok)</th><th>Location</th><th>Status</th></tr></thead>
        <tbody>{items.map((r) => <tr key={r.id}>
          <td><Link to={`/registrations/${r.id}`}>{r.event.title}</Link></td>
          <td>{formatTime(r.event.startsAt)}</td><td>{r.event.location}</td>
          <td><span className="role-badge">{r.status === 'ACTIVE' ? 'Active' : r.status}</span></td>
        </tr>)}</tbody>
      </table>}
  </section>;
}

export function RegistrationReceiptPage() {
  const { id } = useParams();
  const location = useLocation();
  const [registration, setRegistration] = useState<RegistrationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setRegistration(null);
    apiFetch<RegistrationRecord>(`/api/registrations/${id}`)
      .then((data) => { if (active) setRegistration(data); })
      .catch((e) => { if (active) setError(e instanceof ApiError && e.status === 404 ? 'Registration not found' : errorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const justRegistered = Boolean((location.state as { registered?: boolean } | null)?.registered);
  return <section className="events-page">
    <Link className="event-action" to="/registrations">Back to My registrations</Link>
    {loading && <p>Loading...</p>}
    {error && <p role="alert" className="alert">{error}</p>}
    {registration && <article className="event-card">
      {justRegistered && <p role="status"><strong>You are registered</strong></p>}
      <h1>{registration.event.title}</h1>
      <dl className="receipt">
        <dt>Registration number</dt><dd>{registration.id}</dd>
        <dt>Status</dt><dd><span className="role-badge">{registration.status === 'ACTIVE' ? 'Active' : registration.status}</span></dd>
        <dt>Registered</dt><dd>{formatTime(registration.registeredAt)} (Bangkok)</dd>
        <dt>Event start</dt><dd>{formatTime(registration.event.startsAt)} (Bangkok)</dd>
        <dt>Location</dt><dd>{registration.event.location}</dd>
      </dl>
      <Link className="event-action" to={`/events/${registration.event.id}`}>View event</Link>
    </article>}
  </section>;
}
