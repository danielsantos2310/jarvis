import { openTool } from './spatial-helpers.ts';
import { test, expect } from '@playwright/test';
test('microphone requires a click, handles denial/cancel, and stops on timeout and lock',async({page})=>{
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const fixture = {calls:0,mode:'allow',tracks:[] as MediaStreamTrack[],release:()=>{}};
    Object.assign(window,{micFixture:fixture});
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
      fixture.calls++;
      if(fixture.mode==='deny') throw new DOMException('Denied','NotAllowedError');
      if(fixture.mode==='delay') await new Promise<void>(resolve=>{fixture.release=resolve;});
      const context=new AudioContext();const oscillator=context.createOscillator();const destination=context.createMediaStreamDestination();
      oscillator.connect(destination);oscillator.start();await context.resume();
      for(const track of destination.stream.getTracks()){
        fixture.tracks.push(track);const stop=track.stop.bind(track);
        track.stop=()=>{stop();oscillator.stop();void context.close();};
      }
      return destination.stream;
    }});
  });
  await page.goto('/');
  await page.getByLabel('Setup code').fill('synthetic-browser-setup');
  await page.getByLabel('Password',{exact:true}).fill('Synthetic microphone passphrase');
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Create workspace'}).click();
  await openTool(page, 'Microphone');
  const panel=page.getByRole('region',{name:'Microphone test'});
  await expect(panel).toBeVisible();
  const fixture=()=>page.evaluate(()=> (window as unknown as {micFixture:{calls:number;tracks:MediaStreamTrack[]}}).micFixture.calls);
  expect(await fixture()).toBe(0);
  await page.evaluate(()=>{(window as unknown as {micFixture:{mode:string}}).micFixture.mode='deny';});
  await panel.getByRole('button',{name:'Start microphone test'}).click();
  await expect(panel.getByRole('status')).toContainText('permission was denied');
  await page.evaluate(()=>{(window as unknown as {micFixture:{mode:string}}).micFixture.mode='delay';});
  await panel.getByRole('button',{name:'Start microphone test'}).click();
  await panel.getByRole('button',{name:'Cancel microphone request'}).click();
  await page.evaluate(()=>{(window as unknown as {micFixture:{release:()=>void}}).micFixture.release();});
  await expect.poll(()=>page.evaluate(()=>{
    const tracks=(window as unknown as {micFixture:{tracks:MediaStreamTrack[]}}).micFixture.tracks;
    return tracks.length>0&&tracks.every(t=>t.readyState==='ended');
  })).toBe(true);
  await page.evaluate(()=>{(window as unknown as {micFixture:{mode:string}}).micFixture.mode='allow';});
  await page.clock.install();
  await panel.getByRole('button',{name:'Start microphone test'}).click();
  await expect(panel.getByRole('button',{name:'Stop microphone',exact:true})).toBeVisible();
  await expect(page.locator('.voice-output')).toHaveAttribute('data-visual-state','listening');
  await page.clock.fastForward(31000);
  await expect(page.locator('.voice-output')).toHaveAttribute('data-visual-state','idle');
  await expect(panel.getByRole('status')).toContainText('30-second test finished');
  await panel.getByRole('button',{name:'Start microphone test'}).click();
  await expect(panel.getByRole('button',{name:'Stop microphone',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Lock workspace'}).click();
  await expect(panel).toHaveCount(0);
  expect(await page.evaluate(()=>(window as unknown as {micFixture:{tracks:MediaStreamTrack[]}}).micFixture.tracks.every(t=>t.readyState==='ended'))).toBe(true);
  expect(errors).toEqual([]);
});
