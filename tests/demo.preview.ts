import { test, expect } from '@playwright/test';
test('static preview works under the project path without backend or browser storage', async ({ page }) => {
  const errors: string[] = [], unexpected: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:3099/jarvis/')) unexpected.push(r.url()); });
  await page.goto('./');
  await expect(page.getByRole('region', {name:'Preview information'})).toBeVisible();
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  const send = async (text: string) => { await page.getByLabel('Ask JARVIS').fill(text); await page.getByRole('button',{name:'Send command'}).click(); };
  await send('add task <img src=x onerror=alert(1)>');
  await expect(page.getByRole('button',{name:'Complete <img src=x onerror=alert(1)>',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Delete <img src=x onerror=alert(1)>',exact:true}).click();
  await send('timer 2 seconds');
  await expect(page.locator('.notice').filter({hasText:'2 seconds timer'})).toBeVisible({timeout:10000});
  await page.getByRole('button',{name:'Open sensor simulator'}).click();
  await page.getByRole('button',{name:'occupied',exact:true}).click();
  await expect(page.locator('.simulation')).toContainText('Test room: occupied');
  await page.getByRole('button',{name:'Controls',exact:true}).click();
  await page.getByRole('button',{name:'Pause actions & delivery',exact:true}).click();
  await page.getByLabel('Change',{exact:true}).selectOption('resume');
  await page.getByRole('button',{name:'Apply change'}).click();
  await page.getByRole('button',{name:'Controls',exact:true}).click();
  await page.getByLabel('Change',{exact:true}).selectOption('revoke');
  await page.getByRole('button',{name:'Apply change'}).click();
  await expect(page.getByRole('button',{name:'Complete Explore your JARVIS workspace',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Controls',exact:true}).click();
  await page.getByLabel('Change',{exact:true}).selectOption('grant');
  await page.getByRole('button',{name:'Apply change'}).click();
  await send('add task Reset check');
  await expect(page.getByRole('button',{name:'Complete Reset check',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Reset demo',exact:true}).click();
  await expect(page.getByRole('button',{name:'Complete Reset check',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Complete Explore your JARVIS workspace',exact:true})).toBeVisible();
  await page.screenshot({path:'artifacts/pages-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);
  await page.screenshot({path:'artifacts/pages-mobile.png',fullPage:true});
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(page.getByLabel('Ask JARVIS')).toBeVisible();
    await expect(page.getByRole('button',{name:'Controls',exact:true})).toBeVisible();
  }
  await expect(page.locator('.core-display')).toHaveAttribute('aria-hidden','true');
  expect(unexpected).toEqual([]); expect(errors).toEqual([]);
});

test('public microphone meter requires permission, releases tracks and makes no audio requests', async ({ page }) => {
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const fixture = { calls: 0, denied: false, tracks: [] as MediaStreamTrack[] };
    Object.assign(window, { publicMic: fixture });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      fixture.calls++;
      if (fixture.denied) throw new DOMException('Denied', 'NotAllowedError');
      const context = new AudioContext(), oscillator = context.createOscillator(), output = context.createMediaStreamDestination();
      oscillator.connect(output); oscillator.start(); await context.resume();
      for (const track of output.stream.getTracks()) {
        fixture.tracks.push(track); const stop = track.stop.bind(track);
        track.stop = () => { stop(); void context.close().catch(() => {}); };
      }
      return output.stream;
    } });
  });
  await page.goto('./');
  const panel = page.getByRole('region', { name: 'Microphone test' });
  await expect(panel).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { publicMic: { calls: number } }).publicMic.calls)).toBe(0);
  // Initial static assets have loaded. Any subsequent request would be unexpected.
  page.on('request', r => requests.push(r.url()));
  await page.evaluate(() => { (window as unknown as { publicMic: { denied: boolean } }).publicMic.denied = true; });
  await panel.getByRole('button', { name: 'Start microphone test' }).click();
  await expect(panel.getByRole('status')).toContainText('permission was denied');
  await page.evaluate(() => { (window as unknown as { publicMic: { denied: boolean } }).publicMic.denied = false; });
  await page.clock.install();
  await panel.getByRole('button', { name: 'Start microphone test' }).click();
  await expect.poll(() => panel.getByRole('meter').evaluate(e => (e as HTMLMeterElement).value)).toBeGreaterThan(0);
  await page.clock.fastForward(31000);
  await expect(panel.getByRole('status')).toContainText('30-second test finished');
  const released = () => page.evaluate(() => (window as unknown as { publicMic: { tracks: MediaStreamTrack[] } }).publicMic.tracks.every(t => t.readyState === 'ended'));
  expect(await released()).toBe(true);
  await panel.getByRole('button', { name: 'Start microphone test' }).click();
  await panel.getByRole('button', { name: 'Stop microphone', exact: true }).click();
  expect(await released()).toBe(true);
  await panel.getByRole('button', { name: 'Start microphone test' }).click();
  await expect(panel.getByRole('button', { name: 'Stop microphone', exact: true })).toBeVisible();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(panel.getByRole('status')).toContainText('tab is hidden');
  expect(await released()).toBe(true);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); });
  await panel.getByRole('button', { name: 'Start microphone test' }).click();
  await expect(panel.getByRole('button', { name: 'Stop microphone', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Controls', exact: true }).click();
  await page.getByRole('button', { name: 'Pause actions & delivery', exact: true }).click();
  await expect(panel).toHaveCount(0);
  expect(await released()).toBe(true);
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});
