// Decorative SVG only: no fabricated telemetry, external assets or device access.
export function CoreDisplay() {
  return <div className="core-display" aria-hidden="true">
    <div className="core-coordinate">J / 01 <span>PERSONAL INTERFACE</span></div>
    <svg viewBox="0 0 360 360" fill="none" focusable="false">
      <circle cx="180" cy="180" r="170" className="core-guide"/>
      <path d="M180 0V30M180 330V360M0 180H30M330 180H360" className="core-cross"/>
      {Array.from({length:60},(_,i)=><line key={i} x1="180" y1={i%5===0?22:27} x2="180" y2="33" transform={`rotate(${i*6} 180 180)`} className={i%5===0?'core-tick-major':'core-tick'}/>)}
      <circle cx="180" cy="180" r="141" className="core-ring" strokeDasharray="340 48 190 55 220 34"/>
      <circle cx="180" cy="180" r="130" className="core-guide"/>
      <circle cx="180" cy="180" r="117" className="core-segments" strokeDasharray="3 7"/>
      <circle cx="180" cy="180" r="99" className="core-ring-inner" strokeDasharray="180 35 280 127"/>
      <circle cx="180" cy="180" r="87" className="core-guide"/>
      <circle cx="180" cy="180" r="75" className="core-center"/>
      <path d="M136 142 150 128H210L224 142M136 218 150 232H210L224 218" className="core-bracket"/>
      <text x="180" y="184" textAnchor="middle" className="core-name">J.A.R.V.I.S.</text>
      <text x="180" y="202" textAnchor="middle" className="core-subtitle">AT YOUR COMMAND</text>
      <path d="M41 105H74L88 119M272 241 286 255H319M52 284H91L110 265" className="core-cross"/>
      <circle cx="41" cy="105" r="3" className="core-node"/><circle cx="319" cy="255" r="3" className="core-node"/>
    </svg>
    <div className="core-caption"><span/>DESIGNED AROUND YOU</div>
  </div>;
}
