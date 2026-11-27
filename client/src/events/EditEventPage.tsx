import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, apiFetch } from '../api';
import { useAuth } from '../auth/AuthContext';
import { fields } from './CreateEventPage';
import { errorMessage, validateEventForm, type EventForm, type EventRecord } from './model';
import './events.css';

const BANGKOK_MS = 7 * 3600000;
/** ISO instant to the datetime-local value shown in Bangkok time (UTC+7). */
export const toBangkokInput = (iso: string) => new Date(Date.parse(iso) + BANGKOK_MS).toISOString().slice(0, 16);
const toIso = (local: string) => new Date(local + ':00+07:00').toISOString();
const formOf = (e: EventRecord): EventForm => ({
  title: e.title, description: e.description ?? '', location: e.location,
  startsAt: toBangkokInput(e.startsAt), endsAt: toBangkokInput(e.endsAt), capacity: String(e.capacity),
});

/** F-07 (#52): the owner edits an event. Only changed fields are sent; the API enforces every rule. */
export function EditEventPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [original, setOriginal] = useState<EventForm | null>(null);
  const [form, setForm] = useState<EventForm | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof EventForm, string>>>({});
  const [alert, setAlert] = useState('');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let active = true;
    apiFetch<EventRecord>(`/api/events/${id}`).then((event) => {
      if (!active) return;
      if (event.organizer.id !== user?.id) { setLoadError('Event not found'); return; }
      setOriginal(formOf(event)); setForm(formOf(event));
    }).catch((e) => { if (active) setLoadError(e instanceof ApiError && e.status === 404 ? 'Event not found' : errorMessage(e)); });
    return () => { active = false; };
  }, [id, user?.id]);

  function focusError(next: typeof errors) {
    const first = fields.find(([key]) => next[key]);
    if (first) (formRef.current?.elements.namedItem(first[0]) as HTMLElement)?.focus();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form || !original) return;
    const next = validateEventForm(form);
    // An unchanged start may already be in the past (capacity edits during the event).
    if (form.startsAt === original.startsAt) delete next.startsAt;
    setErrors(next); setAlert('');
    if (Object.keys(next).length) { focusError(next); return; }
    const body: Record<string, string | number> = {};
    for (const [key] of fields) {
      if (form[key] === original[key]) continue;
      body[key] = key === 'capacity' ? Number(form.capacity) : key === 'startsAt' || key === 'endsAt' ? toIso(form[key]) : form[key];
    }
    if (!Object.keys(body).length) { navigate(`/organizer/events/${id}`); return; }
    setBusy(true);
    try {
      await apiFetch<EventRecord>(`/api/events/${id}`, { method: 'PATCH', body });
      navigate(`/organizer/events/${id}`, { replace: true, state: { updated: true } });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CAPACITY_BELOW_ACTIVE') {
        const next = { capacity: error.message }; setErrors(next); focusError(next);
      } else {
        setAlert(errorMessage(error));
        if (error instanceof ApiError && error.details.length) {
          const next = Object.fromEntries(error.details.map(({ field, message }) => [field, message]));
          setErrors(next); focusError(next);
        }
      }
    } finally { setBusy(false); }
  }

  return <section className="events-page"><h1>Edit event</h1>
    {loadError ? <p role="alert" className="alert">{loadError}</p> : !form ? <p>Loading...</p> : <>
      <p>Enter start and end in Bangkok time (UTC+7).</p>
      <form ref={formRef} className="form" onSubmit={submit} noValidate>
        {alert && <p className="alert" role="alert">{alert}</p>}
        {fields.map(([key, label, type]) => {
          const props = { id: key, name: key, value: form[key], disabled: busy,
            'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `${key}-error` : undefined,
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value }) };
          return <div className="field" key={key}><label htmlFor={key}>{label}</label>
            {type === 'textarea' ? <textarea {...props} rows={5} /> : <input {...props} type={type} step={type === 'number' ? 1 : undefined} />}
            {errors[key] && <p className="field-error" id={`${key}-error`}>{errors[key]}</p>}</div>;
        })}
        <button disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
      </form>
    </>}
    <Link className="event-action" to={`/organizer/events/${id}`}>Back to event</Link>
  </section>;
}
