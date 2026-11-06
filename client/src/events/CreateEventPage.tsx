import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, apiFetch } from '../api';
import { errorMessage, validateEventForm, type EventForm, type EventRecord } from './model';
import './events.css';

const fields = [
  ['title', 'Title', 'text'], ['description', 'Description', 'textarea'], ['location', 'Location', 'text'],
  ['startsAt', 'Start', 'datetime-local'], ['endsAt', 'End', 'datetime-local'], ['capacity', 'Capacity', 'number'],
] as const;

export function CreateEventPage() {
  const [form, setForm] = useState<EventForm>({ title: '', description: '', location: '', startsAt: '', endsAt: '', capacity: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof EventForm, string>>>({});
  const [alert, setAlert] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  function focusError(next: typeof errors) {
    const first = fields.find(([key]) => next[key]);
    if (first) (formRef.current?.elements.namedItem(first[0]) as HTMLElement)?.focus();
  }
  useEffect(() => {
    if (!busy) focusError(errors);
  }, [errors, busy]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = validateEventForm(form); setErrors(next); setAlert('');
    if (Object.keys(next).length) { focusError(next); return; }
    setBusy(true);
    try {
      const event = await apiFetch<EventRecord>('/api/events', { method: 'POST', body: {
        ...form, capacity: Number(form.capacity),
        startsAt: new Date(form.startsAt + ':00+07:00').toISOString(),
        endsAt: new Date(form.endsAt + ':00+07:00').toISOString(),
      } });
      navigate(`/organizer/events/${event.id}`, { replace: true, state: { saved: true } });
    } catch (error) {
      setAlert(errorMessage(error));
      if (error instanceof ApiError && error.details.length) {
        const next = Object.fromEntries(error.details.map(({ field, message }) => [field, message]));
        setErrors(next); focusError(next);
      }
    } finally { setBusy(false); }
  }
  return <section className="events-page"><h1>Create event</h1>
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
      <button disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
    </form><Link className="event-action" to="/organizer/events">Back to My events</Link>
  </section>;
}
