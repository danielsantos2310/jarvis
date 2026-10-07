import { useContext, useEffect, useRef, useState } from 'react';
import { AvatarAttention } from './AvatarAttention.ts';

const portrait = new URL('./assets/neural-avatar.webp', import.meta.url).href;
const vertex = `attribute vec2 position; varying vec2 uv;
void main(){uv=vec2(position.x*.5+.5,.5-position.y*.5);gl_Position=vec4(position,0.,1.);}`;
// A restrained 2.5D deformation of the approved artwork, not a new face.
const fragment = `precision mediump float;
varying vec2 uv; uniform sampler2D portrait; uniform vec2 gaze;
uniform float blink; uniform float mouth; uniform float breath;
float bell(vec2 p,vec2 center,vec2 radius){vec2 q=(p-center)/radius;return exp(-dot(q,q));}
vec2 eye(vec2 p,vec2 center){
  vec2 d=p-center;
  if(abs(d.x)<.060){
    float lid=.018*sqrt(max(0.,1.-pow(d.x/.060,2.)));
    float gap=lid*(1.-blink*.97);
    float distance=abs(d.y);
    float mapped=distance;
    if(distance<gap) mapped=distance*lid/max(.00001,gap);
    else if(distance<.048) mapped=lid+(distance-gap)*(.048-lid)/(.048-gap);
    p.y=center.y+sign(d.y)*mapped;
  }
  float iris=bell(p,center,vec2(.031,.013));
  p-=gaze*vec2(.009,.004)*iris*(1.-blink);
  return p;
}
void main(){
  vec2 p=uv;
  float head=(1.-smoothstep(.70,.89,p.y))*smoothstep(.025,.15,p.y);
  float depth=exp(-pow((p.x-.499)/.24,2.))*head;
  p.x-=gaze.x*.037*depth;
  p.y-=gaze.y*.021*depth+breath*.0018*head;
  vec2 face=p;
  p=eye(p,vec2(.396,.425));p=eye(p,vec2(.603,.425));
  float dx=face.x-.499;
  float seam=.630-.001*pow(dx/.065,2.);
  float opening=mouth*.019;
  float lipWeight=exp(-pow(dx/.080,4.))*exp(-pow((face.y-.638)/.065,2.));
  p.y-=opening*clamp((face.y-seam)/.004,-1.,1.)*lipWeight;
  vec4 color=texture2D(portrait,p);
  float cavity=1.-smoothstep(.85,1.,pow(dx/(.053+mouth*.009),2.)+pow((face.y-seam)/max(.0001,opening),2.));
  color.rgb=mix(color.rgb,vec3(.002,.016,.025),cavity*smoothstep(.025,.12,mouth));
  gl_FragColor=color;
}`;

