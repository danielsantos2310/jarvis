import { useEffect, useRef } from 'react';
/** Original neural field: decorative geometry, never sensor data. */
export function AmbientBackdrop() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const el=canvas.current; if(!el) return; const ctx=el.getContext('2d');if(!ctx)return;
    const preference=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,last=0,w=0,h=0;
    const seeds=Array.from({length:190},(_,i)=>({x:((i*137.508)%1000)/1000,y:((i*231.73)%1000)/1000,p:i*2.399}));
    function draw(time:number){
      if(time-last>40 || !last || preference.matches){last=time;const t=preference.matches?0:time*.00012;
        ctx!.clearRect(0,0,w,h);
        const points=seeds.map(n=>({x:n.x*w+Math.sin(t+n.p)*24,y:n.y*h+Math.sin(t*.8+n.p*2)*26}));
        for(let i=0;i<points.length;i++){const a=points[i];const center=Math.hypot((a.x-w/2)/(w*.5),(a.y-h*.48)/(h*.5));const fade=Math.min(1,.16+center*.7);
          for(let j=i+1;j<points.length;j++){const b=points[j],distance=Math.hypot(a.x-b.x,a.y-b.y),reach=Math.min(170,w*.26);if(distance>reach)continue;
            const alpha=(1-distance/reach)*.35*fade;ctx!.strokeStyle=`rgba(29,164,205,${alpha})`;ctx!.lineWidth=.7;ctx!.beginPath();ctx!.moveTo(a.x,a.y);ctx!.lineTo(b.x,b.y);ctx!.stroke();
            if((i+j)%13===0){const p=(t*.65+i*.07)%1;ctx!.fillStyle=(i+j)%39===0?'#ce5867':'#74ebff';ctx!.globalAlpha=fade*.8;ctx!.beginPath();ctx!.arc(a.x+(b.x-a.x)*p,a.y+(b.y-a.y)*p,1.6,0,Math.PI*2);ctx!.fill();ctx!.globalAlpha=1;}
          }
          ctx!.fillStyle=`rgba(78,208,237,${fade*.5})`;ctx!.beginPath();ctx!.arc(a.x,a.y,i%9===0?1.8:.8,0,Math.PI*2);ctx!.fill();
        }
      }
      if(!preference.matches&&!document.hidden)frame=requestAnimationFrame(draw);
    }
    function restart(){cancelAnimationFrame(frame);last=0;draw(0);}
    function resize(){w=innerWidth;h=innerHeight;const d=Math.min(devicePixelRatio||1,1.5);el!.width=w*d;el!.height=h*d;ctx!.setTransform(d,0,0,d,0,0);restart();}
    resize();window.addEventListener('resize',resize);document.addEventListener('visibilitychange',restart);preference.addEventListener('change',restart);
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',restart);preference.removeEventListener('change',restart);};
  },[]);
  return <div className="ambient-backdrop neural-backdrop" aria-hidden="true"><div className="neural-aura"/><canvas ref={canvas} className="neural-field"/></div>;
}
