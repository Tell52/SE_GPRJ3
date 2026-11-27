import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ApiError, apiFetch } from '../api';
import { errorMessage, formatTime } from '../events/model';
import type { RegistrationRecord } from './model';
import '../events/events.css';

function statusLabel(receipt: RegistrationRecord) {
  if (receipt.status === 'ACTIVE') return 'Active';
  return receipt.cancelledBy === 'ORGANIZER' ? 'Cancelled by organizer' : 'Cancelled by participant';
}

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
          <td><span className="role-badge">{statusLabel(r)}</span></td>
        </tr>)}</tbody>
      </table>}
  </section>;
}

export function RegistrationReceiptPage() {
  const { id } = useParams();
  return <RegistrationReceipt key={id} id={id!} />;
}

function RegistrationReceipt({ id }: { id: string }) {
  const location = useLocation();
  const [registration, setRegistration] = useState<RegistrationRecord | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [closed, setClosed] = useState(false);
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

  async function cancel() {
    if (!window.confirm('Cancel this registration and release your place?')) return;
    setCancelling(true);
    setError('');
    try {
      setRegistration(await apiFetch<RegistrationRecord>(`/api/registrations/${id}/cancel`, { method: 'POST' }));
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError && e.status === 409) {
        setClosed(true);
        try {
          setRegistration(await apiFetch<RegistrationRecord>(`/api/registrations/${id}`));
        } catch (refreshError) {
          setError(errorMessage(refreshError));
        }
      }
    } finally {
      setCancelling(false);
    }
  }

  const justRegistered = Boolean((location.state as { registered?: boolean } | null)?.registered);
  return <section className="events-page">
    <Link className="event-action" to="/registrations">Back to My registrations</Link>
    {loading && <p>Loading...</p>}
    {error && <p role="alert" className="alert">{error}</p>}
    {registration && <article className="event-card">
      {justRegistered && registration.status === 'ACTIVE' && <p role="status"><strong>You are registered</strong></p>}
      <h1>{registration.event.title}</h1>
      <dl className="receipt">
        <dt>Registration number</dt><dd>{registration.id}</dd>
        <dt>Status</dt><dd><span className="role-badge">{statusLabel(registration)}</span></dd>
        <dt>Registered</dt><dd>{formatTime(registration.registeredAt)} (Bangkok)</dd>
        <dt>Event start</dt><dd>{formatTime(registration.event.startsAt)} (Bangkok)</dd>
        <dt>Location</dt><dd>{registration.event.location}</dd>
      </dl>
      {registration.status === 'ACTIVE' && !closed && Date.now() < Date.parse(registration.event.startsAt) &&
        <button type="button" disabled={cancelling} onClick={cancel}>
          {cancelling ? 'Cancelling...' : 'Cancel registration'}
        </button>}
      <Link className="event-action" to={`/events/${registration.event.id}`}>View event</Link>
    </article>}
  </section>;
}
