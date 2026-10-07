import { CoreDisplay } from './CoreDisplay.tsx';
import { useEffect, useRef, useState } from 'react';

/** Output visualization only. Pass the speech player's analyser and playing state;
 * this component never opens a microphone, plays audio, or connects to a server. */
export function VoiceWaveform({ analyser, speaking = false, connected = false, illustrative = false }: { analyser?: AnalyserNode; speaking?: boolean; connected?: boolean; illustrative?: boolean }) {
  const [hidden,setHidden] = useState(document.hidden);
  const [preview, setPreview] = useState(false);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const halo = useRef<SVGCircleElement | null>(null);
  const spokes = useRef<SVGPathElement | null>(null);
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
        const energy = active ? data && speaking ? Math.min(1, Math.sqrt(data.reduce((total, v) => total + ((v - 128) / 128) ** 2, 0) / data.length) * 4) : .35 + .25 * Math.sin(time / 170) : 0;
        halo.current?.setAttribute('r', String(135 + energy * 18));
        halo.current?.setAttribute('stroke-width', String(1 + energy * 3));
        spokes.current?.setAttribute('d', Array.from({ length: 80 }, (_, i) => {
          const angle = i / 80 * Math.PI * 2;
          const sample = data && speaking ? Math.abs((data[i % data.length] - 128) / 128) : Math.abs(Math.sin(i * .7 + time / 150));
          const inner = 151, outer = inner + 3 + (active ? sample * 23 + energy * 12 : 0);
          return `M${180 + Math.cos(angle) * inner},${180 + Math.sin(angle) * inner}L${180 + Math.cos(angle) * outer},${180 + Math.sin(angle) * outer}`;
        }).join(' '));
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
    const restart = () => { setHidden(document.hidden); cancelAnimationFrame(frame); draw(0); };
    preference.addEventListener('change', restart);
    document.addEventListener('visibilitychange', restart);
    draw(0);
    return () => { cancelAnimationFrame(frame); preference.removeEventListener('change', restart); document.removeEventListener('visibilitychange', restart); };
  }, [active, analyser, speaking]);
  return <section className={`voice-output ${hidden ? 'reactor-hidden' : ''} ${active ? 'voice-output-active' : ''}`} aria-label="JARVIS voice visualization">
    <div className="reactor-art"><svg className="orbital-waves" viewBox="0 0 600 600" aria-hidden="true">{[0,1,2,3].map(layer=><g key={layer} className={`orbital-wave orbital-wave-${layer}`}><path d={Array.from({length:241},(_,i)=>{const a=i/240*Math.PI*2;const r=218+layer*17+Math.sin(a*6+layer)*8+Math.sin(a*3-layer)*12;return `${i ? 'L' : 'M'}${300+Math.cos(a)*r},${300+Math.sin(a)*r}`;}).join(' ')+'Z'}/></g>)}</svg><CoreDisplay/><svg className="reactive-rings" viewBox="0 0 360 360" aria-hidden="true"><circle ref={halo} cx="180" cy="180" r="135"/><path ref={spokes}/></svg></div>
    <div className="voice-output-heading"><span>VOICE OUTPUT</span><span role="status">{speaking ? illustrative ? 'Device speaking · illustrative waves' : 'JARVIS speaking' : preview ? 'Waveform preview · silent' : connected ? 'Standby · microphone off' : 'Standby · speech not connected'}</span></div>
    <svg className="speech-wave" viewBox="0 0 600 96" preserveAspectRatio="none" aria-hidden="true">
      <path className="voice-baseline" d="M0 48H600"/>
      {[0, 1, 2].map(layer => <path key={layer} ref={element => { paths.current[layer] = element; }} className={`voice-wave voice-wave-${layer}`} d="M0 48H600"/>)}
    </svg>
    <div className="voice-output-footer"><span>{preview ? 'Design preview only — no audio or microphone' : 'Cyan waves will follow JARVIS’s voice'}</span><button className="reactor-preview" title={preview ? 'Stop silent wave preview' : 'Preview voice waves (silent)'} aria-label={preview ? 'Stop preview' : 'Preview waves'} type="button" disabled={speaking} aria-pressed={preview} onClick={() => setPreview(value => !value)}>{preview ? 'Stop preview' : 'Preview waves'}</button></div>
  </section>;
}
