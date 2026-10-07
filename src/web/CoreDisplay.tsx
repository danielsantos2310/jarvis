// Original vector avatar inspired by the owner's wireframe references.
const rows=[{y:74,w:25},{y:86,w:49},{y:105,w:64},{y:127,w:70},{y:147,w:68},{y:165,w:64},{y:185,w:59},{y:207,w:52},{y:227,w:43},{y:245,w:28},{y:255,w:12}];
const mesh=rows.map((row,r)=>Array.from({length:9},(_,c)=>({x:180+(c-4)*row.w/4,y:row.y+Math.sin(c*Math.PI/8)*(r<4?-7:r>7?7:0)})));
export function CoreDisplay(){return <div className="core-display neural-avatar" aria-hidden="true"><svg viewBox="0 0 360 360" fill="none" focusable="false">
  <defs><radialGradient id="avatar-glow"><stop stopColor="#38dfff" stopOpacity=".27"/><stop offset="1" stopColor="#0878a0" stopOpacity="0"/></radialGradient><linearGradient id="avatar-wire" x1="100" y1="70" x2="260" y2="270" gradientUnits="userSpaceOnUse"><stop stopColor="#258cb3"/><stop offset=".45" stopColor="#8eefff"/><stop offset="1" stopColor="#16617f"/></linearGradient></defs>
  <circle cx="180" cy="175" r="150" fill="url(#avatar-glow)" className="avatar-halo"/>
  <g className="avatar-orbits"><circle cx="180" cy="180" r="154" className="core-ring" strokeDasharray="90 28 130 80"/><circle cx="180" cy="180" r="163" className="core-ring-inner" strokeDasharray="3 13"/></g>
  <g className="avatar-face" stroke="url(#avatar-wire)" strokeWidth=".65">
    {mesh.flatMap((row,r)=>row.flatMap((p,c)=>{const links=[];if(c<8)links.push(row[c+1]);if(r<mesh.length-1){links.push(mesh[r+1][c]);if(c<8)links.push(mesh[r+1][c+1]);}return links.map((q,j)=><path key={`${r}-${c}-${j}`} d={`M${p.x} ${p.y}L${q.x} ${q.y}`} opacity={.45+((r+c)%4)*.13}/>);} ))}
    <path d="M113 146 133 137 154 143 165 154M195 154 207 143 228 137 247 146M164 153 174 176 166 194 180 201 194 194 186 176 196 153M166 194 180 189 194 194M152 217 168 211 180 214 192 211 208 217 192 224 168 224Z M154 232 180 242 206 232" strokeWidth="1"/>
    <path d="M118 154 134 147 154 153 143 160 129 159ZM206 153 226 147 242 154 231 159 217 160Z" className="avatar-eyes"/>
    <path d="M153 243 151 272 115 288 88 313M207 243 209 272 245 288 272 313M151 272 180 292 209 272M115 288 180 310 245 288M88 313 180 335 272 313M153 252 180 275 207 252M180 275V335M115 288 151 272 180 310 209 272 245 288" opacity=".6"/>
    {mesh.flat().filter((_,i)=>i%3===0).map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={i%5===0?1.35:.75} fill="#8eefff" stroke="none"/>)}
  </g>
  <circle className="avatar-heart" cx="180" cy="290" r="5" fill="#a2f6ff"/>
  <g className="thought-geometry" stroke="#48d8ff" strokeWidth=".8">{[112,138,170].map((r,i)=><polygon key={r} points={Array.from({length:6},(_,n)=>`${180+Math.cos(n*Math.PI/3)*r},${180+Math.sin(n*Math.PI/3)*r}`).join(' ')} transform={`rotate(${i*15} 180 180)`}/>)}{Array.from({length:12},(_,i)=><g key={i} transform={`rotate(${i*30} 180 180)`}><path d="M180 12V27L192 39"/><circle cx="180" cy="12" r="2" fill="#a2f6ff"/></g>)} </g>
  <path className="thought-sweep" d="M180 180V14A166 166 0 0 1 323 96Z" fill="#42ddff" fillOpacity=".12"/>
</svg></div>;}
