import { useEffect, useRef, useState } from 'react';
import { VoiceWaveform } from './VoiceWaveform.tsx';
type Phase = 'idle' | 'permission' | 'listening' | 'transcribing' | 'synthesizing' | 'speaking';
const voiceErrors: Record<string, string> = {
  VOICE_DISABLED: 'Start the local core with --voice to enable speech.', VOICE_UNAVAILABLE: 'Speech engine unavailable. Start Whisper and Piper, then check engines.',
  VOICE_TIMEOUT: 'The speech engine took too long. Try a shorter phrase.', VOICE_BUSY: 'A voice request is already running. Try again shortly.',
  VOICE_PROTOCOL_ERROR: 'The speech engine returned unsupported audio or a malformed response.', VOICE_INCOMPLETE: 'The speech engine disconnected before finishing.',
  LOGIN_REQUIRED: 'Your session ended. Unlock the workspace again.', ACTIONS_PAUSED: 'Actions are paused.', LOCAL_GRANT_REQUIRED: 'Workspace permission was revoked.',
};
export function SpeechPanel({ csrf, onTranscript, reply }: { csrf: string; onTranscript: (text: string) => void; reply: string }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState({ stt: false, tts: false });
  const [message, setMessage] = useState('Check the local engines before speaking.');
  const [analyser, setAnalyser] = useState<AnalyserNode>();
  const generation = useRef(0), cleanup = useRef<() => void>(() => {});
  const finishCapture = useRef<() => void>(() => {});
  function stop(note = 'Voice stopped. Microphone is off.') {
    generation.current++; cleanup.current(); cleanup.current = () => {}; finishCapture.current = () => {};
    setAnalyser(undefined); setPhase('idle'); setMessage(note);
  }
  useEffect(() => {
    const hide = () => { if (document.hidden) stop('Voice stopped because this tab is hidden.'); };
    const leave = () => stop();
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', leave);
    return () => { generation.current++; cleanup.current(); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', leave); };
  }, []);
  async function request(path: string, signal: AbortSignal, body?: unknown) {
    const response = await fetch(`/api/voice/${path}`, { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(65000)]), headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf } : {}, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) { const data = await response.json(); throw new Error(voiceErrors[data.error] ?? 'Voice request failed. Check the local engines and try again.'); }
    return response;
  }
  async function check() {
    const at = ++generation.current; const controller = new AbortController(); cleanup.current = () => controller.abort();
    setPhase('synthesizing'); setMessage('Checking local speech engines…');
    try {
      const data = await (await request('status', controller.signal)).json();
      if (at !== generation.current) return;
      setStatus(data); stop(data.stt && data.tts ? 'Both engines responded. Ready for an English voice test.' : 'One or both engines are unavailable. See the local voice setup guide.');
    } catch (e) { if (at === generation.current) stop((e as Error).message); }
  }
  async function record() {
    const at = ++generation.current; let stream: MediaStream | undefined, context: AudioContext | undefined;
    setPhase('permission'); setMessage('Waiting for microphone permission…');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false });
      if (at !== generation.current) { stream.getTracks().forEach(t => t.stop()); return; }
      context = new AudioContext({ sampleRate: 16000 });
      const activeContext = context, activeStream = stream;
      cleanup.current = () => { activeStream.getTracks().forEach(t => t.stop()); void activeContext.close().catch(() => {}); };
      await context.audioWorklet.addModule('/voice-capture.js');
      if (at !== generation.current) return;
      const source = context.createMediaStreamSource(stream), node = new AudioWorkletNode(context, 'jarvis-capture');
      // A zero-gain output keeps the worklet running without monitoring the mic.
      const silence = context.createGain(); silence.gain.value = 0;
      source.connect(node); node.connect(silence); silence.connect(context.destination);
      let chunks: Float32Array[] = [], samples = 0, finished = false;
      node.port.onmessage = event => {
        if (at !== generation.current || finished) return;
        const chunk = event.data as Float32Array;
        if (samples + chunk.length <= activeContext.sampleRate * 30) { chunks.push(chunk); samples += chunk.length; }
      };
      const release = () => {
        clearTimeout(timer); node.port.onmessage = null; node.port.close(); source.disconnect(); node.disconnect(); silence.disconnect();
        activeStream.getTracks().forEach(t => t.stop()); void activeContext.close().catch(() => {});
      };
      const finish = async () => {
        if (finished || at !== generation.current) return; finished = true;
        release(); finishCapture.current = () => {};
        const input = new Float32Array(samples); let offset = 0;
        for (const chunk of chunks) { input.set(chunk, offset); offset += chunk.length; } chunks = [];
        const count = Math.min(480000, Math.floor(samples * 16000 / activeContext.sampleRate));
        if (count < 1600) { stop('Too little audio. Please speak for at least a second.'); return; }
        const pcm = new Uint8Array(count * 2), view = new DataView(pcm.buffer);
        for (let i = 0; i < count; i++) {
          const position = i * activeContext.sampleRate / 16000, index = Math.floor(position), fraction = position - index;
          const value = Math.max(-1, Math.min(1, input[index] * (1 - fraction) + (input[index + 1] ?? input[index]) * fraction));
          view.setInt16(i * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
        }
        input.fill(0);
        let binary = ''; for (let i = 0; i < pcm.length; i += 8192) binary += String.fromCharCode(...pcm.subarray(i, i + 8192));
        pcm.fill(0);
        const controller = new AbortController(); cleanup.current = () => controller.abort();
        setPhase('transcribing'); setMessage('Microphone off. Transcribing on this PC…');
        try {
          const data = await (await request('transcribe', controller.signal, { pcm: btoa(binary) })).json(); binary = '';
          if (at !== generation.current) return;
          if (data.text) onTranscript(data.text);
          stop(data.text ? 'Review the words in Ask JARVIS, then press Send. Nothing has been executed yet.' : 'No speech recognised. Try again or type your command.');
        } catch (e) { if (at === generation.current) stop((e as Error).message); }
      };
      const timer = setTimeout(() => void finish(), 30000);
      finishCapture.current = () => void finish();
      cleanup.current = () => { finished = true; release(); chunks = []; };
      stream.getAudioTracks().forEach(track => track.addEventListener('ended', () => { if (at === generation.current && !finished) stop('Microphone disconnected. Capture discarded.'); }, { once: true }));
      await context.resume();
      if (at !== generation.current) return;
      setPhase('listening'); setMessage('Listening · up to 30 seconds. Finish to transcribe; Stop discards the recording.');
    } catch (e) {
      stream?.getTracks().forEach(t => t.stop()); if (context?.state !== 'closed') void context?.close().catch(() => {});
      if (at === generation.current) stop((e as { name?: string }).name === 'NotAllowedError' ? 'Microphone permission denied. You can still type.' : 'Could not start capture. Check the microphone and browser support.');
    }
  }
  async function speak(text: string) {
    const at = ++generation.current, controller = new AbortController();
    // Create/resume on the click to comply with browser autoplay policy.
    let context: AudioContext | undefined, source: AudioBufferSourceNode | undefined;
    cleanup.current = () => { controller.abort(); if (source) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); } void context?.close().catch(() => {}); };
    setPhase('synthesizing'); setMessage('Microphone off. Generating a spoken reply on this PC…');
    try {
      context = new AudioContext();
      await context.resume();
      const audio = await (await request('speak', controller.signal, { text })).arrayBuffer();
      if (at !== generation.current) return;
      const buffer = await context.decodeAudioData(audio);
      if (at !== generation.current) return;
      source = context.createBufferSource(); source.buffer = buffer;
      const meter = context.createAnalyser(); meter.fftSize = 256;
      source.connect(meter); meter.connect(context.destination); setAnalyser(meter);
      source.onended = () => { if (at === generation.current) stop('Reply finished. Microphone remains off.'); };
      setPhase('speaking'); setMessage('JARVIS is speaking. The waves follow the actual output audio.'); source.start();
    } catch (e) { if (at === generation.current) stop((e as Error).message); }
  }
  return <section className="speech-panel" aria-label="Local voice session">
    <VoiceWaveform analyser={analyser} speaking={phase === 'speaking'} connected={status.tts}/>
    <div className="card microphone-test">
      <div className="card-heading"><h2>Talk to JARVIS</h2><span className="tag">{phase === 'listening' ? 'MIC ACTIVE' : 'MIC OFF'}</span></div>
      <p className="muted">English · local Whisper + Piper. Audio is held temporarily in memory and sent only to this PC. Review recognised words before sending. Spoken replies are audible to people nearby.</p>
      <p>Whisper: {status.stt ? 'responded' : 'not checked / unavailable'} · Piper: {status.tts ? 'responded' : 'not checked / unavailable'}</p>
      <p role="status">{message}</p>
      <div className="speech-buttons">
        <button disabled={phase !== 'idle'} onClick={() => void check()}>Check voice engines</button>
        <button disabled={phase !== 'idle' || !status.stt} onClick={() => void record()}>Start voice capture</button>
        <button disabled={phase !== 'idle' || !status.tts} onClick={() => void speak('Hello Daniel. Your local JARVIS voice connection is working.')}>Test spoken voice</button>
        <button disabled={phase !== 'idle' || !status.tts || !reply} onClick={() => void speak(reply.slice(0, 500))}>Read latest reply aloud</button>
        {phase === 'listening' && <button className="primary" onClick={() => finishCapture.current()}>Finish and transcribe</button>}
        {phase !== 'idle' && <button className="danger" onClick={() => stop()}>Stop voice</button>}
      </div>
      <p className="fineprint">No automatic listening, voice identification or Echo connection. Hide this tab or lock the workspace to stop. Text commands remain available.</p>
    </div>
  </section>;
}
