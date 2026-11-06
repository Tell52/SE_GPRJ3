import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../api';
import { errorMessage, formatTime } from '../events/model';
import './roster.css';

type Roster = {
  event: { id: number; title: string; capacity: number };
  count: number;
  items: { id: number; status: string; registeredAt: string;
    participant: { id: number; name: string; email: string } }[];
};

export function RosterPanel({ eventId }: { eventId: number }) {
  const [data, setData] = useState<Roster | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError(''); setLoading(true);
    apiFetch<Roster>(`/api/events/${eventId}/registrations`)
      .then((result) => { if (active) setData(result); })
      .catch((e) => { if (active) setError(e instanceof ApiError && e.status === 404 ? 'Event not found' : errorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [eventId, attempt]);
  return <section className="roster-panel" aria-labelledby="roster-heading">
    <h2 id="roster-heading">Roster</h2>
    {loading ? <p role="status">Loading...</p> : error ? <>
      <p role="alert" className="alert">{error}</p>
      <button className="secondary" onClick={() => setAttempt(attempt + 1)}>Retry roster</button>
    </> : data && <>
      <p>{data.count} of {data.event.capacity} places taken</p>
      {data.items.length === 0 ? <p>No registrations yet</p> :
        <table className="roster-table"><caption>Event registrations</caption>
          <thead><tr><th scope="col">Registration ID</th><th scope="col">Participant</th><th scope="col">Email</th><th scope="col">Status</th><th scope="col">Registered (Bangkok)</th></tr></thead>
          <tbody>{data.items.map((item) => <tr key={item.id}>
            <td data-label="Registration ID">{item.id}</td>
            <td data-label="Participant">{item.participant.name}</td>
            <td data-label="Email">{item.participant.email}</td>
            <td data-label="Status">{item.status}</td>
            <td data-label="Registered (Bangkok)"><time dateTime={item.registeredAt}>{formatTime(item.registeredAt)}</time></td>
          </tr>)}</tbody>
        </table>}
    </>}
  </section>;
}
