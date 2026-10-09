import { useContext, useEffect, useId, useRef } from 'react';
import type { RefObject } from 'react';
import { AvatarAttention } from './AvatarAttention.ts';
import { waveLoop } from './energy-loop.ts';

// Stable scattered starts avoid teleporting particles on every render.
const heads = Array.from({length:12}, (_,i) => ({
  layer: i * 7 % 18,
  offset: (Math.sin(i * 127.1 + 31.7) * 43758.5453) % 1 + 1,
  direction: i % 4 === 0 ? -1 : 1,
  pace: .8 + (i * .61803398875 % 1) * .4,
}));

/** Living light, not a solid object. Audio is measured only by VoiceWaveform. */
export function CoreDisplay({ energy, state }: { energy: RefObject<number>; state: 'idle' | 'listening' | 'thinking' | 'speaking' }) {
  const id = useId().replaceAll(':', '');
  const target = useContext(AvatarAttention);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const phase = useRef(0);
  const amplitude = useRef(0);
  const particles = useRef<(SVGGElement | null)[]>([]);
  const trails = useRef<(SVGPathElement | null)[]>([]);
  const root = useRef<HTMLDivElement | null>(null);
  const travel = useRef(0);
  const speed = useRef(.018);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = 0;
    const draw = (time: number) => {
      if (document.hidden) return;
      if (!last || time - last >= 40 || preference.matches) {
        const dt = last ? Math.min(80, time - last) : 40;
        last = time;
        const level = Number.isFinite(energy.current) ? Math.max(0, Math.min(1, energy.current)) : 0;
        amplitude.current += (level - amplitude.current) * (1 - Math.exp(-dt / (level > amplitude.current ? 110 : 280)));
        if (!preference.matches) phase.current += dt / 1000 * (state === 'thinking' ? 1.35 : state === 'speaking' ? .95 : .55);
        const attention = target ? Math.atan2(target.y - 48, target.x - 50) : undefined;
        paths.current.forEach((path, layer) => path?.setAttribute('d', waveLoop(layer, preference.matches ? 0 : phase.current, preference.matches ? 0 : amplitude.current, preference.matches ? undefined : attention)));
        const desiredSpeed = state === 'speaking' ? .09 + amplitude.current * .03 : state === 'thinking' ? .032 : .018;
        speed.current += (desiredSpeed - speed.current) * (1 - Math.exp(-dt / 450));
        if (!preference.matches) travel.current += dt / 1000 * speed.current;
        root.current?.setAttribute('data-orbit-speed', String(preference.matches ? 0 : speed.current));
        heads.forEach((head, i) => {
          const path = paths.current[head.layer];
          if (!path) return;
          const length = path.getTotalLength();
          const position = head.offset + (preference.matches ? 0 : travel.current) * head.direction * head.pace;
          const pointAt = (fraction:number) => path.getPointAtLength(((fraction % 1 + 1) % 1) * length);
          const point = pointAt(position);
          particles.current[i]?.setAttribute('transform', `translate(${point.x} ${point.y})`);
          trails.current[i]?.setAttribute('d', Array.from({length:8}, (_,j) => {
            const p = pointAt(position - head.direction * j * .0025);
            return `${j ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
          }).join(' '));
        });
      }
      if (!preference.matches) frame = requestAnimationFrame(draw);
    };
    const restart = () => { cancelAnimationFrame(frame); last = 0; draw(0); };
    preference.addEventListener('change', restart);
    document.addEventListener('visibilitychange', restart);
    restart();
    return () => { cancelAnimationFrame(frame); preference.removeEventListener('change', restart); document.removeEventListener('visibilitychange', restart); };
  }, [energy, state, target]);
  return <div ref={root} className="core-display energy-core living-core" aria-hidden="true" data-focused={!!target}>
    <svg viewBox="0 0 360 360" fill="none" focusable="false">
      <defs>
        <filter id={`${id}-soft`} x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="2.4"/></filter>
        {Array.from({ length: 18 }, (_, layer) => <path key={layer} id={`${id}-strand-${layer}`} ref={node => { paths.current[layer] = node; }} d={waveLoop(layer, 0, 0)}/>)}
      </defs>
      <g className="living-breath">
        <g className="living-haze" filter={`url(#${id}-soft)`} strokeWidth="3" opacity=".35">
          {[0, 4, 8, 12, 16].map(layer => <use key={layer} href={`#${id}-strand-${layer}`} stroke={layer % 8 === 0 ? 'var(--energy-cyan)' : 'var(--energy-blue)'}/>)}
        </g>
        <g className="living-strands" strokeLinecap="round" strokeLinejoin="round">
          {Array.from({ length: 18 }, (_, layer) => <use key={layer} href={`#${id}-strand-${layer}`} stroke={layer % 5 === 0 ? 'var(--energy-ice)' : layer % 2 ? 'var(--energy-blue)' : 'var(--energy-cyan)'} strokeWidth={layer % 5 === 0 ? 1.1 : layer % 3 === 0 ? .75 : .4} opacity={layer % 5 === 0 ? .85 : layer % 3 === 0 ? .5 : .28}/>)}
        </g>
        <g className="living-trails" stroke="var(--energy-cyan)" strokeWidth=".85" strokeLinecap="round" opacity=".55">
          {heads.map((_,i)=><path key={i} ref={node=>{trails.current[i]=node;}}/>)}
        </g>
        <g className="living-heads" fill="var(--energy-cyan)">
          {heads.map((_,i)=><g key={i} ref={node=>{particles.current[i]=node;}} className="living-head" opacity={.72 + i%3*.12}>
            <circle r="3" opacity=".16"/><circle r={i%3===0?1.5:1.15}/><circle r=".5" fill="var(--energy-ice)"/>
          </g>)}
        </g>
      </g>
    </svg>
  </div>;
}
