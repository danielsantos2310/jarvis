import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { VoiceWaveform } from './VoiceWaveform.tsx';
const key = (voice: SpeechSynthesisVoice) => `${voice.voiceURI}:${voice.lang}`;
export function BrowserVoice({ controlsOpen, reply }: {controlsOpen:boolean;reply:string}) {
  const [target,setTarget] = useState<HTMLElement | null>(null), [voices,setVoices] = useState<SpeechSynthesisVoice[]>([]), [selected,setSelected] = useState('');
  const [rate,setRate] = useState(1), [speaking,setSpeaking] = useState(false), [busy,setBusy] = useState(false), [note,setNote] = useState('Choose a device voice, then test it.');
  const utterance = useRef<SpeechSynthesisUtterance | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supported = typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
  function clear() { if(timer.current) clearTimeout(timer.current); timer.current=null; const current=utterance.current; utterance.current=null; if(current) {current.onstart=null;current.onend=null;current.onerror=null; speechSynthesis.cancel();} }
  function stop(message='Voice stopped.') {clear();setBusy(false);setSpeaking(false);setNote(message);}
  function refresh() {
    if(!supported) return;
    try {const local=speechSynthesis.getVoices().filter(v=>v.localService);setVoices(local);setSelected(old=>local.some(v=>key(v)===old)?old:keyOrEmpty(local.find(v=>v.lang.toLowerCase()==='en-gb') ?? local.find(v=>v.lang.startsWith('en')) ?? local[0]));}
    catch {setNote('Could not load device voices. Retry or restart your browser.');}
  }
  function keyOrEmpty(voice?:SpeechSynthesisVoice) {return voice?key(voice):'';}
  useEffect(() => {
    setTarget(document.getElementById('browser-voice-controls'));refresh();
    if(!supported) return;
    const visibility=()=>{if(document.hidden) stop('Voice stopped because the tab is hidden.');};
    speechSynthesis.addEventListener('voiceschanged',refresh);document.addEventListener('visibilitychange',visibility);
    return ()=>{clear();speechSynthesis.removeEventListener('voiceschanged',refresh);document.removeEventListener('visibilitychange',visibility);};
  }, []);
  useEffect(()=>{if(!controlsOpen) stop();},[controlsOpen]);
  function speak(text:string) {
    if(!supported || busy || !controlsOpen || document.hidden) return;
    const voice=speechSynthesis.getVoices().find(v=>v.localService && key(v)===selected);
    if(!voice) {setNote('That local voice is unavailable. Refresh the voice list.');return;}
    clear();const next=new SpeechSynthesisUtterance(text.slice(0,500));utterance.current=next;next.voice=voice;next.lang=voice.lang;next.rate=rate;
    setBusy(true);setNote('Starting device voice…');
    const finish=(message:string)=>{if(utterance.current!==next)return;stop(message);};
    next.onstart=()=>{if(utterance.current!==next)return;if(timer.current)clearTimeout(timer.current);setSpeaking(true);setNote('Speaking with your device voice.');timer.current=setTimeout(()=>finish('Voice stopped at the 45-second limit.'),45000);};
    next.onend=()=>finish('Voice test finished.');next.onerror=()=>finish('The device could not play this voice. Try another voice or restart the browser.');
    timer.current=setTimeout(()=>finish('The voice did not start. Try another installed voice.'),8000);
    try {speechSynthesis.speak(next);} catch {finish('Speech playback failed. Try another installed voice.');}
  }
  return <><VoiceWaveform speaking={speaking} connected={voices.length>0} illustrative/>{target && createPortal(<section className="card browser-voice" aria-label="Device voice test"><h2>Test a device voice</h2><p>Use a local Windows or device voice now—no API key, Piper installation or microphone needed. Only voices the browser reports as local are listed.</p>
    {!supported ? <p role="status">Speech playback is unavailable in this browser. Try an up-to-date Edge or Chrome on Windows.</p> : <>
      <label>Device voice<select value={selected} onChange={e=>setSelected(e.target.value)} disabled={busy || !voices.length}>{!voices.length && <option value="">No local voices available</option>}{voices.map(v=><option key={key(v)} value={key(v)}>{v.name} · {v.lang}</option>)}</select></label>
      <label>Voice speed<select value={rate} onChange={e=>setRate(Number(e.target.value))} disabled={busy}><option value={0.85}>Relaxed</option><option value={1}>Normal</option><option value={1.15}>Brisk</option></select></label>
      <div className="speech-buttons"><button disabled={busy || !voices.length} onClick={()=>speak('Hello Daniel. Your JARVIS device voice test is ready. How can I help you today?')}>Test device voice</button><button disabled={busy || !voices.length || !reply.trim()} onClick={()=>speak(reply)}>Read latest reply on device</button><button disabled={!busy} onClick={()=>stop()}>Stop device voice</button><button disabled={busy} onClick={refresh}>Refresh device voices</button></div>
      <p role="status">{note}</p>{!voices.length && <p>Install a Windows text-to-speech voice, restart your browser, then refresh this list. Browser voice availability can differ from Windows Narrator.</p>}
    </>}
    <p className="fineprint">Waves animate with speech start/stop as an illustration; the browser does not give this test the audio samples. Piper will retain its actual audio-reactive waves. Closing this panel, hiding the tab, pausing or locking stops playback.</p>
    <a href="https://support.microsoft.com/en-gb/education/learning-accelerators/download-languages-and-voices-for-immersive-reader-read-mode-and-read-aloud" target="_blank" rel="noopener noreferrer">Install Windows speech voices</a>
  </section>,target)}</>;
}
