import { useContext, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import portrait from './assets/mira-avatar.webp';
import { AvatarAttention } from './AvatarAttention.ts';

type VisualState = 'idle' | 'listening' | 'thinking' | 'speaking';

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

/**
 * A local, 2.5D portrait. It uses no camera, microphone or network request:
 * browser voice and microphone owners pass their existing visual state/energy in.
 */
export function LivePortrait({ energy, state }: { energy: RefObject<number>; state: VisualState }) {
  const attention = useContext(AvatarAttention);
  const root = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const leftLid = useRef<HTMLSpanElement>(null);
  const rightLid = useRef<HTMLSpanElement>(null);
  const leftGlint = useRef<HTMLSpanElement>(null);
  const rightGlint = useRef<HTMLSpanElement>(null);
  const mouth = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const surface = root.current, hud = canvas.current;
    if (!surface || !hud) return;
    const context = hud.getContext('2d');
    if (!context) return;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = { x: 0, y: 0 };
    let faceX = 0, faceY = 0, gazeX = 0, gazeY = 0, mouthOpen = 0, mouthPulse = 0;
    let frame = 0, last = 0, width = 0, height = 0, dpr = 1;

    const resize = () => {
      const bounds = surface.getBoundingClientRect();
      width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
      dpr = Math.min(1.5, window.devicePixelRatio || 1, 900 / Math.max(width, height));
      hud.width = Math.round(width * dpr); hud.height = Math.round(height * dpr);
      hud.style.width = `${width}px`; hud.style.height = `${height}px`;
    };
    const observe = new ResizeObserver(resize); observe.observe(surface); resize();
    const move = (event: PointerEvent) => {
      pointer.x = clamp((event.clientX / window.innerWidth - .5) * 2, -1, 1);
      pointer.y = clamp((event.clientY / window.innerHeight - .5) * 2, -1, 1);
    };
    const pulse = () => { mouthPulse = 1; };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('jarvis-speech-boundary', pulse);

    const drawArc = (radius: number, from: number, to: number, lineWidth: number, color: string, blur = 0) => {
      context.beginPath(); context.arc(500, 500, radius, from, to); context.lineWidth = lineWidth;
      context.strokeStyle = color; context.shadowColor = color; context.shadowBlur = blur; context.stroke();
    };
    const render = (now: number) => {
      const elapsed = now / 1000;
      const isReduced = reduced.matches;
      const dt = last ? Math.min(80, now - last) : 33; last = now;
      const value = isReduced ? 0 : clamp(Number.isFinite(energy.current) ? energy.current : 0, 0, 1);
      const speaking = state === 'speaking';
      const targetX = attention ? clamp((attention.x - 50) / 50, -1, 1) * .35 : pointer.x;
      const targetY = attention ? clamp((attention.y - 50) / 50, -1, 1) * .2 : pointer.y;
      if (!isReduced) {
        faceX += (targetX * 14 - faceX) * .05; faceY += (targetY * 10 - faceY) * .05;
        gazeX += (targetX * 1.4 - gazeX) * .08; gazeY += (targetY * .6 - gazeY) * .08;
        mouthPulse *= .86;
      }
      const blinkPosition = isReduced ? 1 : (now % 3800) / 3800;
      const close = blinkPosition < 110 / 3800 ? Math.sin(blinkPosition / (110 / 3800) * Math.PI) : 0;
      const syllable = speaking && !isReduced ? .3 + .3 * Math.abs(Math.sin(elapsed * 13)) : 0;
      const targetMouth = Math.max(mouthPulse, syllable);
      mouthOpen += (targetMouth - mouthOpen) * .45;
      const scale = isReduced ? 1 : 1 + .008 * Math.sin(elapsed * 1.4) + value * .012 * Math.sin(elapsed * 6);
      const filter = state === 'thinking' ? 'saturate(1.3) hue-rotate(-8deg)' : state === 'speaking' ? 'brightness(1.22) saturate(1.2)' : state === 'listening' ? 'brightness(1.12) saturate(1.1)' : 'brightness(1) saturate(1)';
      face.current?.style.setProperty('transform', `translate(-50%, -50%) translate(${faceX.toFixed(2)}px, ${faceY.toFixed(2)}px) rotate(${(faceX * .06).toFixed(2)}deg) scale(${scale.toFixed(4)})`);
      face.current?.style.setProperty('filter', filter);
      [leftLid.current, rightLid.current].forEach(lid => lid?.style.setProperty('--blink', String(close)));
      [leftGlint.current, rightGlint.current].forEach(glint => {
        glint?.style.setProperty('--gaze-x', `${gazeX.toFixed(2)}%`);
        glint?.style.setProperty('--gaze-y', `${gazeY.toFixed(2)}%`);
        glint?.style.setProperty('opacity', String(1 - close));
      });
      mouth.current?.style.setProperty('height', `${(.6 + mouthOpen * 6.5).toFixed(2)}%`);
      mouth.current?.style.setProperty('opacity', `${(.6 + mouthOpen * .4).toFixed(2)}`);

      context.setTransform(dpr * width / 1000, 0, 0, dpr * height / 1000, 0, 0);
      context.clearRect(0, 0, 1000, 1000);
      const palette = state === 'thinking' ? '#53bcff' : state === 'speaking' ? '#87f4ff' : state === 'listening' ? '#65baff' : '#28d9f5';
      const glow = state === 'speaking' ? .85 : state === 'listening' ? .6 : state === 'thinking' ? .5 : .35;
      const halo = context.createRadialGradient(500, 500, 245, 500, 500, 435);
      halo.addColorStop(0, 'rgba(0, 0, 0, 0)'); halo.addColorStop(.72, `rgba(0, 200, 255, ${(.05 + glow * .08).toFixed(3)})`); halo.addColorStop(1, 'rgba(0, 200, 255, 0)');
      context.fillStyle = halo; context.fillRect(0, 0, 1000, 1000);
      context.save(); context.translate(500, 500); context.rotate((state === 'thinking' ? elapsed * 2.4 : elapsed * .25) * .15); context.translate(-500, -500);
      context.lineCap = 'round';
      for (let i = 0; i < 120; i++) {
        const angle = i / 120 * Math.PI * 2; const major = i % 10 === 0;
        const inner = major ? 418 : 428, outer = 442;
        context.beginPath(); context.moveTo(500 + Math.cos(angle) * inner, 500 + Math.sin(angle) * inner); context.lineTo(500 + Math.cos(angle) * outer, 500 + Math.sin(angle) * outer);
        context.strokeStyle = major ? 'rgba(151, 246, 255, .78)' : 'rgba(47, 182, 221, .28)'; context.lineWidth = major ? 2 : 1; context.stroke();
      }
      [[-.2, .54], [2.28, 3.04], [3.85, 4.4], [5.03, 5.6]].forEach(([from, to], index) => drawArc(398, from + elapsed * .03 * (index % 2 ? -1 : 1), to + elapsed * .03 * (index % 2 ? -1 : 1), 9, 'rgba(46, 222, 250, .76)', 16));
      context.setLineDash([46, 14]); drawArc(352, .62 * Math.PI, .9 * Math.PI, 12, 'rgba(255, 70, 80, .76)', 9); drawArc(352, -.38 * Math.PI, -.1 * Math.PI, 12, 'rgba(255, 70, 80, .76)', 9);
      context.setLineDash([3, 8]); drawArc(330, 0, Math.PI * 2, 2, 'rgba(96, 220, 255, .5)'); context.setLineDash([]);
      for (let i = 0; i < 8; i++) drawArc(300, i * Math.PI / 4 + .06, i * Math.PI / 4 + .48, 4, 'rgba(72, 218, 255, .46)', 4);
      const bars = 90;
      for (let i = 0; i < bars; i++) {
        const angle = i / bars * Math.PI * 2; const wave = Math.abs(Math.sin(i * .71 + elapsed * (speaking ? 7 : 2.2)));
        const outer = 290 + value * 14 * wave + (speaking ? 5 * wave : 0);
        context.beginPath(); context.moveTo(500 + Math.cos(angle) * 286, 500 + Math.sin(angle) * 286); context.lineTo(500 + Math.cos(angle) * outer, 500 + Math.sin(angle) * outer);
        context.strokeStyle = `rgba(86, 221, 255, ${(.08 + value * .36).toFixed(3)})`; context.lineWidth = 1.5; context.stroke();
      }
      if (state !== 'idle') {
        context.save(); context.beginPath(); context.arc(500, 500, 300, 0, Math.PI * 2); context.clip();
        const y = 200 + ((elapsed * 150) % 600); const scan = context.createLinearGradient(0, y - 55, 0, y + 55);
        scan.addColorStop(0, 'rgba(68, 222, 255, 0)'); scan.addColorStop(.5, `rgba(68, 222, 255, ${state === 'thinking' ? .16 : .1})`); scan.addColorStop(1, 'rgba(68, 222, 255, 0)'); context.fillStyle = scan; context.fillRect(200, y - 55, 600, 110); context.restore();
      }
      const moteSpeed = state === 'speaking' ? 2.8 : state === 'thinking' ? 1.7 : .65;
      for (let i = 0; i < 28; i++) {
        const angle = i * 2.399 + elapsed * moteSpeed * (i % 2 ? 1 : -1) * .12; const radius = 318 + Math.sin(i * 9.2 + elapsed) * 6;
        const x = 500 + Math.cos(angle) * radius, y = 500 + Math.sin(angle) * radius;
        context.beginPath(); context.arc(x, y, i % 5 === 0 ? 3 : 1.5, 0, Math.PI * 2); context.fillStyle = i % 7 === 0 ? 'rgba(255, 80, 86, .75)' : `rgba(115, 232, 255, ${(.35 + glow * .5).toFixed(2)})`; context.shadowColor = palette; context.shadowBlur = 8; context.fill();
      }
      if (speaking) { drawArc(306 + value * (6 * Math.sin(elapsed * 8) + 4 * Math.sin(elapsed * 13)), 0, Math.PI * 2, 2.5, 'rgba(135, 244, 255, .78)', 12); }
      context.restore(); context.shadowBlur = 0;
      if (!isReduced && !document.hidden) frame = requestAnimationFrame(render);
    };
    const restart = () => { cancelAnimationFrame(frame); last = 0; render(performance.now()); };
    reduced.addEventListener('change', restart); document.addEventListener('visibilitychange', restart); restart();
    return () => { cancelAnimationFrame(frame); observe.disconnect(); reduced.removeEventListener('change', restart); document.removeEventListener('visibilitychange', restart); window.removeEventListener('pointermove', move); window.removeEventListener('jarvis-speech-boundary', pulse); };
  }, [attention, energy, state]);

  return <div ref={root} className="live-portrait avatar-face" data-focused={Boolean(attention)} aria-hidden="true">
    <div ref={face} className="face-wrap">
      <img className="face" src={portrait} alt="" draggable="false"/>
      <span ref={leftLid} className="avatar-lid avatar-lid-left"/><span ref={rightLid} className="avatar-lid avatar-lid-right"/>
      <span ref={leftGlint} className="avatar-glint avatar-glint-left"/><span ref={rightGlint} className="avatar-glint avatar-glint-right"/>
      <span ref={mouth} className="avatar-mouth"/>
    </div>
    <canvas ref={canvas} className="avatar-hud"/>
  </div>;
}
