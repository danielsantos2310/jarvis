import { useContext, useId } from 'react';
import { AvatarAttention } from './AvatarAttention.ts';

/** Vector energy chamber. VoiceWaveform owns state and the shared audio envelope. */
export function CoreDisplay() {
  const id = useId().replaceAll(':','');
  const target = useContext(AvatarAttention);
  const angle = target ? Math.atan2(target.y-48,target.x-50)*180/Math.PI : -90;
  const paint = (name:string) => `url(#${id}-${name})`;
  return <div className="core-display energy-core" aria-hidden="true" data-focused={!!target}>
    <svg viewBox="0 0 360 360" fill="none" focusable="false">
      <defs>
        <linearGradient id={`${id}-arc`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--energy-ice)"/><stop offset=".4" stopColor="var(--energy-cyan)"/><stop offset="1" stopColor="var(--energy-muted)"/></linearGradient>
      </defs>
      <g className="energy-heartbeat">
      <circle cx="180" cy="180" r="173" stroke="var(--energy-muted)" strokeWidth=".5"/>
      <g className="energy-ticks" stroke="var(--energy-cyan)">{Array.from({length:120},(_,i)=><path key={i} d={i%10===0?'M180 7V16':i%5===0?'M180 7V12':'M180 7V9'} transform={`rotate(${i*3} 180 180)`} opacity={i%5===0?.65:.22} strokeWidth={i%5===0?.8:.4}/>)}</g>
      <circle cx="180" cy="180" r="159" stroke="var(--energy-muted)" strokeWidth=".6"/>
      <circle cx="180" cy="180" r="153" stroke="var(--energy-cyan)" strokeWidth="1" opacity=".3" strokeDasharray="140 100 62 26"/>
      <circle cx="180" cy="180" r="143" stroke="var(--energy-muted)" strokeWidth=".6"/>
      <g className="energy-bearing">
        <circle cx="180" cy="180" r="147" stroke={paint('arc')} strokeWidth="2.6" strokeDasharray="155 45 30 78"/>
        <circle cx="180" cy="180" r="139" stroke="var(--energy-cyan)" strokeWidth="3.5" strokeDasharray="1 7" opacity=".5"/>
      </g>
      <g className="energy-stator" stroke="var(--energy-cyan)">{[0,120,240].map(a=><g key={a} transform={`rotate(${a} 180 180)`}>
        <path d="M111 77A124 124 0 0 1 249 77" strokeWidth=".6" stroke="var(--energy-cyan)"/>
        <path d="M116 80A118 118 0 0 1 244 80" strokeWidth="1.4"/>
        <path d="M180 55V68M171 57V63M189 57V63" strokeWidth="2"/>
        <path d="M117 86 130 104M243 86 230 104" strokeWidth=".6" opacity=".45"/>
      </g>)}</g>
      <g className="energy-rotor">
        <circle cx="180" cy="180" r="101" stroke="var(--energy-cyan)" strokeWidth=".5"/>
        {[0,120,240].map(a=><g key={a} transform={`rotate(${a} 180 180)`}>
          <path d="M105 139A86 86 0 0 1 206 98" stroke={paint('arc')} strokeWidth="3" strokeLinecap="round"/>
          <path d="M110 142A80 80 0 0 1 204 104" stroke="var(--energy-cyan)" strokeWidth=".6" opacity=".55"/>
          <circle cx="206" cy="98" r="2.3" fill="var(--energy-ice)"/>
        </g>)}
      </g>
      <g className="energy-particles" fill="var(--energy-ice)">{Array.from({length:24},(_,i)=>{const a=i*2.39996,r=69+(i%4)*11;return <circle key={i} cx={180+Math.cos(a)*r} cy={180+Math.sin(a)*r} r={i%5===0?1.15:.55} opacity={.2+(i%4)*.15}/>;})}</g>
      <g className="energy-ripples" stroke="var(--energy-cyan)"><circle cx="180" cy="180" r="65"/><circle cx="180" cy="180" r="65"/></g>
      <g className="energy-response">
        <g className="energy-aperture" stroke="var(--energy-cyan)">
          <circle cx="180" cy="180" r="61" strokeWidth=".6" opacity=".45"/>
          <circle cx="180" cy="180" r="55" strokeWidth="1.4" strokeDasharray="75 40"/>
          {Array.from({length:36},(_,i)=><path key={i} d="M180 128V137" transform={`rotate(${i*10} 180 180)`} strokeWidth={i%3===0?2:1} opacity={i%3===0?.95:.35}/>)}
          <circle cx="180" cy="180" r="39" stroke="var(--energy-ice)" strokeWidth="1" opacity=".7"/>
          <circle cx="180" cy="180" r="34" strokeWidth=".5" opacity=".35"/>
        </g>
      </g>
      </g>
      <g className="energy-focus" style={{transform:`rotate(${angle}deg)`}}>
        <path d="M340 163A161 161 0 0 1 340 197" stroke="var(--energy-cyan)" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M349 180H354" stroke="var(--energy-cyan)" strokeWidth="1"/>
      </g>
      <g stroke="var(--energy-cyan)" strokeWidth=".6" opacity=".6"><path d="M18 180H27M333 180H342M180 18V27M180 333V342"/></g>
    </svg>
  </div>;
}
