import { useEffect, useState } from 'react';
/** Decorative, local CSS atmosphere; no telemetry or downloaded imagery. */
export function AmbientBackdrop() {
  const [paused, setPaused] = useState(false), [hidden, setHidden] = useState(document.hidden);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(preference.matches), visibility = () => setHidden(document.hidden);
    preference.addEventListener('change',change); document.addEventListener('visibilitychange',visibility);
    return () => {preference.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);};
  }, []);
  return <>
    <div className={`ambient-backdrop ${paused || hidden || reduced ? 'ambient-paused' : ''}`} aria-hidden="true"><div className="ambient-cloud ambient-cloud-a"/><div className="ambient-cloud ambient-cloud-b"/><div className="ambient-cloud ambient-cloud-c"/><div className="ambient-grain"/></div>
    <button className="ambient-toggle" aria-label={reduced ? 'Background motion disabled by system preference' : paused ? 'Play background motion' : 'Pause background motion'} title={reduced ? 'Reduced motion enabled' : paused ? 'Play background motion' : 'Pause background motion'} aria-pressed={!paused && !reduced} disabled={reduced} onClick={() => setPaused(v=>!v)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{paused || reduced ? <path d="m8 5 11 7-11 7Z"/> : <path d="M8 5v14M16 5v14"/>}</svg>
    </button>
  </>;
}
