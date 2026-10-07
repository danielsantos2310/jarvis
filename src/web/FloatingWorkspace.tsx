import { AvatarAttention } from './AvatarAttention.ts';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AmbientBackdrop } from './AmbientBackdrop.tsx';
export type Panel = 'command' | 'tasks' | 'timers' | 'email' | 'microphone' | 'system' | 'activity' | 'help' | 'calendar' | 'weather' | 'music' | 'presence' | 'home' | 'camera';
const symbols: Record<string, ReactNode> = {
  calendar: <><rect x="5" y="7" width="22" height="22" rx="2"/><path d="M5 13h22M10 3v8M22 3v8M10 18h3M19 18h3M10 23h3M19 23h3"/></>,
  weather: <><path d="M10 24h13a6 6 0 0 0 0-12 8 8 0 0 0-15-1 7 7 0 0 0 2 13Z"/><path d="M19 3V1M28 6l2-2M29 12h3"/></>,
  music: <><path d="M5 19v-5a11 11 0 0 1 22 0v5"/><rect x="3" y="15" width="6" height="12" rx="2"/><rect x="23" y="15" width="6" height="12" rx="2"/></>,
  presence: <><circle cx="16" cy="9" r="5"/><path d="M6 29v-4a10 10 0 0 1 20 0v4Z"/></>,
  home: <><path d="m2 15 14-12 14 12M7 12v17h7V19h5v10h6V12"/></>,
  camera: <><rect x="3" y="8" width="20" height="18" rx="2"/><circle cx="13" cy="17" r="4"/><path d="m23 13 7-4v16l-7-4"/></>,
  expand: <path d="M4 12V4h8M20 4h8v8M28 20v8h-8M12 28H4v-8"/>,
  command: <><path d="m8 10 4 4-4 4M15 18h7"/><path d="M5 5h22v22H5z"/></>,
  tasks: <><path d="M14 8h12M14 16h12M14 24h12M5 8l2 2 4-5M5 16l2 2 4-5M5 24l2 2 4-5"/></>,
  timers: <><circle cx="16" cy="18" r="10"/><path d="M16 12v6l4 3M12 3h8"/></>,
  email: <><rect x="3" y="7" width="26" height="19" rx="2"/><path d="m4 8 12 10L28 8"/></>,
  microphone: <><rect x="12" y="3" width="8" height="17" rx="4"/><path d="M7 14v3a9 9 0 0 0 18 0v-3M16 26v4M11 30h10"/></>,
  system: <><path d="m16 3 11 5v8c0 6-5 10-11 14C10 26 5 22 5 16V8Z"/><path d="m10 16 4 4 8-9"/></>,
  activity: <path d="M2 17h6l4-11 7 22 5-11h6"/>,
  help: <><circle cx="16" cy="16" r="12"/><path d="M12 12a4 4 0 1 1 7 3l-3 3v2M16 24h.01"/></>,
  settings: <><path d="M4 9h24M4 23h24"/><circle cx="11" cy="9" r="4"/><circle cx="22" cy="23" r="4"/></>,
  lock: <><rect x="7" y="14" width="18" height="15" rx="2"/><path d="M11 14V9a5 5 0 0 1 10 0v5M16 20v4"/></>,
  restore: <><path d="M7 10a11 11 0 1 1-1 11M7 3v8H0"/><path d="M16 10v12M10 16h12"/></>,
  close: <path d="m8 8 16 16M24 8 8 24"/>,
};
export function HudIcon({ name }: { name: string }) {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><circle className="icon-orbit" cx="32" cy="32" r="29"/><circle className="icon-fine" cx="32" cy="32" r="31" strokeDasharray="1 2"/><circle className="icon-inner" cx="32" cy="32" r="21"/><circle className="icon-arc" cx="32" cy="32" r="24" strokeDasharray="65 12 35 39"/><circle className="icon-sectors" cx="32" cy="32" r="26.5" strokeDasharray="27 8 12 18 38 24 8 32"/><circle cx="32" cy="2" r="1" fill="currentColor"/><g transform="translate(19 19) scale(.81)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{symbols[name] ?? symbols.help}</g></svg>;
}
const items: { id: Panel; label: string }[] = [
  { id: 'calendar', label: 'Calendar' }, { id: 'weather', label: 'Weather' }, { id: 'music', label: 'Music' }, { id: 'presence', label: 'Presence' }, { id: 'home', label: 'Home controls' }, { id: 'camera', label: 'Camera' },
  { id: 'command', label: 'Commands' }, { id: 'tasks', label: 'Tasks & reminders' }, { id: 'email', label: 'Email' }, { id: 'timers', label: 'Timers' },
  { id: 'microphone', label: 'Microphone' }, { id: 'system', label: 'System' }, { id: 'activity', label: 'Activity' }, { id: 'help', label: 'Help' },
];
type Point = { x: number; y: number };
function defaults(): Record<string, Point> {
  const narrow = innerWidth < 680;
  return Object.fromEntries(items.map((item, i) => [item.id, narrow ? { x: i % 2 ? 88 : 12, y: 15 + Math.floor(i / 2) * 12 } : { x: 50 + 42 * Math.cos((i / items.length) * Math.PI * 2 - Math.PI / 2), y: 50 + 36 * Math.sin((i / items.length) * Math.PI * 2 - Math.PI / 2) }]));
}
export function FloatingWorkspace({ active, onOpen, panels, voice, notices, onControls, onLock, children }: {
  active: Panel | null; onOpen: (id: Panel | null) => void; panels: Record<Panel, ReactNode>; voice: ReactNode; notices: ReactNode;
  onControls: () => void; onLock: () => void; children: ReactNode;
}) {
  const [points, setPoints] = useState(defaults), [hidden, setHidden] = useState<string[]>([]), [moving, setMoving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [announcement, announce] = useState('');
  const drag = useRef<{ id: string; start: Point; origin: Point; moved: boolean } | null>(null);
  const tap = useRef<{ id: Panel; at: number; x: number; y: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const cancelled = useRef(false), panelRef = useRef<HTMLDivElement>(null), opener = useRef<HTMLElement | null>(null);
  const clamp = (p: Point): Point => ({ x: Math.max((innerWidth < 680 ? 32 : 52) / innerWidth * 100, Math.min(100 - (innerWidth < 680 ? 32 : 52) / innerWidth * 100, p.x)), y: Math.max(72 / innerHeight * 100, Math.min(100 - 72 / innerHeight * 100, p.y)) });
  function open(id: Panel | null) { if (id) opener.current = document.activeElement as HTMLElement; onOpen(id); }
  function cancelTap() { if (tap.current) clearTimeout(tap.current.timer); tap.current = null; }
  function hide(id: Panel) { cancelTap(); setHidden(old => [...new Set([...old, id])]); if (active === id) { opener.current = null; onOpen(null); } announce(`${items.find(i => i.id === id)?.label} hidden. Restore icons brings it back.`); document.querySelector<HTMLButtonElement>('[aria-label="Restore icons and reset layout"]')?.focus(); }
  function activate(id: Panel, x: number, y: number, target: HTMLElement) {
    const previous = tap.current;
    if (previous?.id === id && performance.now() - previous.at < 360 && Math.hypot(x - previous.x, y - previous.y) < 24) { hide(id); return; }
    cancelTap();
    tap.current = { id, at: performance.now(), x, y, timer: setTimeout(() => { tap.current = null; opener.current = target; onOpen(id); }, 360) };
  }
  useEffect(() => () => cancelTap(), []);
  useEffect(() => {
    if (active) { setHidden(old => old.filter(id => id !== active)); panelRef.current?.focus(); } else opener.current?.focus();
  }, [active]);
  useEffect(() => {
    const resize = () => setPoints(old => Object.fromEntries(Object.entries(old).map(([key, point]) => [key, clamp(point)])));
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      cancelTap();
      if (drag.current) { const d = drag.current; setPoints(old => ({ ...old, [d.id]: d.origin })); drag.current = null; cancelled.current = true; setMoving(null); announce('Move cancelled.'); }
      else onOpen(null);
    };
    window.addEventListener('resize', resize); window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('keydown', escape); };
  }, [onOpen]);
  return <div className="floating-workspace">
    <AmbientBackdrop/>
    <div className="hud-circuit" aria-hidden="true"/>
    <div className="spatial-status"><span className="dot"/><span>{__JARVIS_DEMO__ ? 'PREVIEW' : 'LOCAL'}</span></div>
    <div className="spatial-utilities">
      <button className="hud-utility" aria-label="Restore icons and reset layout" title="Restore icons and reset layout" onClick={() => { cancelTap(); setPoints(defaults()); setHidden([]); announce('All icons restored.'); }}><HudIcon name="restore"/></button>
      <button className="hud-utility" aria-label="Controls" title="Controls" onClick={() => {cancelTap();onControls();}}><HudIcon name="settings"/></button>
      <button className="hud-utility" aria-label={__JARVIS_DEMO__ ? 'Reset demo' : 'Lock workspace'} title={__JARVIS_DEMO__ ? 'Reset demo' : 'Lock workspace'} onClick={() => {cancelTap();onLock();}}><HudIcon name="lock"/></button>
    </div>
    <main id="main" className="spatial-stage" aria-label="JARVIS floating workspace">
      <div className="spatial-voice"><AvatarAttention.Provider value={active ? points[active] : null}>{voice}</AvatarAttention.Provider></div>
      <nav aria-label="Floating tools">{items.filter(item => !hidden.includes(item.id)).map(item => <button key={item.id}
        className={`floating-tool ${moving === item.id ? 'is-moving' : ''}`} style={{ left: `${points[item.id].x}%`, top: `${points[item.id].y}%` }}
        aria-label={item.label} title={`${item.label} · drag to move; double-click or double-tap to hide; Delete also hides`} aria-describedby="move-instructions" aria-pressed={active === item.id}
        onPointerDown={e => { if (e.button !== 0) return; cancelled.current = false; drag.current = { id: item.id, start: { x: e.clientX, y: e.clientY }, origin: points[item.id], moved: false }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={e => { const d = drag.current; if (!d || d.id !== item.id) return; const dx = e.clientX - d.start.x, dy = e.clientY - d.start.y; if (Math.hypot(dx, dy) > 6) { cancelTap(); d.moved = true; setMoving(item.id); } if (d.moved) setPoints(old => ({ ...old, [item.id]: clamp({ x: d.origin.x + dx / innerWidth * 100, y: d.origin.y + dy / innerHeight * 100 }) })); }}
        onPointerUp={e => { const d = drag.current; if (!d) return; cancelled.current = true; if (d.moved) announce(`${item.label} moved.`); else activate(item.id, e.clientX, e.clientY, e.currentTarget); drag.current = null; setMoving(null); }}
        onPointerCancel={() => { cancelTap(); const d = drag.current; if (d) setPoints(old => ({ ...old, [d.id]: d.origin })); drag.current = null; cancelled.current = true; setMoving(null); }}
        onClick={e => { if (e.detail === 0) { cancelTap(); open(item.id); } }} onDoubleClick={e => e.preventDefault()}
        onKeyDown={e => { const step = e.shiftKey ? 5 : 1; const deltas: Record<string, Point> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } }; const delta = deltas[e.key]; if (delta) { e.preventDefault(); setPoints(old => ({ ...old, [item.id]: clamp({ x: old[item.id].x + delta.x, y: old[item.id].y + delta.y }) })); announce(`${item.label} moved.`); } if (e.key === 'Delete') { e.preventDefault(); hide(item.id); } }}>
        <HudIcon name={item.id}/><span className="hud-tooltip">{item.label}</span>
      </button>)}</nav>
      <p id="move-instructions" className="sr-only">Drag an icon, or focus it and use arrow keys to move. Tap once or press Enter to open. Double-click, double-tap or press Delete to hide. Restore icons brings all tools back.</p>
      <div className="spatial-notices">{notices}</div>
      <div className={`hud-panel ${expanded ? 'is-expanded' : ''}`} hidden={!active} ref={panelRef} tabIndex={-1} role="region" aria-label={items.find(i => i.id === active)?.label ?? 'Tool panel'}>
        <button className="hud-panel-expand hud-utility" aria-label={expanded ? 'Restore panel size' : 'Expand panel'} title={expanded ? 'Restore panel size' : 'Expand panel'} onClick={() => setExpanded(v => !v)}><HudIcon name="expand"/></button>
        <button className="hud-panel-close hud-utility" aria-label="Close panel" title="Close panel" onClick={() => open(null)}><HudIcon name="close"/></button>
        {items.map(item => <div key={item.id} hidden={active !== item.id}>{panels[item.id]}</div>)}
      </div>
    </main>
    <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    {children}
  </div>;
}
