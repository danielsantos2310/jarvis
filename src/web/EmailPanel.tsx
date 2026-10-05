import { useState } from 'react';
import { HudIcon } from './FloatingWorkspace.tsx';
/** A labelled interaction sample, never an inbox or an authorization grant. */
export function EmailPanel() {
  const [mode, setMode] = useState<'summary' | 'full'>('summary');
  return <section className="card email-panel"><HudIcon name="email"/><h2>Email</h2><p className="warning-panel">No email account connected.</p><p>When connected, JARVIS will request permission to read your email. You will be able to choose a summary or the full message. Sending and deleting will require separate permissions.</p>
    <div className="sample-email"><span className="tag">FICTIONAL EXAMPLE</span><h3>Tomorrow’s project check-in</h3><p className="muted">Sample sender · no real email data</p><div className="speech-buttons"><button aria-pressed={mode === 'summary'} onClick={() => setMode('summary')}>Summary</button><button aria-pressed={mode === 'full'} onClick={() => setMode('full')}>Full message</button></div><p role="status">{mode === 'summary' ? 'A sample invitation to review the project tomorrow at 10:00. No reply requested.' : 'Hello! This is a fictional example of an email. Let’s review the project tomorrow at 10:00. We can check the microphone and discuss the next steps. No reply is needed. — Sample sender'}</p></div>
    <p className="fineprint">Account connection and real email summaries are planned. This screen does not sign in, read messages or grant access.</p></section>;
}
