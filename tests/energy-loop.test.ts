import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waveLoop } from '../src/web/energy-loop.ts';

test('all waveform strands close cleanly and preserve a large hollow aperture', () => {
  for (let layer=0;layer<18;layer++) for (const time of [0,1,7,32,100]) for (const energy of [0,.5,1,10,NaN]) {
    const d=waveLoop(layer,time,energy,.8);
    const points=[...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(m=>[Number(m[1]),Number(m[2])]);
    assert.equal(points.length,161);assert.deepEqual(points[0],points.at(-1));assert(d.endsWith('Z'));
    for (const [x,y] of points) {const r=Math.hypot(x-180,y-180);assert(r>100 && r<175,`radius ${r}`);}
  }
});
test('strands deform with time and energy instead of rotating a static silhouette', () => {
  assert.notEqual(waveLoop(0,0,0),waveLoop(0,1,0));
  assert.notEqual(waveLoop(0,1,0),waveLoop(0,1,1));
  assert.notEqual(waveLoop(0,1,0),waveLoop(1,1,0));
});
