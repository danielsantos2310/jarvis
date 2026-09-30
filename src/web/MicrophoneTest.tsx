import { useEffect, useRef, useState } from 'react';

/** Short, explicit, in-memory input check. No recording or transmission. */
export function MicrophoneTest() {
  const [state,setState] = useState<'off'|'requesting'|'listening'>('off');
  const [level,setLevel] = useState(0);
  const [message,setMessage] = useState('Microphone is off.');
  const generation = useRef(0);
  const cleanup = useRef<() => void>(() => {});
  function stop(message = 'Microphone is off.') {
    generation.current++; cleanup.current(); cleanup.current = () => {};
    setState('off'); setLevel(0); setMessage(message);
  }
  useEffect(() => {
    const hide = () => { if (document.hidden) stop('Microphone stopped because this tab is hidden.'); };
    const leave = () => stop();
    document.addEventListener('visibilitychange',hide); window.addEventListener('pagehide',leave);
    return () => { generation.current++; cleanup.current(); document.removeEventListener('visibilitychange',hide); window.removeEventListener('pagehide',leave); };
  },[]);
  async function start() {
    if (state !== 'off') return;
    if (!navigator.mediaDevices?.getUserMedia) { setMessage('Microphone access is unavailable in this browser. Use the local app in a supported browser.'); return; }
    const attempt = ++generation.current; setState('requesting'); setMessage('Waiting for your microphone permission. You can cancel at any time.');
    let stream: MediaStream | undefined; let context: AudioContext | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      if (attempt !== generation.current) { stream.getTracks().forEach(t=>t.stop()); return; }
      const tracks = stream.getAudioTracks();
      if (!tracks.length) throw new Error('No audio track');
      context = new AudioContext();
      const source = context.createMediaStreamSource(stream); const analyser = context.createAnalyser();
      analyser.fftSize=256; source.connect(analyser); // Never connect input to speakers.
      const samples = new Uint8Array(analyser.fftSize);
      const timer = window.setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum,n)=>sum+((n-128)/128)**2,0)/samples.length);
        setLevel(Math.min(100,Math.round(rms*300)));
      },100);
      const deadline = window.setTimeout(()=>stop('30-second test finished. Microphone is off.'),30000);
      const ended = () => stop('Microphone disconnected or permission ended.');
      tracks.forEach(t=>t.addEventListener('ended',ended));
      const activeContext = context; const activeStream = stream;
      cleanup.current = () => {
        clearInterval(timer); clearTimeout(deadline); source.disconnect(); analyser.disconnect();
        tracks.forEach(t=>t.removeEventListener('ended',ended)); activeStream.getTracks().forEach(t=>t.stop());
        void activeContext.close().catch(()=>{});
      };
      await context.resume();
      if (attempt !== generation.current) return;
      setState('listening'); setMessage('Listening for input level only. Stops automatically after 30 seconds.');
    } catch (error) {
      stream?.getTracks().forEach(t=>t.stop());
      if (context && context.state !== 'closed') void context.close().catch(()=>{});
      if (attempt !== generation.current) return;
      stop((error as {name?:string}).name === 'NotAllowedError'
        ? 'Microphone permission was denied. Nothing is listening. You can change browser permissions and try again.'
        : 'Could not start the microphone. Check your input device and browser permissions.');
    }
  }
  return <section className="card microphone-test" aria-label="Microphone test">
    <div className="card-heading"><h2>Microphone lab</h2><span className="tag">{state === 'listening' ? 'MIC ACTIVE' : state === 'requesting' ? 'PERMISSION' : 'MIC OFF'}</span></div>
    <p className="muted">Test your default microphone for 30 seconds. Audio is processed only in this tab: no recording, upload, transcription or identity recognition.</p>
    <meter min="0" max="100" value={level} aria-label="Microphone input level"/>
    <p role="status">{message}</p>
    {state === 'off' ? <button onClick={()=>void start()}>Start microphone test</button> : <button className="danger" onClick={()=>stop()}>{state === 'requesting' ? 'Cancel microphone request' : 'Stop microphone'}</button>}
    <p className="fineprint">Stops when you hide this tab, lock the workspace, pause actions or revoke access. Presence and clap activation are not connected yet.</p>
  </section>;
}
