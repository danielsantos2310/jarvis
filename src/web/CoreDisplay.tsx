import { LivePortrait } from './LivePortrait.tsx';
const portrait = new URL('./assets/neural-avatar.webp', import.meta.url).href;

// Preserve the approved artwork, with a live deformation layer and still fallback.
export function CoreDisplay({ speaking = false, analyser, processing = false }: { speaking?: boolean; analyser?: AnalyserNode; processing?: boolean }) {
  return <div className="core-display neural-avatar" aria-hidden="true">
    <svg viewBox="0 0 360 360" fill="none" focusable="false">
      <defs>
        <radialGradient id="avatar-glow"><stop stopColor="#0acaff" stopOpacity=".16"/><stop offset="1" stopColor="#0878a0" stopOpacity="0"/></radialGradient>
        <clipPath id="avatar-aperture"><circle cx="180" cy="180" r="135"/></clipPath>
        <linearGradient id="avatar-scan" x2="0" y2="1"><stop stopColor="#67edff" stopOpacity="0"/><stop offset=".5" stopColor="#67edff" stopOpacity=".2"/><stop offset="1" stopColor="#67edff" stopOpacity="0"/></linearGradient>
      </defs>
      <circle cx="180" cy="180" r="166" fill="url(#avatar-glow)" className="avatar-halo"/>
      <g className="avatar-instrument-lines" stroke="#36c9f3">
        {[137,141,153,165,173].map(r=><circle key={r} cx="180" cy="180" r={r} strokeWidth=".35" opacity=".5"/>)}
        {Array.from({length:120},(_,i)=><path key={i} transform={`rotate(${i*3} 180 180)`} d={i%5===0?'M180 7V14':'M180 7V10'} strokeWidth={i%5===0?.8:.4} opacity={i%5===0?.85:.45}/>)}
      </g>
      <g className="avatar-orbits">
        <circle cx="180" cy="180" r="149" className="core-ring" strokeDasharray="184 32 96 38 220 64 180 123"/>
        <circle cx="180" cy="180" r="160" className="core-ring-inner" strokeDasharray="2 5 2 5 18 12"/>
        <circle cx="180" cy="180" r="169" className="avatar-red-orbit" stroke="#f64e66" strokeWidth="1.6" strokeDasharray="58 240 34 380 20 330"/>
        <circle cx="180" cy="180" r="143" className="avatar-data-orbit" stroke="#22bdea" strokeWidth="3" strokeDasharray="26 100 9 63 50 140"/>
      </g>
      <g clipPath="url(#avatar-aperture)">
        <image className="avatar-portrait" href={portrait} x="18" y="20" width="324" height="324" preserveAspectRatio="xMidYMid meet"/>
        <LivePortrait speaking={speaking} analyser={analyser} processing={processing}/>
        <rect className="avatar-scan" x="55" y="58" width="250" height="28" fill="url(#avatar-scan)"/>
      </g>
      <g className="avatar-locks" stroke="#63e7ff" strokeWidth="1.3">
        <path d="M29 168V192M24 174V186M331 168V192M336 174V186M168 29H192M174 24H186M168 331H192"/>
      </g>
      <g className="thought-geometry" stroke="#48d8ff" strokeWidth=".65">
        {[145,175].map((r,i)=><polygon key={r} points={Array.from({length:6},(_,n)=>`${180+Math.cos(n*Math.PI/3)*r},${180+Math.sin(n*Math.PI/3)*r}`).join(' ')} transform={`rotate(${i*15} 180 180)`}/>)}
      </g>
      <path className="thought-sweep" d="M180 180V14A166 166 0 0 1 323 96Z" fill="#42ddff" fillOpacity=".08"/>
    </svg>
  </div>;
}
