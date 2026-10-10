import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clapDetector,previewReply} from '../src/web/preview-voice.ts';
test('clap heuristic requires quiet calibration and a short loud transient',()=>{
  const detect=clapDetector();
  assert.equal(detect(.4,.8,0),false);
  assert.equal(detect(.01,.03,100),false);
  assert.equal(detect(.01,.03,700),false);
  assert.equal(detect(.2,.8,720),false);
  assert.equal(detect(.01,.03,780),true);
  assert.equal(detect(.01,.03,800),false);
});
test('sustained noise is not a clap',()=>{
  const detect=clapDetector();detect(.01,.03,0);detect(.01,.03,600);
  assert.equal(detect(.2,.8,620),false);assert.equal(detect(.2,.8,900),false);
  assert.equal(detect(.01,.03,920),false);
});
test('preview replies are bounded scripted text, not actions or arbitrary echo',()=>{
  assert.match(previewReply('hello'),/Hello Daniel/);
  assert.match(previewReply('what time is it'),/time on this device/);
  assert.match(previewReply('what is the date'),/Today is/);
  assert.match(previewReply('delete my emails'),/No command was executed/);
  assert(!previewReply('<img src=x onerror=alert(1)>').includes('<img'));
});
