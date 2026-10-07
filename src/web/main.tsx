import { Form, PasswordInput } from './Form.tsx';
import { Component, StrictMode, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Action, Snapshot, Item } from '../shared/contracts.ts';
import './styles.css';
import './hud.css';
import { SpeechPanel } from './SpeechPanel.tsx';
import { VoiceWaveform } from './VoiceWaveform.tsx';
import { BrowserVoice } from './BrowserVoice.tsx';
import { FloatingWorkspace } from './FloatingWorkspace.tsx';
import type { Panel } from './FloatingWorkspace.tsx';
import { WeatherPanel, MusicPanel } from './ServicePanels.tsx';
import { EmailPanel } from './EmailPanel.tsx';
import { MicrophoneTest } from './MicrophoneTest.tsx';
import { demoRequest } from './demo.ts';
import { ReminderForm } from './ReminderForm.tsx';
import type { SchedulePreview } from '../shared/schedule.ts';
type Auth = { authenticated: boolean; setupRequired: boolean; csrf?: string; expiresAt?: number };
// Capture and immediately remove OAuth response parameters before any widget can load external content.
const oauthQuery = new URLSearchParams(location.search);
const oauthReturn = !__JARVIS_DEMO__ && oauthQuery.has('state') && (oauthQuery.has('code') || oauthQuery.has('error')) ? {code:oauthQuery.get('code'),state:oauthQuery.get('state'),error:oauthQuery.get('error')} : null;
if (oauthReturn) history.replaceState(null, '', location.pathname);
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const errors: Record<string, string> = {
  GMAIL_SETUP_REQUIRED: 'Set up your Google OAuth client on the local server first.', GMAIL_AUTH_EXPIRED: 'Google authorization expired or did not match this session. Connect Gmail again.', GMAIL_RECONNECT_REQUIRED: 'Gmail access expired or was revoked. Close and reopen Email, then connect again.', GMAIL_PROVIDER_ERROR: 'Google could not complete the request. Retry shortly.', GMAIL_READ_PERMISSION_REQUIRED: 'Google did not grant read access. Connect again and review the requested permission.', GMAIL_MESSAGE_TOO_LARGE: 'This message is too large to load here. Open it in Gmail.', GMAIL_CANCELLED: 'Gmail request cancelled.',
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
  const [micActivity,setMicActivity] = useState({listening:false,level:0});
  const [emailSpeaking,setEmailSpeaking] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);
  const authRef = useRef<Auth | null>(null); const generation = useRef(0); const snapshotRequest = useRef(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [online, setOnline] = useState(false); const [error, setError] = useState('');
  const [locking, setLocking] = useState(false);
  const [command, setCommand] = useState(''); const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{ text: string; at: number }[]>([]);
  const [clock, setClock] = useState(Date.now()); const [controls, setControls] = useState(false);
  const [activePanel, setActivePanel] = useState<Panel | null>(location.hash === '#microphone-test' ? 'microphone' : null);
  const [showPresence, setShowPresence] = useState(false); const [hideTasks, setHideTasks] = useState(false);
  const controlRef = useRef<HTMLDialogElement>(null);
  function changeAuth(value: Auth) {
    generation.current++; authRef.current = value; setAuth(value);
    setSnapshot(null); setMessages([]); setCommand(''); setControls(false); setActivePanel(value.authenticated && location.hash === '#microphone-test' ? 'microphone' : null); setOnline(false); setBusy(false);
  }
  async function api<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    if (__JARVIS_DEMO__) return await demoRequest(path, body) as T;
    const requestGeneration = generation.current;
    let response: Response;
    try { response = await fetch(`/api/${path}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.any([AbortSignal.timeout(path.startsWith('gmail/') ? 30000 : 10000), ...(signal ? [signal] : [])]),
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
  const oauth = useRef(oauthReturn);
  useEffect(() => {
    if (!auth?.authenticated || !snapshot || !oauth.current) return;
    const response = oauth.current; oauth.current = null; setActivePanel('email');
    if (response.error || !response.code) { setError('Google connection was cancelled or denied. You can try again from Email.'); return; }
    const at = generation.current;
    void api('gmail/complete', {code:response.code,state:response.state}).then(() => { if (at === generation.current) { setActivePanel(null); setTimeout(() => setActivePanel('email'),0); } }).catch(e => { if (at === generation.current) setError(e.message); });
  }, [auth, !!snapshot]);
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
    const intent = text.trim().toLowerCase();
    const panelCommands: Record<string, Panel> = { 'open my email': 'email', 'bring email back': 'email', 'open calendar': 'calendar', 'show my calendar': 'calendar', 'bring calendar back': 'calendar', 'open weather': 'weather', 'show weather': 'weather', 'bring weather back': 'weather', 'open music': 'music', 'open presence': 'presence', 'open home': 'home', 'open camera': 'camera', 'open email': 'email', 'show email': 'email', 'read my email': 'email', 'open tasks': 'tasks', 'show tasks': 'tasks', 'open timers': 'timers', 'open microphone': 'microphone', 'open system': 'system' };
    if (panelCommands[intent]) { setActivePanel(panelCommands[intent]); setCommand(''); return; }
    if (intent === 'close panel') { setActivePanel(null); setCommand(''); return; }
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
      {!auth && !error ? <p role="status">Connecting to your local core…</p> : <Form noValidate onSubmit={login}>
        {auth?.setupRequired && <label>Setup code<input name="code" required autoComplete="off" spellCheck={false}/><small>Copy the one-time code from your terminal.</small></label>}
        <label>Password<PasswordInput aria-label="Password" name="password" minLength={12} maxLength={128} required autoComplete={auth?.setupRequired ? 'new-password' : 'current-password'}/><small>{auth?.setupRequired ? 'Use at least 12 characters.' : 'Your password stays on this PC.'}</small></label>
        {auth?.setupRequired && <label className="consent"><input type="checkbox" name="consent" required/>Allow JARVIS to store and manage my local tasks, reminders and timers.</label>}
        <button className="primary wide" disabled={busy || locking || !auth}>{busy || locking ? 'Please wait…' : auth?.setupRequired ? 'Create workspace' : 'Unlock workspace'}<Icon kind="arrow"/></button>
      </Form>}
      {locking && <p role="status">Workspace hidden. Confirming server sign-out…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!auth && error && <button onClick={() => location.reload()}>Retry connection</button>}
      <p className="entry-note"><Icon kind="lock"/>One PC. One private workspace.<br/>Optional services connect only with your permission.</p>
    </div></main>
  </div>;
  return <FloatingWorkspace active={activePanel} onOpen={setActivePanel} onControls={() => setControls(true)} onLock={() => void lock()}
    voice={emailSpeaking ? <VoiceWaveform speaking connected illustrative/> : !__JARVIS_DEMO__ && online && snapshot?.grant && !snapshot.paused && snapshot.services.voice === 'configured'
      ? <SpeechPanel controlsOpen={activePanel === 'microphone'} csrf={auth.csrf ?? ''} onTranscript={text => { setCommand(text); setActivePanel('command'); setTimeout(() => document.getElementById('command')?.focus(), 0); }} reply={messages.at(-1)?.text ?? ''}/>
      : online && snapshot?.grant && !snapshot.paused ? <BrowserVoice listening={micActivity.listening} inputLevel={micActivity.level} processing={busy} controlsOpen={activePanel === 'microphone'} reply={messages.at(-1)?.text ?? ''}/> : <VoiceWaveform/>} notices={<>
      {error && <div className="error banner" role="alert">{error}<button className="quiet" onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
        {!snapshot && online && <p role="status">Loading workspace…</p>}
        {snapshot && !snapshot.grant && <div className="warning-panel" role="status">Permission is revoked. <button onClick={() => setControls(true)}>Review permissions</button></div>}
        {!online && <p className="warning-panel" role="status">Connection lost. Last-known information may be stale; countdowns do not confirm delivery.</p>}
        {snapshot?.paused && <div className="warning-panel" role="status">Actions are paused. New items and reminder delivery are stopped. <button onClick={() => setControls(true)}>Review controls</button></div>}
    </>} panels={{
      command: <section className="assistant-card" aria-labelledby="assistant-title"><div className="assistant-content"><span className="eyebrow"><span className="dot"/> JARVIS / PERSONAL ASSISTANT</span><h2 id="assistant-title">At your service.</h2><p>What would you like to get done? Start with a task or a timer.</p>
          <Form noValidate className="command-form" onSubmit={e => { e.preventDefault(); void send(command); }}><label className="sr-only" htmlFor="command">Ask JARVIS</label><span className="command-symbol" aria-hidden="true">›</span><input id="command" value={command} maxLength={500} onChange={e => setCommand(e.target.value)} placeholder="Try “add task plan tomorrow”" autoComplete="off"/><button className="send" disabled={busy || !online || !command.trim()} aria-label="Send command"><Icon kind="arrow"/></button></Form>
          <div className="suggestions"><button disabled={busy || !online} onClick={() => void send('timer 5 minutes')}><Icon kind="clock"/>5-minute timer</button><button onClick={() => { setCommand('add task '); document.getElementById('command')?.focus(); }}><Icon kind="plus"/>Add a task</button><button disabled={busy || !online} onClick={() => void send('help')}>What can you do?</button></div>
          <div className="responses" aria-live="polite">{messages.slice(-1).map(m => <p key={m.at}>{m.text}</p>)}</div>
          {online && snapshot?.grant && !snapshot.paused && <button className="voice-shortcut" onClick={() => setActivePanel('microphone')}><Icon kind="pulse"/>{snapshot?.services.voice === 'configured' && !__JARVIS_DEMO__ ? 'Open voice controls' : 'Test your microphone'}<Icon kind="arrow"/></button>}
          <small className="command-note">Defined text commands · No AI model connected · {__JARVIS_DEMO__ ? 'Optional microphone test below' : snapshot?.services.voice === 'configured' ? 'Local voice panel below' : 'Voice commands not installed'}</small>
        </div></section>,
      tasks: <><WidgetBoundary title="Tasks and reminders"><section id="tasks" className="card"><div className="card-heading"><h2>Tasks & reminders <span className="count">{snapshot?.grant ? tasks.length : '—'}</span></h2><button className="quiet" onClick={() => setHideTasks(!hideTasks)}>{hideTasks ? 'Show' : 'Hide'}</button></div>
          {!hideTasks && <><ReminderForm demo={__JARVIS_DEMO__} disabled={busy || !online || !snapshot?.grant || snapshot.paused} create={act} preview={schedule => api<SchedulePreview>('schedule-preview', schedule)}/>
            <div className="items">{tasks.length === 0 ? <div className="empty"><span className="empty-icon"><Icon kind="task"/></span><h3>A clear space.</h3><p>Add a task above, or ask JARVIS to remember something.</p></div> : tasks.map(item => <div className={`item ${item.state === 'done' ? 'done' : ''}`} key={item.id}><button className="check" disabled={busy || item.state === 'done' || !online} aria-label={`${item.schedule && item.schedule.frequency !== 'once' ? 'Stop repeating' : 'Complete'} ${item.title}`} onClick={() => void act({ type: 'item.complete', id: item.id })}>{item.state === 'done' ? '✓' : ''}</button><div><strong>{item.title}</strong><small>{item.dueAt ? `${timeLabel(item.dueAt, item.timezone)} ${item.timezone}` : 'Local task'} · {item.state === 'done' ? 'Completed' : 'Active'}{item.schedule && item.schedule.frequency !== 'once' && ` · ${item.schedule.frequency}`}</small></div><button className="delete quiet" aria-label={`Delete ${item.title}`} disabled={busy || !online} onClick={() => void act({ type: 'item.delete', id: item.id })}>×</button></div>)}</div><p className="card-footer">{__JARVIS_DEMO__ ? 'SOURCE: SAMPLE WORKSPACE' : 'SOURCE: YOUR LOCAL WORKSPACE'}</p></>}
        </section></WidgetBoundary>
        <WidgetBoundary title="Reminder inbox"><section className="card inbox"><div className="card-heading"><h2>Reminder inbox</h2><span className="tag">PRIVATE</span></div>{snapshot?.notices.length ? snapshot.notices.map(n => <div className="notice" key={n.id}><div><strong>{n.title}</strong><small>{n.late ? 'Missed while unavailable · ' : 'Due · '}{timeLabel(n.dueAt)}</small></div><button className="quiet" disabled={busy || !online} onClick={() => void act({ type: 'notice.dismiss', id: n.id })} aria-label={`Dismiss ${n.title}`}>Dismiss</button></div>) : <p className="muted">You’re all caught up. Due reminders appear here.</p>}<p className="fineprint">Silent inbox delivery. This alpha cannot alert you while the core is stopped or the PC is asleep.</p></section></WidgetBoundary></>,
      timers: <WidgetBoundary title="Timers"><section id="timers" className="card"><div className="card-heading"><h2>Timers</h2><Icon kind="clock"/></div><p className="muted">A moment to focus, or a moment to pause.</p><div className="timer-presets">{[5, 15, 25].map(n => <button disabled={busy || !online || !snapshot?.grant || snapshot.paused} key={n} onClick={() => void send(`timer ${n} minutes`)}>{n}<span>MIN</span></button>)}</div>
          {timers.length === 0 ? <div className="timer-idle">No timer running<span>Choose a duration to begin.</span></div> : timers.map(t => <div className="timer-row" key={t.id}><div><span>{t.title}</span><strong>{countdown(t)}</strong></div><button disabled={busy || !online} className="quiet" onClick={() => void act({ type: 'item.complete', id: t.id })} aria-label={`Cancel ${t.title}`}>Cancel</button></div>)}<p className="card-footer">{__JARVIS_DEMO__ ? 'SAMPLE TIMER · RESETS ON RELOAD' : 'SAVED LOCALLY · RESUMES AFTER RESTART'}</p></section></WidgetBoundary>,
      system: <>{snapshot && !__JARVIS_DEMO__ && <section className="card recovery-card" aria-label="Backup and recovery"><h2>Backup & recovery</h2>
          <p>{!snapshot.recovery.configured ? 'Backups are not configured. Use the backup guide to choose a separate recovery location.' : snapshot.recovery.lastBackupAt ? `Last backup: ${timeLabel(snapshot.recovery.lastBackupAt)}` : 'Recovery location configured. Create your first encrypted backup from the terminal.'}</p>
          {snapshot.recovery.configured && snapshot.recovery.deletionSync === 'pending' && <p className="warning-panel" role="status">Backup cleanup is pending. Deleted items are hidden here, but older backups are not yet safe to restore. Reconnect the recovery drive and keep JARVIS running.</p>}
          <p>{snapshot.automaticBackups.state === 'off' ? 'Automatic backups are off for this session.' : snapshot.automaticBackups.state === 'running' ? 'Creating and verifying an automatic backup…' : snapshot.automaticBackups.state === 'attention' ? 'Automatic backup needs attention. Check the recovery drive, free space and host clock. A retry is scheduled.' : 'Automatic daily backups are enabled for this session.'}</p>
          {snapshot.automaticBackups.nextAttemptAt && <p>Next backup check: {timeLabel(snapshot.automaticBackups.nextAttemptAt, 'UTC')} (UTC)</p>}
          {snapshot.recovery.deletionSync === 'synced' && <p>Deletion journal synchronized. Keep this recovery location current when restoring.</p>}
        </section>}<section className="card system-card"><div className="card-heading"><h2>System at a glance</h2><span className={`dot ${online ? '' : 'warning'}`}/></div><dl><div><dt>{__JARVIS_DEMO__ ? 'Browser simulation' : 'Core & storage'}</dt><dd>{online && snapshot ? 'Ready' : 'Unavailable'}</dd></div><div><dt>Microphone</dt><dd>{__JARVIS_DEMO__ ? 'Manual browser test' : snapshot?.services.voice === 'configured' ? 'Manual voice capture' : 'Manual test below'}</dd></div><div><dt>AI model</dt><dd>Not installed</dd></div><div><dt>External services</dt><dd>On request · Gmail, YouTube, weather</dd></div><div><dt>Unsolicited suggestions</dt><dd>Off</dd></div></dl><button className="text-button" onClick={() => setShowPresence(!showPresence)}>{showPresence ? 'Hide' : 'Open'} sensor simulator <Icon kind="arrow"/></button>
          {showPresence && <div className="simulation"><span className="tag">SYNTHETIC DATA</span><p>Test room: <strong>{snapshot?.presence.state ?? 'unknown'}</strong></p><div>{(['occupied', 'vacant', 'unknown'] as const).map(state => <button disabled={busy || !online} key={state} onClick={() => void run({ state }, 'synthetic-presence')}>{state}</button>)}</div><small>Expires after 30 seconds. No real sensor, identity inference or recording.</small></div>}
          </section></>,
      activity: <section id="activity" className="card activity"><div className="card-heading"><h2>Recent activity</h2><span className="tag">METADATA ONLY</span></div><div className="activity-list">{snapshot?.audit.map((a, i) => <div key={`${a.at}-${i}`}><span className={`dot ${a.decision === 'denied' ? 'warning' : ''}`}/><strong>{a.action.replaceAll('.', ' ')}</strong><span>{a.decision}</span><time>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(a.at)}</time></div>)}</div><p className="fineprint">Task titles and command text are excluded from the audit log.</p></section>,
      microphone: <>{online && snapshot?.grant && !snapshot.paused && (__JARVIS_DEMO__ || snapshot.services.voice !== 'configured') ? <><div id="browser-voice-controls"/>{activePanel === 'microphone' && <MicrophoneTest onActivity={setMicActivity} publicPreview={__JARVIS_DEMO__}/>}</> : snapshot?.services.voice === 'configured' ? <div id="speech-controls"/> : <p>Microphone unavailable. Check connection and workspace permission in Controls.</p>}</>,
      email: activePanel === 'email' && online && snapshot?.grant && !snapshot.paused ? <EmailPanel api={api} onSpeaking={setEmailSpeaking}/> : <p>Resume workspace access to use email.</p>,
      calendar: <section className="card"><h2>Calendar</h2><p className="muted">Local reminders · external calendar not connected</p>{tasks.filter(t => t.dueAt && t.state === 'active').sort((a,b) => a.dueAt! - b.dueAt!).map(t => <div className="notice" key={t.id}><div><strong>{t.title}</strong><small>{timeLabel(t.dueAt!, t.timezone)} · {t.timezone}</small></div></div>)}{!tasks.some(t => t.dueAt && t.state === 'active') && <p>No upcoming local reminders.</p>}<button onClick={() => setActivePanel('tasks')}>Manage reminders</button></section>,
      weather: activePanel === 'weather' && snapshot?.grant && !snapshot.paused ? <WeatherPanel/> : <p>Resume workspace access to use weather.</p>,
      music: activePanel === 'music' && snapshot?.grant && !snapshot.paused ? <MusicPanel/> : <p>Resume workspace access to use music.</p>,
      presence: <section className="card"><h2>Presence</h2><p>Sensor state: <strong>{snapshot?.presence.state ?? 'unknown'}</strong></p><span className="tag">SYNTHETIC DATA</span><p>No physical sensor or identity recognition is connected. Presence cannot identify a person or grant access.</p><button onClick={() => { setShowPresence(true); setActivePanel('system'); }}>Open sensor simulator</button></section>,
      home: <section className="card"><h2>Home controls</h2><p className="warning-panel">No home devices connected.</p><p>Future lights and room controls will require explicit device permissions. This widget cannot control your home yet.</p></section>,
      camera: <section className="card"><h2>Camera</h2><p className="warning-panel">Camera access is off.</p><p>No camera stream is requested or recorded. Camera integration needs a separate permission design.</p></section>,
      help: <section className="card"><h2>Your floating workspace</h2><p>Tap an icon to open its tool. Drag it anywhere, or focus it and use the arrow keys. Double-click or double-tap the icon to hide it. Delete also hides a focused icon. The circular restore button brings every icon back.</p><p>Tap the center to preview the voice waves. The preview is silent. With local speech configured, the center responds to the actual output audio.</p><p>{__JARVIS_DEMO__ ? 'This is a sample preview. Changes reset on reload. Microphone testing is optional and stays in this browser. No email account, AI model or physical sensor is connected.' : 'Runs on your PC. Device voice testing is available without Piper. Voice commands require local Whisper and Piper; capture is always explicit. Gmail connects only after your authorization and local Google setup.'}</p><p>Try “open email”, “open tasks”, “open timers”, or “close panel” in Commands. Reviewed local voice transcripts can use these same commands.</p><a href="https://github.com/danielsantos2310/jarvis">Project on GitHub</a></section>,
    }}>
    <dialog ref={controlRef} onCancel={event => { event.preventDefault(); setControls(false); }} onClose={event => { if (!event.currentTarget.open) setControls(false); }} aria-labelledby="controls-title"><div className="card-heading"><h2 id="controls-title">Workspace controls</h2><button className="quiet" onClick={() => setControls(false)} aria-label="Close controls">×</button></div><p>Stop pauses new items and reminder delivery. Saved items remain available to inspect and remove.</p><button className="danger" disabled={busy || snapshot?.paused} onClick={() => void run({ change: 'stop' }, 'control')}>Pause actions & delivery</button>
      <Form noValidate key={controls ? 'open' : 'closed'} onSubmit={async e => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); if (await run({ change: data.get('change'), password: data.get('password') }, 'control')) { form.reset(); setControls(false); } }}>{!__JARVIS_DEMO__ && <label>Confirm with your password<PasswordInput aria-label="Confirm with your password" name="password" required autoComplete="current-password" minLength={12} maxLength={128}/></label>}<label>Change<select aria-label="Change" name="change"><option value="resume">Resume actions & delivery</option><option value="revoke">Revoke local workspace permission</option><option value="grant">Restore local workspace permission</option></select></label><button className="primary wide" disabled={busy}>Apply change</button></Form>
      {error && <p className="error" role="alert">{error}</p>}<p className="fineprint">{__JARVIS_DEMO__ ? 'These controls affect this sample preview only. No password is needed.' : 'No external tools or permission changes through chat are available. Password recovery is performed from your local terminal.'}</p>
    </dialog>
  </FloatingWorkspace>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
