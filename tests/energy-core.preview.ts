import {test,expect} from '@playwright/test';
import {openTool} from './spatial-helpers.ts';

test('energy core works without WebGL and responds to selection, speech preview and motion preferences',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('./');
  const core=page.locator('.energy-core'),surface=page.locator('.voice-output'),rotor=core.locator('.energy-rotor');
  await expect(core).toBeVisible();await expect(core.locator('image,canvas,foreignObject')).toHaveCount(0);
  const rotation=await rotor.evaluate(el=>getComputedStyle(el).transform);
  await expect.poll(()=>rotor.evaluate(el=>getComputedStyle(el).transform)).not.toBe(rotation);
  await page.screenshot({path:'artifacts/energy-idle-desktop.png'});
  await openTool(page,'Weather');await expect(core).toHaveAttribute('data-focused','true');
  await expect(core.locator('.energy-focus')).toHaveCSS('opacity','0.9');
  await page.getByRole('button',{name:'Close panel',exact:true}).click();
  await expect(core).toHaveAttribute('data-focused','false');
  await page.getByRole('button',{name:'Preview waves',exact:true}).click();
  await expect(surface).toHaveAttribute('data-visual-state','speaking');
  await expect.poll(async()=>Number(await surface.evaluate(el=>getComputedStyle(el).getPropertyValue('--core-energy')))).toBeGreaterThan(.2);
  await page.screenshot({path:'artifacts/energy-speaking.png'});
  await page.getByRole('button',{name:'Stop preview',exact:true}).click();
  await expect(surface).toHaveAttribute('data-visual-state','idle');
  await expect(surface).toHaveCSS('--core-energy','0');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(rotor).toHaveCSS('animation-name','none');
  await expect(core.locator('.energy-idle-breath')).toHaveCSS('animation-name','none');
  await page.getByRole('button',{name:'Preview waves',exact:true}).click();
  await expect(surface).toHaveCSS('--core-energy','0');
  await page.getByRole('button',{name:'Stop preview',exact:true}).click();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(rotor).toHaveCSS('animation-play-state','paused');
  const frozen=await rotor.evaluate(el=>getComputedStyle(el).transform);await page.waitForTimeout(180);
  expect(await rotor.evaluate(el=>getComputedStyle(el).transform)).toBe(frozen);
  expect(errors).toEqual([]);
});

test('mobile core and touch tools retain their space and selection behavior',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'no-preference'});
  const page=await context.newPage();await page.goto('http://127.0.0.1:3099/jarvis/');
  await page.screenshot({path:'artifacts/energy-mobile.png'});
  const core=page.locator('.energy-core'),box=await core.boundingBox();expect(box!.width).toBeGreaterThan(200);expect(box!.x).toBeGreaterThan(0);
  await page.getByRole('navigation',{name:'Floating tools'}).getByRole('button',{name:'Music',exact:true}).tap();
  await expect(core).toHaveAttribute('data-focused','true');
  await expect(page.locator('.voice-output')).toHaveAttribute('data-visual-state','idle');
  await expect(page.getByRole('button',{name:'Close panel',exact:true})).toBeVisible();
  await context.close();
});
