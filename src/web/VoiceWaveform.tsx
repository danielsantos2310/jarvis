import { useEffect, useRef, useState } from 'react';

/** Output visualization only. Pass the speech player's analyser and playing state;
 * this component never opens a microphone, plays audio, or connects to a server. */
export function VoiceWaveform({ analyser, speaking = false, connected = false }: { analyser?: AnalyserNode; speaking?: boolean; connected?: boolean }) {
  const [preview, setPreview] = useState(false);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const active = speaking || preview;
  useEffect(() => {
    if (!preview) return;
    const timer = setTimeout(() => setPreview(false), 8000);
    const hide = () => { if (document.hidden) setPreview(false); };
    document.addEventListener('visibilitychange', hide);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', hide); };
  }, [preview]);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const data = analyser ? new Uint8Array(analyser.fftSize) : null;
    let frame = 0, last = 0;
    const draw = (time: number) => {
      const reduced = preference.matches;
      if (time - last >= 32 || !active || reduced) {
        last = time;
        if (active && analyser && data) analyser.getByteTimeDomainData(data);
        paths.current.forEach((path, layer) => {
          const points = Array.from({ length: 121 }, (_, i) => {
            const x = i * 5, envelope = Math.pow(Math.sin(Math.PI * i / 120), 1.5);
            const sample = data && speaking ? (data[Math.floor(i / 120 * (data.length - 1))]! - 128) / 128
              : Math.sin(i * .19 + time / 240 + layer * .8) * Math.sin(i * .053 - time / 710);
            const y = 48 + (active ? sample * envelope * (32 - layer * 7) : 0);
            return `${i ? 'L' : 'M'}${x},${y.toFixed(2)}`;
          }).join(' ');
          path?.setAttribute('d', points);
        });
      }
      if (active && !reduced && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const restart = () => { cancelAnimationFrame(frame); draw(0); };
    preference.addEventListener('change', restart);
    document.addEventListener('visibilitychange', restart);
    draw(0);
    return () => { cancelAnimationFrame(frame); preference.removeEventListener('change', restart); document.removeEventListener('visibilitychange', restart); };
  }, [active, analyser, speaking]);
  return <section className={`voice-output ${active ? 'voice-output-active' : ''}`} aria-label="JARVIS voice visualization">
    <div className="voice-output-heading"><span>VOICE OUTPUT</span><span role="status">{speaking ? 'JARVIS speaking' : preview ? 'Waveform preview · silent' : connected ? 'Standby · microphone off' : 'Standby · speech not connected'}</span></div>
    <svg viewBox="0 0 600 96" preserveAspectRatio="none" aria-hidden="true">
      <path className="voice-baseline" d="M0 48H600"/>
      {[0, 1, 2].map(layer => <path key={layer} ref={element => { paths.current[layer] = element; }} className={`voice-wave voice-wave-${layer}`} d="M0 48H600"/>)}
    </svg>
    <div className="voice-output-footer"><span>{preview ? 'Design preview only — no audio or microphone' : 'Cyan waves will follow JARVIS’s voice'}</span><button type="button" disabled={speaking} aria-pressed={preview} onClick={() => setPreview(value => !value)}>{preview ? 'Stop preview' : 'Preview waves'}</button></div>
  </section>;
}
