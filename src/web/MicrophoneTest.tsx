import { useEffect, useRef, useState } from 'react';
import { clapDetector } from './preview-voice.ts';

/** Short, explicit, in-memory input check. No recording or transmission. */
export function MicrophoneTest({ publicPreview = false, onActivity, onClap, disabled = false }: { publicPreview?: boolean; onActivity?:(value:{listening:boolean;level:number;requesting?:boolean})=>void; onClap?:()=>void; disabled?:boolean }) {
  const [state,setState] = useState<'off'|'requesting'|'listening'>('off');
  const [level,setLevel] = useState(0);
  const [message,setMessage] = useState('Microphone is off.');
  useEffect(()=>{onActivity?.({listening:state === 'listening',level,requesting:state === 'requesting'});},[state,level,onActivity]);
  useEffect(()=>()=>onActivity?.({listening:false,level:0}),[onActivity]);
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
  async function start(clap = false) {
    if (state !== 'off' || disabled) return;
    if (!navigator.mediaDevices?.getUserMedia) { setMessage('Microphone access is unavailable in this browser. Open this page directly over HTTPS, or use the local app in a supported browser.'); return; }
    const attempt = ++generation.current; setState('requesting'); setMessage('Waiting for your microphone permission. You can cancel at any time.');
    let stream: MediaStream | undefined; let context: AudioContext | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      if (attempt !== generation.current) { stream.getTracks().forEach(t=>t.stop()); return; }
      const tracks = stream.getAudioTracks();
      if (!tracks.length) throw new Error('No audio track');
      context = new AudioContext();
      const source = context.createMediaStreamSource(stream); const analyser = context.createAnalyser();
      analyser.fftSize=clap ? 1024 : 256; source.connect(analyser); // Never connect input to speakers.
      const samples = new Uint8Array(analyser.fftSize);
      const detect = clapDetector();
      let lastMeter = 0;
      const timer = window.setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum,n)=>sum+((n-128)/128)**2,0)/samples.length);
        const time = performance.now();
        if (time-lastMeter >= 100) {setLevel(Math.min(100,Math.round(rms*300)));lastMeter=time;}
        if (clap && detect(rms,Math.max(...samples.map(n=>Math.abs(n-128)))/128,time)) {
          stop('Clap-like sound detected. Microphone is off; greeting requested.');
          onClap?.();
        }
      },clap ? 20 : 100);
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
      setState('listening'); setMessage(clap ? 'Clap greeting armed for 30 seconds. Wait quietly for a moment, then clap once. Other sharp noises may also trigger it.' : 'Listening for input level only. Stops automatically after 30 seconds.');
    } catch (error) {
      stream?.getTracks().forEach(t=>t.stop());
      if (context && context.state !== 'closed') void context.close().catch(()=>{});
      if (attempt !== generation.current) return;
      stop((error as {name?:string}).name === 'NotAllowedError'
        ? 'Microphone permission was denied. Nothing is listening. You can change browser permissions and try again.'
        : 'Could not start the microphone. Check your input device and browser permissions.');
    }
  }
  return <section id="microphone-test" className="card microphone-test" aria-label="Microphone test">
    <div className="card-heading"><h2>Microphone lab</h2><span className="tag">{state === 'listening' ? 'MIC ACTIVE' : state === 'requesting' ? 'PERMISSION' : 'MIC OFF'}</span></div>
    <p className="muted">Test your default microphone for 30 seconds. Audio is processed only in this tab: no recording, upload, transcription or identity recognition.</p>
    <meter min="0" max="100" value={level} aria-label="Microphone input level"/>
    <p role="status">{message}</p>
    {state === 'off' ? <><button disabled={disabled} onClick={()=>void start()}>Start microphone test</button>{onClap && <button disabled={disabled} onClick={()=>void start(true)}>Enable clap greeting</button>}</> : <button className="danger" onClick={()=>stop()}>{state === 'requesting' ? 'Cancel microphone request' : 'Stop microphone'}</button>}
    <p className="fineprint">{publicPreview ? 'Stops when you hide this tab, reset the demo, pause actions or revoke demo access.' : 'Stops when you hide this tab, lock the workspace, pause actions or revoke access.'} {onClap ? 'Clap greeting is a local sound test, not identity recognition. It cannot wake a closed tab or locked phone; enable it again for another test.' : 'Presence and clap activation are not connected yet.'}</p>
  </section>;
}