export function LivePortrait({ speaking, analyser }: { speaking: boolean; analyser?: AnalyserNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const target = useContext(AvatarAttention);
  const activity = useRef({ speaking, analyser, target });
  activity.current = { speaking, analyser, target };

  useEffect(() => {
    const el = canvas.current!;
    let gl: WebGLRenderingContext | null;
    try { gl = el.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true }); } catch { return; }
    if (!gl) return; // The original SVG image is the reliable no-GPU fallback.
    const gpu = gl;
    let disposed = false, frame = 0, loaded = false, last = 0;
    let lookX = 0, lookY = 0, jaw = 0, nextBlink = performance.now() + 2800;
    let samples: Uint8Array<ArrayBuffer> | null = null, sampled: AnalyserNode | undefined;
    const shaders: WebGLShader[] = [];
    const program = gpu.createProgram()!, buffer = gpu.createBuffer()!, texture = gpu.createTexture()!;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    function cleanup() {
      cancelAnimationFrame(frame);
      gpu.deleteTexture(texture); gpu.deleteBuffer(buffer); gpu.deleteProgram(program);
      shaders.forEach(shader => gpu.deleteShader(shader));
    }
    for (const [type, source] of [[gpu.VERTEX_SHADER, vertex], [gpu.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gpu.createShader(type)!; shaders.push(shader);
      gpu.shaderSource(shader, source); gpu.compileShader(shader);
      if (!gpu.getShaderParameter(shader, gpu.COMPILE_STATUS)) { cleanup(); return; }
      gpu.attachShader(program, shader);
    }
    gpu.linkProgram(program);
    if (!gpu.getProgramParameter(program, gpu.LINK_STATUS)) { cleanup(); return; }
    gpu.useProgram(program); gpu.bindBuffer(gpu.ARRAY_BUFFER, buffer);
    gpu.bufferData(gpu.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gpu.STATIC_DRAW);
    const position = gpu.getAttribLocation(program, 'position');
    gpu.enableVertexAttribArray(position); gpu.vertexAttribPointer(position, 2, gpu.FLOAT, false, 0, 0);
    const gaze = gpu.getUniformLocation(program, 'gaze'), blink = gpu.getUniformLocation(program, 'blink');
    const mouth = gpu.getUniformLocation(program, 'mouth'), breath = gpu.getUniformLocation(program, 'breath');
    gpu.uniform1i(gpu.getUniformLocation(program, 'portrait'), 0);
    gpu.bindTexture(gpu.TEXTURE_2D, texture);
    gpu.texParameteri(gpu.TEXTURE_2D, gpu.TEXTURE_WRAP_S, gpu.CLAMP_TO_EDGE);
    gpu.texParameteri(gpu.TEXTURE_2D, gpu.TEXTURE_WRAP_T, gpu.CLAMP_TO_EDGE);
    gpu.texParameteri(gpu.TEXTURE_2D, gpu.TEXTURE_MIN_FILTER, gpu.LINEAR);
    gpu.texParameteri(gpu.TEXTURE_2D, gpu.TEXTURE_MAG_FILTER, gpu.LINEAR);
    const img = new Image();
    img.onload = () => {
      if (disposed || gpu.isContextLost()) return;
      gpu.bindTexture(gpu.TEXTURE_2D, texture);
      gpu.texImage2D(gpu.TEXTURE_2D, 0, gpu.RGBA, gpu.RGBA, gpu.UNSIGNED_BYTE, img);
      loaded = true; setReady(true); restart();
    };
    img.src = portrait;
    function draw(now: number) {
      if (disposed || !loaded || document.hidden || gpu.isContextLost()) return;
      if (now-last >= 33 || preference.matches) {
        const dt = Math.min(100, now-last || 33); last = now;
        const { speaking: talking, analyser: audio, target: attention } = activity.current;
        const reduced = preference.matches;
        const box = el.getBoundingClientRect();
        const tx = attention ? Math.max(-1,Math.min(1,(attention.x/100*innerWidth-box.x-box.width/2)/(innerWidth*.4))) : 0;
        const ty = attention ? Math.max(-1,Math.min(1,(attention.y/100*innerHeight-box.y-box.height/2)/(innerHeight*.4))) : 0;
        const ease = 1-Math.exp(-dt/190);
        lookX += ((reduced ? 0 : tx)-lookX)*ease; lookY += ((reduced ? 0 : ty)-lookY)*ease;
        let energy = 0;
        if (talking && !reduced) {
          if (audio) {
            if (sampled !== audio || samples?.length !== audio.fftSize) { sampled = audio; samples = new Uint8Array(audio.fftSize); }
            audio.getByteTimeDomainData(samples!);
            energy = Math.min(1, Math.sqrt(samples!.reduce((sum,v)=>sum+((v-128)/128)**2,0)/samples!.length)*5);
          } else {
            // Device synthesis exposes start/stop, not PCM or reliable phonemes.
            energy = Math.max(0,Math.sin(now/87)*.45+Math.sin(now/193)*.25+.28);
          }
        }
        jaw = talking && !reduced ? jaw+(energy-jaw)*(1-Math.exp(-dt/45)) : 0;
        let closing = 0;
        if (!reduced && now >= nextBlink) {
          const phase = (now-nextBlink)/190;
          if (phase < 1) closing = Math.sin(phase*Math.PI);
          else nextBlink = now+3400+Math.sin(now)*700;
        }
        const size = Math.max(1,Math.round(Math.min(900,box.width*Math.min(devicePixelRatio,1.5))));
        if (el.width !== size) { el.width=size; el.height=size; }
        gpu.viewport(0,0,el.width,el.height); gpu.useProgram(program);
        gpu.uniform2f(gaze,reduced?0:lookX,reduced?0:lookY); gpu.uniform1f(blink,closing);
        gpu.uniform1f(mouth,jaw); gpu.uniform1f(breath,reduced?0:Math.sin(now/1800));
        gpu.drawArrays(gpu.TRIANGLES,0,6);
        el.dataset.gazeX = lookX.toFixed(3); el.dataset.gazeY = lookY.toFixed(3);
        el.dataset.mouth = jaw.toFixed(3); el.dataset.blink = closing.toFixed(3);
      }
      if (!preference.matches) frame=requestAnimationFrame(draw);
    }
    function restart() {
      cancelAnimationFrame(frame); last=0;
      el.dataset.motion=document.hidden ? 'paused' : preference.matches ? 'reduced' : 'active';
      if (document.hidden || preference.matches) { jaw=0; lookX=0; lookY=0; }
      if (!document.hidden) { nextBlink=performance.now()+2800; draw(performance.now()); }
    }
    function lost(event: Event) { event.preventDefault(); cancelAnimationFrame(frame); setReady(false); }
    // Keep the still portrait on context loss; remounting can acquire a fresh context.
    el.addEventListener('webglcontextlost',lost);
    document.addEventListener('visibilitychange',restart); preference.addEventListener('change',restart); window.addEventListener('resize',restart);
    return () => {
      disposed=true; img.onload=null; cleanup();
      el.removeEventListener('webglcontextlost',lost);
      document.removeEventListener('visibilitychange',restart); preference.removeEventListener('change',restart); window.removeEventListener('resize',restart);
    };
  }, []);

  return <foreignObject x="18" y="20" width="324" height="324" className="avatar-live-surface">
    <canvas ref={canvas} className="avatar-live" data-ready={ready} aria-hidden="true" style={{ opacity: ready ? 1 : 0 }}/>
  </foreignObject>;
}
