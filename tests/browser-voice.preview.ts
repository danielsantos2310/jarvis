import {test,expect} from '@playwright/test';
import {openTool} from './spatial-helpers.ts';
test('device voice uses only local voices, starts explicitly and stops on close, hide and pause',async({page})=>{
  await page.addInitScript(()=>{
    const events=new EventTarget();
    const state={calls:0,cancels:0,active:null as any,voices:[] as any[]};
    Object.defineProperty(window,'voiceFixture',{value:state});
    Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class {text:string;constructor(text:string){this.text=text;}}});
    Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>state.voices,speak:(u:any)=>{state.calls++;state.active=u;u.onstart?.();},cancel:()=>{state.cancels++;},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)}});
    Object.defineProperty(window,'loadFixtureVoices',{value:()=>{state.voices=[{name:'Remote voice',voiceURI:'remote',lang:'en-GB',localService:false},{name:'Local British',voiceURI:'local',lang:'en-GB',localService:true}];events.dispatchEvent(new Event('voiceschanged'));}});
  });
  const requests:string[]=[];await page.goto('./');
  // Finish loading the decorative portrait before observing speech-related traffic.
  await page.locator('.avatar-portrait').evaluate(async el=>{const img=new Image();img.src=el.getAttribute('href')!;await img.decode();});
  page.on('request',r=>requests.push(r.url()));
  await openTool(page,'Microphone');const panel=page.getByRole('region',{name:'Device voice test'});
  await expect(panel.getByRole('button',{name:'Test device voice',exact:true})).toBeDisabled();
  await page.evaluate(()=>(window as any).loadFixtureVoices());
  await expect(panel.getByLabel('Device voice').locator('option')).toHaveCount(1);
  expect(await page.evaluate(()=>(window as any).voiceFixture.calls)).toBe(0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await panel.getByRole('button',{name:'Test device voice',exact:true}).click();
  await expect(page.getByText('Device speaking · illustrative waves')).toBeVisible();
  expect(await page.evaluate(()=>(window as any).voiceFixture.active.voice.localService)).toBe(true);
  await panel.getByRole('button',{name:'Stop device voice',exact:true}).click();
  await expect(panel.getByRole('status')).toHaveText('Voice stopped.');
  await panel.getByRole('button',{name:'Test device voice',exact:true}).click();
  await page.getByRole('button',{name:'Close panel'}).click();
  await expect(page.getByText('Device speaking · illustrative waves')).toHaveCount(0);
  await openTool(page,'Microphone');await panel.getByRole('button',{name:'Test device voice',exact:true}).click();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(panel.getByRole('status')).toContainText('tab is hidden');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.install();
  await panel.getByRole('button',{name:'Test device voice',exact:true}).click();
  await page.clock.fastForward(46000);
  await expect(panel.getByRole('status')).toContainText('45-second limit');
  await panel.getByRole('button',{name:'Test device voice',exact:true}).click();
  await page.getByRole('button',{name:'Controls',exact:true}).click();await page.getByRole('button',{name:'Pause actions & delivery'}).click();
  await expect(panel).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).voiceFixture.cancels)).toBe(5);
  expect(requests).toEqual([]);
});

test('ambient energy moves without playback controls, respects reduced motion, and stays behind touch tools',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('./');
  const field=page.locator('.neural-field');const first=await field.evaluate(el=>(el as HTMLCanvasElement).toDataURL());
  await expect.poll(()=>field.evaluate(el=>(el as HTMLCanvasElement).toDataURL())).not.toBe(first);
  await expect(page.locator('.voice-output')).toHaveAttribute('data-visual-state','idle');
  await expect(page.locator('.voice-output-heading')).toHaveCSS('clip-path','inset(50%)');
  await expect(page.getByRole('button',{name:/background motion/i})).toHaveCount(0);
  const ribbon=page.locator('.orbital-wave-0');
  const position=await ribbon.evaluate(el=>getComputedStyle(el).transform);
  await expect.poll(()=>ribbon.evaluate(el=>getComputedStyle(el).transform)).not.toBe(position);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(ribbon).toHaveCSS('animation-play-state','paused');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(ribbon).toHaveCSS('animation-play-state','running');
  await page.screenshot({path:'artifacts/ambient-desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Restore icons and reset layout'}).click();
  await page.screenshot({path:'artifacts/ambient-mobile.png'});await openTool(page,'Tasks & reminders');
  await expect(page.getByLabel('Task title')).toBeVisible();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(async()=>{const still=await field.evaluate(el=>(el as HTMLCanvasElement).toDataURL());await page.waitForTimeout(150);return field.evaluate((el,previous)=>(el as HTMLCanvasElement).toDataURL()===previous,still);}).toBe(true);
  await expect(ribbon).toHaveCSS('animation-name','none');
});


test('email voice reads only requested displayed text, advances chunks and stops on close',async({page})=>{
  await page.addInitScript(()=>{
    const state={texts:[] as string[],active:null as any,cancels:0};
    Object.defineProperty(window,'emailVoice',{value:state});
    Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class {text:string;constructor(text:string){this.text=text;}}});
    Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Local test',voiceURI:'local',lang:'en-GB',localService:true}],speak:(u:any)=>{state.texts.push(u.text);state.active=u;u.onstart?.();},cancel:()=>{state.cancels++;},addEventListener:()=>{},removeEventListener:()=>{}}});
  });
  await page.goto('./');await openTool(page,'Email');
  const reader=page.getByRole('region',{name:'Read email aloud'});
  expect(await page.evaluate(()=>(window as any).emailVoice.texts.length)).toBe(0);
  await page.getByRole('button',{name:'Full message',exact:true}).click();
  await reader.getByRole('button',{name:'Read displayed email aloud'}).click();
  await expect(page.getByText('Device speaking · illustrative waves')).toBeVisible();
  await page.evaluate(()=>(window as any).emailVoice.active.onend());
  expect(await page.evaluate(()=>(window as any).emailVoice.texts.length)).toBeGreaterThan(1);
  expect(await page.evaluate(()=>(window as any).emailVoice.texts.join(''))).toContain('fictional example');
  await page.getByRole('button',{name:'Summary',exact:true}).click();
  await expect(page.getByText('Device speaking · illustrative waves')).toHaveCount(0);
  await reader.getByRole('button',{name:'Read displayed email aloud'}).click();
  await page.getByRole('button',{name:'Close panel'}).click();
  expect(await page.evaluate(()=>(window as any).emailVoice.cancels)).toBeGreaterThan(0);
  await expect(page.getByText('Device speaking · illustrative waves')).toHaveCount(0);
});
