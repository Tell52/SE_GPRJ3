import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ApiError, apiFetch } from '../api';
import { useAuth } from '../auth/AuthContext';
import { errorMessage, formatTime, type EventRecord } from './model';
import './events.css';

export function EventsPage({ mine = false }: { mine?: boolean }) {
  const [items, setItems] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setItems([]); setError('');
    apiFetch<{ items: EventRecord[] }>(mine ? '/api/events/mine' : '/api/events')
      .then((data) => { if (active) setItems(data.items); })
      .catch((e) => { if (active) setError(errorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mine]);
  return <section className="events-page">
    <h1>{mine ? 'My events' : 'Events'}</h1>
    {mine && <Link className="event-action" to="/organizer/events/new">Create event</Link>}
    {loading ? <p>Loading...</p> : error ? <p role="alert" className="alert">{error}</p> : items.length === 0 ?
      <p>{mine ? 'You have not created any events yet' : 'No upcoming events'}</p> : mine ?
      <table className="event-table"><thead><tr><th>Title</th><th>Start (Bangkok)</th><th>Status</th><th>Registered / capacity</th></tr></thead>
        <tbody>{items.map((event) => <tr key={event.id}>
          <td><Link to={`/organizer/events/${event.id}`}>{event.title}</Link></td><td>{formatTime(event.startsAt)}</td>
          <td><Status event={event} /></td><td>{event.activeCount} / {event.capacity}</td>
        </tr>)}</tbody></table> :
      <div className="event-grid">{items.map((event) => <article className="event-card" key={event.id}>
        <h2><Link to={`/events/${event.id}`}>{event.title}</Link></h2>
        <p>{formatTime(event.startsAt)} (Bangkok)</p><p>{event.location}</p><Places event={event} />
      </article>)}</div>}
  </section>;
}

function Status({ event }: { event: EventRecord }) { return <span className="role-badge">{event.status === 'DRAFT' ? 'Draft' : 'Published'}</span>; }
function Places({ event }: { event: EventRecord }) { return <p>{event.remainingPlaces > 0 ? `${event.remainingPlaces} places left` : 'Full'}</p>; }

export function EventDetailPage({ organizer = false }: { organizer?: boolean }) {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [success, setSuccess] = useState('');
  useEffect(() => {
    let active = true;
    setEvent(null); setLoading(true); setError(''); setConfirm(false); setBusy(false);
    setSuccess(location.state?.saved ? 'Event saved as draft' : '');
    apiFetch<EventRecord>(`/api/events/${id}`).then((data) => {
      if (!active) return;
      if (organizer && data.organizer.id !== user?.id) setError('Event not found');
      else setEvent(data);
    }).catch((e) => { if (active) setError(e instanceof ApiError && e.status === 404 ? 'Event not found' : errorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, organizer, user?.id, location.key]);

  async function publish() {
    setBusy(true); setError(''); setSuccess('');
    try {
      setEvent(await apiFetch<EventRecord>(`/api/events/${id}/publish`, { method: 'POST' }));
      setSuccess('Event published'); setConfirm(false);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  return <section className="events-page">
    <Link className="event-action" to={organizer ? '/organizer/events' : '/events'}>Back to {organizer ? 'My events' : 'Events'}</Link>
    {loading && <p>Loading...</p>}{error && <p role="alert" className="alert">{error}</p>}
    {event && <article className="event-card">
      <h1>{event.title}</h1><Status event={event} />
      {success && <p role="status">{success}</p>}
      <p className="event-description">{event.description}</p><p>{event.location}</p>
      <p>Start: {formatTime(event.startsAt)} (Bangkok)</p><p>End: {formatTime(event.endsAt)} (Bangkok)</p>
      <p>Organizer: {event.organizer.name}</p><Places event={event} />
      {organizer && event.organizer.id === user?.id && event.status === 'DRAFT' &&
        (confirm ? <div role="group" aria-label="Confirm publication">
          <p>Publish this event? Participants will be able to register.</p>
          <div className="event-actions"><button disabled={busy} onClick={publish}>{busy ? 'Publishing...' : 'Confirm publish'}</button>
            <button className="secondary" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button></div>
        </div> : <button onClick={() => setConfirm(true)}>Publish</button>)}
    </article>}
  </section>;
}
