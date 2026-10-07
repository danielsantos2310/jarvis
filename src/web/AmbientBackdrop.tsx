import { useEffect, useState } from 'react';
/** Decorative, local CSS atmosphere; no telemetry or downloaded imagery. */
export function AmbientBackdrop() {
  const [hidden, setHidden] = useState(document.hidden);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(preference.matches), visibility = () => setHidden(document.hidden);
    preference.addEventListener('change',change); document.addEventListener('visibilitychange',visibility);
    return () => {preference.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);};
  }, []);
  return <div className={`ambient-backdrop ${hidden || reduced ? 'ambient-paused' : ''}`} aria-hidden="true">
    <div className="ambient-cloud ambient-cloud-a"/><div className="ambient-cloud ambient-cloud-b"/><div className="ambient-cloud ambient-cloud-c"/>
<div className="ambient-grain"/>
  </div>;
}
