import { Component, StrictMode, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Action, Snapshot, Item } from '../shared/contracts.ts';
import './styles.css';
import './hud.css';
import { CoreDisplay } from './CoreDisplay.tsx';
import { MicrophoneTest } from './MicrophoneTest.tsx';
import { demoRequest } from './demo.ts';
import { ReminderForm } from './ReminderForm.tsx';
import type { SchedulePreview } from '../shared/schedule.ts';
type Auth = { authenticated: boolean; setupRequired: boolean; csrf?: string; expiresAt?: number };
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const errors: Record<string, string> = {
  INVALID_SCHEDULE: 'Check the local date, time zone and repeat settings.',
  NO_SCHEDULE_OCCURRENCE: 'That time does not exist in this zone. Choose the first-valid-time policy or a different date.',
  SCHEDULE_PREVIEW_REQUIRED: 'The schedule no longer matches its preview. Preview the times again before adding it.',
  LOGIN_FAILED: 'That password did not match. Please try again.', LOGIN_REQUIRED: 'Your session ended. Sign in again.',
  REAUTH_REQUIRED: 'Enter your current password to make this change.', ACTIONS_PAUSED: 'New actions are paused. Resume them in Controls.',
  LOCAL_GRANT_REQUIRED: 'Workspace permission is revoked. Restore it in Controls.',
  SETUP_CODE_INVALID_OR_EXPIRED: 'Check the setup code in your terminal. Restart JARVIS for a new code if 10 minutes have passed.',
  ITEM_QUOTA: 'The 1,000-item limit is reached. Delete unused items before adding more.',
  DUE_TIME_RANGE: 'Choose a future due time within one year.', INVALID_ITEM: 'Check the title and time zone.',
  INVALID_REQUEST: 'Check the fields and try again.', REQUEST_ID_CONFLICT: 'This request ID was used with different content. Review the saved items.',
  RATE_LIMIT: 'Too many requests. Wait a minute and try again.', SERVICE_UNAVAILABLE: 'The local service is unavailable. Check your terminal.',
  SCHEDULER_UNAVAILABLE: 'The scheduler could not access storage. Check the data directory and available disk space.',
};
class WidgetBoundary extends Component<{ title: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <section className="card"><h2>{this.props.title}</h2><p>This widget could not render. Other controls remain available.</p><button onClick={() => this.setState({ failed: false })}>Retry widget</button></section> : this.props.children; }
}
function Icon({ kind }: { kind: string }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    task: <><path d="M9 5h12M9 12h12M9 19h12M2 5l2 2 3-4M2 12l2 2 3-4M2 19l2 2 3-4"/></>,
    clock: <><circle cx="12" cy="13" r="8"/><path d="M12 8v5l3 2M9 2h6"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V6a4 4 0 018 0v4M12 14v3"/></>,
    arrow: <path d="M4 12h15M13 6l6 6-6 6"/>,
    pulse: <path d="M2 12h5l3-8 4 16 3-8h5"/>,
    settings: <><path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
  };
  return <svg className="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind] ?? paths.grid}</svg>;
}
function App() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const authRef = useRef<Auth | null>(null); const generation = useRef(0); const snapshotRequest = useRef(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [online, setOnline] = useState(false); const [error, setError] = useState('');
  const [locking, setLocking] = useState(false);
  const [command, setCommand] = useState(''); const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{ text: string; at: number }[]>([]);
  const [clock, setClock] = useState(Date.now()); const [controls, setControls] = useState(false);
  const [showPresence, setShowPresence] = useState(false); const [hideTasks, setHideTasks] = useState(false);
  const controlRef = useRef<HTMLDialogElement>(null);
  function changeAuth(value: Auth) {
    generation.current++; authRef.current = value; setAuth(value);
    setSnapshot(null); setMessages([]); setCommand(''); setControls(false); setOnline(false); setBusy(false);
  }
  async function api<T>(path: string, body?: unknown): Promise<T> {
    if (__JARVIS_DEMO__) return await demoRequest(path, body) as T;
    const requestGeneration = generation.current;
    let response: Response;
    try { response = await fetch(`/api/${path}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10_000),
      headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': authRef.current?.csrf ?? '' },
      body: body === undefined ? undefined : JSON.stringify(body) }); }
    catch { throw new Error('Cannot reach JARVIS. Check the terminal and keep the PC awake.'); }
    const data = await response.json();
    if (!response.ok) {
      if (data.error === 'LOGIN_REQUIRED' && requestGeneration === generation.current) changeAuth({ authenticated: false, setupRequired: false });
      throw new Error(errors[data.error] ?? `Request failed (${response.status}). Check your input or retry.`);
    }
    return data;
  }
  async function refresh() {
    const at = generation.current; const request = ++snapshotRequest.current;
    try {
      const next = await api<Snapshot>('snapshot');
      if (at === generation.current && request === snapshotRequest.current && authRef.current?.authenticated) { setSnapshot(next); setOnline(true); }
    } catch (e) {
      if (at === generation.current && request === snapshotRequest.current) { setOnline(false); setError((e as Error).message); }
    }
  }
  useEffect(() => {
    let active = true;
    api<Auth>('session').then(value => { if (active) { changeAuth(value); setOnline(true); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!auth?.authenticated) return;
    let alive = true; let timeout: ReturnType<typeof setTimeout>;
    const poll = async () => { await refresh(); if (alive) timeout = setTimeout(poll, 1000); };
    void poll(); return () => { alive = false; clearTimeout(timeout); };
  }, [auth]);
  useEffect(() => {
    const timer = setInterval(() => { setClock(Date.now()); setMessages(old => old.filter(m => m.at > Date.now() - 300_000)); }, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { if (controls) controlRef.current?.showModal(); else controlRef.current?.close(); }, [controls]);
  async function run(body: unknown, route = 'actions') {
    setBusy(true); setError(''); const at = generation.current;
    try {
      const result = await api<{ reply?: string }>(route, body);
      if (at === generation.current) {
        if (result.reply) setMessages(old => [...old, { text: result.reply!, at: Date.now() }].slice(-8));
        await refresh();
      }
      return at === generation.current;
    } catch (e) { if (at === generation.current) setError((e as Error).message); return false; }
    finally { if (at === generation.current) setBusy(false); }
  }
  async function act(action: Action) { return run({ requestId: crypto.randomUUID(), action }); }
  async function send(text: string) {
    if (!text.trim()) return;
    const ok = await run({ requestId: crypto.randomUUID(), text, timezone: zone }, 'commands');
    if (ok) setCommand('');
  }
  async function lock() {
    if (__JARVIS_DEMO__) { location.reload(); return; }
    // Capture the current CSRF token before removing all private UI state.
    const signOut = api('logout', {});
    changeAuth({ authenticated: false, setupRequired: false });
    setLocking(true); setError('');
    try { await signOut; }
    catch { setError('This screen is hidden, but the server could not confirm sign-out. Close the browser while the server is unavailable.'); }
    finally { setLocking(false); }
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (locking || busy) return; const fields = new FormData(event.currentTarget); setBusy(true); setError('');
    try {
      const value = await api<Auth>(auth?.setupRequired ? 'enroll' : 'login', auth?.setupRequired
        ? { password: fields.get('password'), code: fields.get('code'), localConsent: fields.get('consent') === 'on' }
        : { password: fields.get('password') });
      changeAuth(value);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function timeLabel(value: number, timezone = zone) { return new Intl.DateTimeFormat('en-IE', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(value); }
  function countdown(item: Item) {
    if (!item.dueAt) return '';
    const seconds = Math.max(0, Math.ceil((item.dueAt - clock) / 1000));
    if (!seconds) return 'Due · check inbox';
    return `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}:` : ''}${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  const tasks = snapshot?.items.filter(i => i.kind !== 'timer') ?? [];
  const timers = snapshot?.items.filter(i => i.kind === 'timer' && i.state === 'active') ?? [];
  if (!auth?.authenticated) return <div className="entry">
    <div className="entry-story"><a className="wordmark" href={__JARVIS_DEMO__ ? './' : '/'} aria-label="JARVIS home"><span className="logo">J</span>JARVIS<span className="version">LOCAL ALPHA</span></a>
      <div className="entry-copy"><span className="eyebrow">YOUR SPACE. YOUR ASSISTANT.</span><h1>A little more<br/>presence.<br/><em>A lot more control.</em></h1><p>A private workspace for the things you want to remember. Running right here, on your PC.</p></div>
      <div className="entry-foot"><span className="dot"/>Local processing<span>01 / FOUNDATION</span></div></div>
    <main className="entry-form"><div className="entry-box"><span className="eyebrow">JARVIS / PERSONAL ACCESS</span><h2>{auth?.setupRequired ? 'Make yourself at home.' : 'Welcome back.'}</h2><p>{auth?.setupRequired ? 'Set up your private local workspace.' : 'Unlock your workspace to continue.'}</p>
      {!auth && !error ? <p role="status">Connecting to your local core…</p> : <form onSubmit={login}>
        {auth?.setupRequired && <label>Setup code<input name="code" required autoComplete="off" spellCheck={false}/><small>Copy the one-time code from your terminal.</small></label>}
        <label>Password<input aria-label="Password" name="password" type="password" minLength={12} maxLength={128} required autoComplete={auth?.setupRequired ? 'new-password' : 'current-password'}/><small>{auth?.setupRequired ? 'Use at least 12 characters.' : 'Your password stays on this PC.'}</small></label>
        {auth?.setupRequired && <label className="consent"><input type="checkbox" name="consent" required/>Allow JARVIS to store and manage my local tasks, reminders and timers.</label>}
        <button className="primary wide" disabled={busy || locking || !auth}>{busy || locking ? 'Please wait…' : auth?.setupRequired ? 'Create workspace' : 'Unlock workspace'}<Icon kind="arrow"/></button>
      </form>}
      {locking && <p role="status">Workspace hidden. Confirming server sign-out…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!auth && error && <button onClick={() => location.reload()}>Retry connection</button>}
      <p className="entry-note"><Icon kind="lock"/>One PC. One private workspace.<br/>Voice and cloud connections are off.</p>
    </div></main>
  </div>;
  return <div className="shell">
    <a className="skip" href="#main">Skip to workspace</a>
    <aside className="sidebar"><a className="wordmark" href="#main"><span className="logo">J</span>JARVIS</a><span className="nav-label">PERSONAL WORKSPACE</span>
      <nav aria-label="Workspace"><a className="nav-item selected" href="#main"><Icon kind="grid"/>Overview<span>01</span></a><a className="nav-item" href="#tasks"><Icon kind="task"/>Tasks & reminders</a><a className="nav-item" href="#timers"><Icon kind="clock"/>Timers</a><a className="nav-item" href="#activity"><Icon kind="pulse"/>Activity</a></nav>
      <div className="sidebar-bottom"><div className="local-card"><span className="dot"/>{__JARVIS_DEMO__ ? ' BROWSER PREVIEW' : ' LOCAL CORE'}<p>{__JARVIS_DEMO__ ? 'Sample data only' : 'On this PC'}</p><small>Private by design.<br/>Useful at your pace.</small></div><button className="nav-item" onClick={() => setControls(true)}><Icon kind="settings"/>Controls</button><button className="nav-item" onClick={() => void lock()}><Icon kind="lock"/>{__JARVIS_DEMO__ ? 'Reset demo' : 'Lock workspace'}</button><small className="build">MILESTONE 01 · ALPHA</small></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div><div className="top-status"><span className={`dot ${online ? '' : 'warning'}`}/>{online ? (__JARVIS_DEMO__ ? 'Preview ready' : 'Core connected') : 'Core unavailable'}<span className="divider"/><span className="chip">{__JARVIS_DEMO__ ? 'DEMO' : 'LOCAL ONLY'}</span></div></header>
      <main id="main" className="main" tabIndex={-1}>
        {__JARVIS_DEMO__ && <section className="demo-banner" aria-label="Preview information"><strong>JARVIS · Interactive preview</strong><p>Try tasks, timers and the sensor simulator with sample data. Changes stay in this tab and reset on reload. No real account, device, AI model or backup is connected. Please use sample information only.</p><a href="https://github.com/danielsantos2310/jarvis">Project on GitHub</a></section>}
        <div className="page-heading"><div><span className="eyebrow">{new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long' }).format(clock).toUpperCase()}</span><h1>Your day, with a little more clarity.</h1><p>Everything you need. Right here, on your PC.</p></div><div className="clock"><strong>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(clock)}</strong><span>{zone}</span></div></div>
        {error && <div className="error banner" role="alert">{error}<button className="quiet" onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
        {!online && <p className="warning-panel" role="status">Connection lost. Last-known information may be stale; countdowns do not confirm delivery.</p>}
        {snapshot?.paused && <div className="warning-panel" role="status">Actions are paused. New items and reminder delivery are stopped. <button onClick={() => setControls(true)}>Review controls</button></div>}
        <section className="assistant-card" aria-labelledby="assistant-title"><div className="assistant-content"><span className="eyebrow"><span className="dot"/> YOUR LOCAL ASSISTANT</span><h2 id="assistant-title">Ready when you are.</h2><p>Clear a thought. Save a task. Make time for a break.</p>
          <form className="command-form" onSubmit={e => { e.preventDefault(); void send(command); }}><label className="sr-only" htmlFor="command">Ask JARVIS</label><span className="command-symbol" aria-hidden="true">›</span><input id="command" value={command} maxLength={500} onChange={e => setCommand(e.target.value)} placeholder="Try “remind me in 10 minutes to stretch”" autoComplete="off"/><button className="send" disabled={busy || !online || !command.trim()} aria-label="Send command"><Icon kind="arrow"/></button></form>
          <div className="suggestions"><button disabled={busy || !online} onClick={() => void send('timer 5 minutes')}><Icon kind="clock"/>5-minute timer</button><button onClick={() => { setCommand('add task '); document.getElementById('command')?.focus(); }}><Icon kind="plus"/>Add a task</button><button disabled={busy || !online} onClick={() => void send('help')}>What can you do?</button></div>
          <div className="responses" aria-live="polite">{messages.slice(-1).map(m => <p key={m.at}>{m.text}</p>)}</div>
          <small className="command-note">Defined text commands · No AI model connected · {__JARVIS_DEMO__ ? 'Microphone off' : 'Voice commands not installed'}</small>
        </div><CoreDisplay/></section>
        <div className="metric-grid"><div className="metric"><Icon kind="task"/><div><span>Open tasks</span><strong>{snapshot?.grant ? tasks.filter(t => t.state === 'active').length : '—'}<small>in your workspace</small></strong></div></div><div className="metric"><Icon kind="clock"/><div><span>Active timers</span><strong>{snapshot?.grant ? timers.length : '—'}<small>kept on this PC</small></strong></div></div><div className="metric"><Icon kind="lock"/><div><span>Processing</span><strong className="metric-word">{__JARVIS_DEMO__ ? 'Browser' : 'Local'}<small>{__JARVIS_DEMO__ ? 'sample workspace' : 'cloud disabled'}</small></strong></div></div></div>
        {snapshot && !__JARVIS_DEMO__ && <section className="card recovery-card" aria-label="Backup and recovery"><h2>Backup & recovery</h2>
          <p>{!snapshot.recovery.configured ? 'Backups are not configured. Use the backup guide to choose a separate recovery location.' : snapshot.recovery.lastBackupAt ? `Last backup: ${timeLabel(snapshot.recovery.lastBackupAt)}` : 'Recovery location configured. Create your first encrypted backup from the terminal.'}</p>
          {snapshot.recovery.configured && snapshot.recovery.deletionSync === 'pending' && <p className="warning-panel" role="status">Backup cleanup is pending. Deleted items are hidden here, but older backups are not yet safe to restore. Reconnect the recovery drive and keep JARVIS running.</p>}
          <p>{snapshot.automaticBackups.state === 'off' ? 'Automatic backups are off for this session.' : snapshot.automaticBackups.state === 'running' ? 'Creating and verifying an automatic backup…' : snapshot.automaticBackups.state === 'attention' ? 'Automatic backup needs attention. Check the recovery drive, free space and host clock. A retry is scheduled.' : 'Automatic daily backups are enabled for this session.'}</p>
          {snapshot.automaticBackups.nextAttemptAt && <p>Next backup check: {timeLabel(snapshot.automaticBackups.nextAttemptAt, 'UTC')} (UTC)</p>}
          {snapshot.recovery.deletionSync === 'synced' && <p>Deletion journal synchronized. Keep this recovery location current when restoring.</p>}
        </section>}
        {!snapshot && <p role="status">Loading your workspace…</p>}
        {snapshot && !snapshot.grant && <p className="warning-panel">Workspace permission is revoked. Private items are excluded from server responses. <button onClick={() => setControls(true)}>Manage permission</button></p>}
        <div className="content-grid"><div className="left-column"><WidgetBoundary title="Tasks and reminders"><section id="tasks" className="card"><div className="card-heading"><h2>Tasks & reminders <span className="count">{snapshot?.grant ? tasks.length : '—'}</span></h2><button className="quiet" onClick={() => setHideTasks(!hideTasks)}>{hideTasks ? 'Show' : 'Hide'}</button></div>
          {!hideTasks && <><ReminderForm demo={__JARVIS_DEMO__} disabled={busy || !online || !snapshot?.grant || snapshot.paused} create={act} preview={schedule => api<SchedulePreview>('schedule-preview', schedule)}/>
            <div className="items">{tasks.length === 0 ? <div className="empty"><span className="empty-icon"><Icon kind="task"/></span><h3>A clear space.</h3><p>Add a task above, or ask JARVIS to remember something.</p></div> : tasks.map(item => <div className={`item ${item.state === 'done' ? 'done' : ''}`} key={item.id}><button className="check" disabled={busy || item.state === 'done' || !online} aria-label={`${item.schedule && item.schedule.frequency !== 'once' ? 'Stop repeating' : 'Complete'} ${item.title}`} onClick={() => void act({ type: 'item.complete', id: item.id })}>{item.state === 'done' ? '✓' : ''}</button><div><strong>{item.title}</strong><small>{item.dueAt ? `${timeLabel(item.dueAt, item.timezone)} ${item.timezone}` : 'Local task'} · {item.state === 'done' ? 'Completed' : 'Active'}{item.schedule && item.schedule.frequency !== 'once' && ` · ${item.schedule.frequency}`}</small></div><button className="delete quiet" aria-label={`Delete ${item.title}`} disabled={busy || !online} onClick={() => void act({ type: 'item.delete', id: item.id })}>×</button></div>)}</div><p className="card-footer">{__JARVIS_DEMO__ ? 'SOURCE: SAMPLE WORKSPACE' : 'SOURCE: YOUR LOCAL WORKSPACE'}</p></>}
        </section></WidgetBoundary>
        <WidgetBoundary title="Reminder inbox"><section className="card inbox"><div className="card-heading"><h2>Reminder inbox</h2><span className="tag">PRIVATE</span></div>{snapshot?.notices.length ? snapshot.notices.map(n => <div className="notice" key={n.id}><div><strong>{n.title}</strong><small>{n.late ? 'Missed while unavailable · ' : 'Due · '}{timeLabel(n.dueAt)}</small></div><button className="quiet" disabled={busy || !online} onClick={() => void act({ type: 'notice.dismiss', id: n.id })} aria-label={`Dismiss ${n.title}`}>Dismiss</button></div>) : <p className="muted">You’re all caught up. Due reminders appear here.</p>}<p className="fineprint">Silent inbox delivery. This alpha cannot alert you while the core is stopped or the PC is asleep.</p></section></WidgetBoundary>
        </div><div className="right-column"><WidgetBoundary title="Timers"><section id="timers" className="card"><div className="card-heading"><h2>Make a little time.</h2><Icon kind="clock"/></div><p className="muted">A moment to focus, or a moment to pause.</p><div className="timer-presets">{[5, 15, 25].map(n => <button disabled={busy || !online || !snapshot?.grant || snapshot.paused} key={n} onClick={() => void send(`timer ${n} minutes`)}>{n}<span>MIN</span></button>)}</div>
          {timers.length === 0 ? <div className="timer-idle">No timer running<span>Choose a duration to begin.</span></div> : timers.map(t => <div className="timer-row" key={t.id}><div><span>{t.title}</span><strong>{countdown(t)}</strong></div><button disabled={busy || !online} className="quiet" onClick={() => void act({ type: 'item.complete', id: t.id })} aria-label={`Cancel ${t.title}`}>Cancel</button></div>)}<p className="card-footer">{__JARVIS_DEMO__ ? 'SAMPLE TIMER · RESETS ON RELOAD' : 'SAVED LOCALLY · RESUMES AFTER RESTART'}</p></section></WidgetBoundary>
          <section className="card system-card"><div className="card-heading"><h2>System at a glance</h2><span className={`dot ${online ? '' : 'warning'}`}/></div><dl><div><dt>{__JARVIS_DEMO__ ? 'Browser simulation' : 'Core & storage'}</dt><dd>{online && snapshot ? 'Ready' : 'Unavailable'}</dd></div><div><dt>Microphone</dt><dd>{__JARVIS_DEMO__ ? 'Not connected' : 'Manual test below'}</dd></div><div><dt>AI model</dt><dd>Not installed</dd></div><div><dt>Cloud services</dt><dd>Disabled</dd></div><div><dt>Unsolicited suggestions</dt><dd>Off</dd></div></dl><button className="text-button" onClick={() => setShowPresence(!showPresence)}>{showPresence ? 'Hide' : 'Open'} sensor simulator <Icon kind="arrow"/></button>
          {showPresence && <div className="simulation"><span className="tag">SYNTHETIC DATA</span><p>Test room: <strong>{snapshot?.presence.state ?? 'unknown'}</strong></p><div>{(['occupied', 'vacant', 'unknown'] as const).map(state => <button disabled={busy || !online} key={state} onClick={() => void run({ state }, 'synthetic-presence')}>{state}</button>)}</div><small>Expires after 30 seconds. No real sensor, identity inference or recording.</small></div>}
          </section>
        </div></div>
        {!__JARVIS_DEMO__ && online && snapshot?.grant && !snapshot.paused && <MicrophoneTest/>}
        <section id="activity" className="card activity"><div className="card-heading"><h2>Recent activity</h2><span className="tag">METADATA ONLY</span></div><div className="activity-list">{snapshot?.audit.map((a, i) => <div key={`${a.at}-${i}`}><span className={`dot ${a.decision === 'denied' ? 'warning' : ''}`}/><strong>{a.action.replaceAll('.', ' ')}</strong><span>{a.decision}</span><time>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(a.at)}</time></div>)}</div><p className="fineprint">Task titles and command text are excluded from the audit log.</p></section>
        <footer className="footer"><span><span className="dot"/>Your data. Your pace. Your JARVIS.</span><span>{__JARVIS_DEMO__ ? 'SAMPLE PREVIEW / MILESTONE 01' : 'LOCAL PC ALPHA / MILESTONE 01'}</span></footer>
      </main>
    </div>
    <dialog ref={controlRef} onCancel={() => setControls(false)} onClose={() => setControls(false)} aria-labelledby="controls-title"><div className="card-heading"><h2 id="controls-title">Workspace controls</h2><button className="quiet" onClick={() => setControls(false)} aria-label="Close controls">×</button></div><p>Stop pauses new items and reminder delivery. Saved items remain available to inspect and remove.</p><button className="danger" disabled={busy || snapshot?.paused} onClick={() => void run({ change: 'stop' }, 'control')}>Pause actions & delivery</button>
      <form onSubmit={async e => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); if (await run({ change: data.get('change'), password: data.get('password') }, 'control')) { form.reset(); setControls(false); } }}>{!__JARVIS_DEMO__ && <label>Confirm with your password<input name="password" type="password" required autoComplete="current-password" minLength={12} maxLength={128}/></label>}<label>Change<select aria-label="Change" name="change"><option value="resume">Resume actions & delivery</option><option value="revoke">Revoke local workspace permission</option><option value="grant">Restore local workspace permission</option></select></label><button className="primary wide" disabled={busy}>Apply change</button></form>
      {error && <p className="error" role="alert">{error}</p>}<p className="fineprint">{__JARVIS_DEMO__ ? 'These controls affect this sample preview only. No password is needed.' : 'No external tools or permission changes through chat are available. Password recovery is performed from your local terminal.'}</p>
    </dialog>
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
