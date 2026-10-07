import { useEffect, useRef, useState } from 'react';
import { BrowserVoice } from './BrowserVoice.tsx';
import { HudIcon } from './FloatingWorkspace.tsx';
type Message = { id: string; subject: string; from: string; date: string; excerpt: string; body?: string; truncated?: boolean };
type Api = <T>(path: string, body?: unknown, signal?: AbortSignal) => Promise<T>;
export function EmailPanel({ api, onSpeaking }: { api: Api; onSpeaking?:(value:boolean)=>void }) {
  const [status, setStatus] = useState<{configured:boolean;connected:boolean} | null>(null), [busy,setBusy] = useState(false), [error,setError] = useState('');
  const [messages,setMessages] = useState<Message[] | null>(null), [selected,setSelected] = useState<Message | null>(null), [full,setFull] = useState(false);
  const [account,setAccount] = useState('');
  const controller = useRef<AbortController | null>(null), generation = useRef(0);
  useEffect(() => { if (__JARVIS_DEMO__) return; const c = new AbortController(); void api<{configured:boolean;connected:boolean}>('gmail/status',undefined,c.signal).then(s => { if (!c.signal.aborted) setStatus(s); }).catch(e => { if (!c.signal.aborted) setError(e.message); }); return () => { c.abort(); generation.current++; controller.current?.abort(); }; }, []);
  async function run<T>(path: string, body: unknown | undefined, apply: (data:T) => void) {
    if (busy) return; controller.current?.abort(); const c = new AbortController(); controller.current = c; const id = ++generation.current; setBusy(true); setError('');
    try { const data = await api<T>(path,body,c.signal); if (id === generation.current && !c.signal.aborted) apply(data); }
    catch (e) { if (id === generation.current && !c.signal.aborted) setError((e as Error).message); }
    finally { if (id === generation.current && !c.signal.aborted) setBusy(false); }
  }
  const sample: Message = { id:'sample',subject:'Tomorrow’s project check-in',from:'Sample sender · no real email data',date:'',excerpt:'A sample invitation to review the project tomorrow at 10:00. No reply requested.',body:'Hello! This is a fictional example of an email. Let’s review the project tomorrow at 10:00. We can check the microphone and discuss the next steps. No reply is needed. — Sample sender' };
  const message = __JARVIS_DEMO__ ? sample : selected;
  return <section className="card email-panel"><HudIcon name="email"/><h2>Gmail</h2>
    {__JARVIS_DEMO__ ? <><p className="warning-panel">No email account connected.</p><p>Gmail connection runs in your local JARVIS. The public preview never receives your Google credentials or emails.</p><a href="https://mail.google.com/" target="_blank" rel="noopener noreferrer">Open Gmail</a></> : <>
      <p role="status">{status ? status.connected ? `Gmail connected · read-only · ${account || 'this session'}` : 'No email account connected.' : error ? 'Gmail status unavailable.' : 'Checking Gmail setup…'}</p>
      <button disabled={busy} onClick={() => void run<{configured:boolean;connected:boolean}>('gmail/status',undefined,data=>{setStatus(data);setAccount('');if(!data.connected){setMessages(null);setSelected(null);}})}>Check Gmail setup</button>
      {status?.connected && <button disabled={busy} onClick={() => void run<{emailAddress:string}>('gmail/profile',undefined,data=>setAccount(data.emailAddress))}>Verify connected Gmail account</button>}
      {!status?.connected && <><p>Authorize Google to let JARVIS read messages. No sending or deleting. Tokens stay in server memory and are cleared on lock, pause, permission revocation or restart.</p><button disabled={busy || !status?.configured} onClick={() => void run<{url:string}>('gmail/connect',{},data => { location.assign(data.url); })}>Connect Gmail — read-only</button>
      {status && !status.configured && <p className="warning-panel">Google setup is needed on your local server. Set JARVIS_GOOGLE_CLIENT_ID and JARVIS_GOOGLE_CLIENT_SECRET using your own Google Cloud OAuth application, then restart JARVIS. Never paste secrets into the public preview.</p>}</>}
      {status?.connected && <div className="speech-buttons"><button disabled={busy} onClick={() => void run<{messages:Message[]}>('gmail/inbox',undefined,data => { setMessages(data.messages); setSelected(null); setFull(false); })}>Load latest 10 emails</button><button disabled={busy} onClick={() => void run<{revoked:boolean}>('gmail/disconnect',{},data => { setMessages(null);setSelected(null);setAccount('');setStatus({configured:true,connected:false});if (!data.revoked) setError('Disconnected locally. Google revocation could not be confirmed; remove JARVIS from your Google account connections.'); })}>Disconnect Gmail</button></div>}
      {busy && <p role="status">Working with Google…</p>}{error && <p className="error" role="alert">{error}</p>}
      {messages?.length === 0 && <p>Your inbox is empty.</p>}
      <div className="service-list">{messages?.map(item => <button key={item.id} disabled={busy} onClick={() => {setSelected(item);setFull(false);}}><strong>{item.subject}</strong><small>{item.from}</small></button>)}</div>
    </>}
    {message && <div className="sample-email">{__JARVIS_DEMO__ && <span className="tag">FICTIONAL EXAMPLE</span>}<h3>{message.subject}</h3><p className="muted">{message.from}</p><small>{message.date}</small><div className="speech-buttons"><button aria-pressed={!full} onClick={() => setFull(false)}>{__JARVIS_DEMO__ ? 'Summary' : 'Preview'}</button><button disabled={busy} aria-pressed={full} onClick={() => { if (__JARVIS_DEMO__ || selected?.body !== undefined) setFull(true); else void run<Message>(`gmail/messages/${message.id}`,undefined,data => {setSelected(data);setFull(true);}); }}>Full message</button></div><p className="email-body" role="status">{full ? message.body : message.excerpt}</p><BrowserVoice key={`${message.id}-${full}`} embedded controlsOpen reply={`${message.subject}. From ${message.from}. ${full ? message.body ?? '' : message.excerpt}`} onSpeaking={onSpeaking}/>{message.truncated && full && <p>Long message shortened to 20,000 characters. Open Gmail for the rest.</p>}</div>}
    {!__JARVIS_DEMO__ && <p className="fineprint">Preview is Gmail’s excerpt, not an AI summary. No email content is sent to an AI model. <a href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer">Manage Google permissions</a></p>}
  </section>;
}
