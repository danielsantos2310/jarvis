import {test,expect} from '@playwright/test';
import {openTool} from './spatial-helpers.ts';
// Exercise the actual shader with software GL, unlike the general no-GPU suite.
test.use({reducedMotion:'no-preference',launchOptions:{executablePath:process.env.JARVIS_TEST_CHROME,args:['--no-sandbox','--no-zygote','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});

test('live face looks at selected and moved tools, speaks, blinks, rests and falls back',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');const face=page.locator('.avatar-live');
  await expect(face).toHaveAttribute('data-ready','true');
  const idle=await face.screenshot();
  await page.waitForFunction(()=>{const face=document.querySelector<HTMLElement>('.avatar-live');if(Number(face?.dataset.blink)>.8){Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));return true;}return false;},undefined,{timeout:10000});
  const closed=await face.screenshot();expect(closed.equals(idle)).toBe(false);
  await page.screenshot({path:'artifacts/avatar-blink.png'});
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await openTool(page,'Weather');
  await expect.poll(async()=>Number(await face.getAttribute('data-gaze-x'))).toBeGreaterThan(.2);
  await expect.poll(async()=>Number(await face.getAttribute('data-gaze-y'))).toBeLessThan(-.2);
  await page.screenshot({path:'artifacts/avatar-looking.png'});
  const icon=page.getByRole('navigation',{name:'Floating tools'}).getByRole('button',{name:'Weather',exact:true});
  await icon.focus();await page.keyboard.press('Shift+ArrowLeft');
  await page.getByRole('button',{name:'Close panel',exact:true}).click();
  await expect.poll(async()=>Math.abs(Number(await face.getAttribute('data-gaze-x')))).toBeLessThan(.02);
  await page.getByRole('button',{name:'Preview waves',exact:true}).click();
  await expect.poll(async()=>Number(await face.getAttribute('data-mouth'))).toBeGreaterThan(.15);
  await page.screenshot({path:'artifacts/avatar-speaking.png'});
  await page.getByRole('button',{name:'Stop preview',exact:true}).click();
  await expect(face).toHaveAttribute('data-mouth','0.000');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(face).toHaveAttribute('data-motion','reduced');
  await expect(face).toHaveAttribute('data-blink','0.000');
  const still=await face.evaluate(el=>(el as HTMLCanvasElement).toDataURL());await page.waitForTimeout(250);
  expect(await face.evaluate((el,previous)=>(el as HTMLCanvasElement).toDataURL()===previous,still)).toBe(true);
  await expect(face).toHaveAttribute('data-blink','0.000');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(face).toHaveAttribute('data-motion','paused');
  const frozen=await face.evaluate(el=>(el as HTMLCanvasElement).toDataURL());await page.waitForTimeout(150);
  expect(await face.evaluate((el,previous)=>(el as HTMLCanvasElement).toDataURL()===previous,frozen)).toBe(true);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await face.evaluate(el=>(el as HTMLCanvasElement).getContext('webgl')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(face).toHaveAttribute('data-ready','false');
  await expect(page.locator('.avatar-portrait')).toHaveCSS('opacity','0.93');
  expect(errors).toEqual([]);
});

test('touch selection moves attention without turning on microphone',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'no-preference'});
  const page=await context.newPage();await page.goto('http://127.0.0.1:3099/jarvis/');
  const face=page.locator('.avatar-live');await expect(face).toHaveAttribute('data-ready','true');
  await page.getByRole('navigation',{name:'Floating tools'}).getByRole('button',{name:'Music',exact:true}).tap();
  await expect.poll(async()=>Number(await face.getAttribute('data-gaze-x'))).toBeLessThan(-.2);
  await expect(page.locator('.voice-output')).toHaveAttribute('data-visual-state','idle');
  await page.screenshot({path:'artifacts/avatar-touch.png'});await context.close();
});
