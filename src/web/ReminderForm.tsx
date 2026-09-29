import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Action } from '../shared/contracts.ts';
import type { Schedule, SchedulePreview } from '../shared/schedule.ts';

interface Props {
  disabled: boolean;
  create: (action: Action) => Promise<boolean>;
  preview: (schedule: Schedule) => Promise<SchedulePreview>;
}
export function ReminderForm({ disabled, create, preview }: Props) {
  const [title, setTitle] = useState('');
  const [schedule, setSchedule] = useState<Schedule>({ frequency: 'once', localStart: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, gap: 'next-valid', overlap: 'earlier', missed: 'inbox' });
  const [result, setResult] = useState<{ key: string; data: SchedulePreview } | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');
  const key = JSON.stringify(schedule); const keyRef = useRef(key); keyRef.current = key;
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const ready = result?.key === key ? result.data : null;
  function change<K extends keyof Schedule>(field: K, value: Schedule[K]) {
    setSchedule(old => ({ ...old, [field]: value })); setResult(null); setError('');
  }
  async function showPreview() {
    const requested = key; setWaiting(true); setError('');
    try { const data = await preview(schedule); if (live.current && keyRef.current === requested) setResult({ key: requested, data }); }
    catch (e) { if (live.current && keyRef.current === requested) setError((e as Error).message); }
    finally { if (live.current) setWaiting(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (schedule.localStart && !ready) return;
    const action: Action = schedule.localStart ? { type: 'item.create', kind: 'reminder', title,
      schedule, expectedDueAt: ready!.occurrences[0].dueAt } : { type: 'item.create', kind: 'task', title };
    if (await create(action)) {
      setTitle(''); setSchedule(old => ({ ...old, localStart: '', frequency: 'once' })); setResult(null); setError('');
    }
  }
  return <form className="task-form" onSubmit={submit}>
    <label className="sr-only" htmlFor="task-title">Task title</label>
    <input id="task-title" placeholder="What would you like to remember?" required maxLength={160} value={title} onChange={e => setTitle(e.target.value)}/>
    <button className="primary" disabled={disabled || waiting || (!!schedule.localStart && !ready)}>Add</button>
    <label className="date-label">Optional reminder time<input aria-label="Reminder start" type="datetime-local" value={schedule.localStart} onChange={e => change('localStart', e.target.value)}/></label>
    {schedule.localStart && <div className="schedule-options">
      <div className="schedule-fields">
        <label>Repeat<select aria-label="Repeat" value={schedule.frequency} onChange={e => change('frequency', e.target.value as Schedule['frequency'])}>
          <option value="once">Once</option><option value="daily">Every day</option><option value="weekly">Every week</option>
        </select></label>
        <label>Time zone<input aria-label="Reminder time zone" value={schedule.timezone} maxLength={80} onChange={e => change('timezone', e.target.value)} spellCheck={false}/></label>
        <label>If the clock skips this time<select aria-label="Missing time policy" value={schedule.gap} onChange={e => change('gap', e.target.value as Schedule['gap'])}>
          <option value="next-valid">Use the first valid time after the gap</option><option value="skip">Skip that occurrence</option>
        </select></label>
        <label>If the clock repeats this time<select aria-label="Repeated time policy" value={schedule.overlap} onChange={e => change('overlap', e.target.value as Schedule['overlap'])}>
          <option value="earlier">Use the first occurrence</option><option value="later">Use the second occurrence</option>
        </select></label>
      </div>
      <label>If JARVIS is more than a minute late<select aria-label="Missed reminder policy" value={schedule.missed} onChange={e => change('missed', e.target.value as Schedule['missed'])}>
        <option value="inbox">Show the latest due occurrence in my inbox</option><option value="skip">Skip missed occurrences</option>
      </select></label>
      <button type="button" disabled={disabled || waiting} onClick={() => void showPreview()}>{waiting ? 'Checking times…' : 'Preview reminder times'}</button>
      {error && <p className="error" role="alert">{error}</p>}
      {ready && <div className="schedule-preview" role="status" aria-label="Reminder preview"><strong>{schedule.frequency === 'once' ? 'Scheduled time' : 'Next three occurrences'} · {ready.timezone}</strong>
        <ol>{ready.occurrences.map(o => <li key={o.dueAt}><span>{o.resolvedLocal.replace('T', ' ')} · UTC{o.offset}</span>
          {o.adjustment !== 'none' && <small>{o.adjustment === 'gap-shifted' ? `Moved from ${o.requestedLocal.replace('T', ' ')} to the first valid time.` : `Repeated clock time: ${o.adjustment === 'overlap-earlier' ? 'first' : 'second'} occurrence.`}</small>}
        </li>)}</ol>
        <p>Review these times, then select Add. Changing a schedule setting requires a new preview.</p>
      </div>}
      <p className="fineprint">Repeats use this time zone, even when your PC travels. One inbox entry per reminder updates to the latest due occurrence; dismissing it keeps the repeat running.</p>
    </div>}
  </form>;
}
