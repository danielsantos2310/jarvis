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
    <svg className="ambient-streams" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" focusable="false">
      <defs><linearGradient id="ambient-spectrum"><stop stopColor="#1689ff"/><stop offset=".45" stopColor="#6af5ff"/><stop offset="1" stopColor="#00b8ba"/></linearGradient></defs>
      {[0,1,2].map(group=><g key={group} className={`ambient-ribbon ambient-ribbon-${group}`}>
        {Array.from({length:9},(_,i)=><path key={i} d={`M -400 ${250+i*13+group*170} C 200 ${-160+i*22+group*140}, 430 ${990-i*15-group*90}, 900 ${480+i*8-group*90} S 1530 ${50+i*26+group*120}, 2000 ${560+i*13+group*130}`} />)}
      </g>)}
      <g className="ambient-particles">{Array.from({length:30},(_,i)=><circle key={i} cx={(i*317)%1600} cy={(i*193)%1000} r={i%4===0?2:1}/>)}</g>
    </svg><div className="ambient-grain"/>
  </div>;
}
