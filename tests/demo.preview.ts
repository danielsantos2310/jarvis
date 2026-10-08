import { test, expect } from '@playwright/test';
import { openTool } from './spatial-helpers.ts';
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
  await openTool(page, 'Microphone');
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


test('floating icons drag, hide, restore, open sample tools and animate without a backend', async ({ page }) => {
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('./');
  page.on('request', r => requests.push(r.url()));
  const tools = page.getByRole('navigation', { name: 'Floating tools' });
  await expect(tools.getByRole('button')).toHaveCount(14);
  await expect(page.locator('.hud-panel')).toBeHidden();
  await page.screenshot({ path: 'artifacts/floating-desktop.png' });
  const email = tools.getByRole('button', { name: 'Email', exact: true });
  const before = (await email.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down(); await page.mouse.move(before.x - 70, before.y - 50, { steps: 8 }); await page.mouse.up();
  expect((await email.boundingBox())!.x).toBeLessThan(before.x - 30);
  await expect(page.locator('.hud-panel')).toBeHidden();
  await email.focus(); const x = (await email.boundingBox())!.x;
  await page.keyboard.press('ArrowRight'); expect((await email.boundingBox())!.x).toBeGreaterThan(x);
  await page.keyboard.press('Delete'); await expect(email).toHaveCount(0);
  await openTool(page, 'Commands'); await page.getByLabel('Ask JARVIS').fill('bring email back'); await page.getByRole('button', { name: 'Send command', exact: true }).click();
  await expect(email).toHaveCount(1);
  await expect(page.getByText('No email account connected.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Full message', exact: true }).click();
  await expect(page.locator('.sample-email .email-body[role=status]')).toContainText('fictional example');
  await page.screenshot({ path: 'artifacts/floating-email.png' });
  await page.getByRole('button', { name: 'Expand panel', exact: true }).click();
  await expect(page.locator('.hud-panel')).toHaveClass(/is-expanded/);
  await page.getByRole('button', { name: 'Restore panel size', exact: true }).click();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Preview waves', exact: true }).click();
  const ring = page.locator('.reactive-rings circle'); const first = await ring.getAttribute('r');
  await expect.poll(() => ring.getAttribute('r')).not.toBe(first);
  await page.screenshot({ path: 'artifacts/floating-waves.png' });
  await page.getByRole('button', { name: 'Stop preview', exact: true }).click();
  await expect(ring).toHaveAttribute('r', '135');
  await openTool(page, 'Tasks & reminders');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByLabel('Task title')).toBeFocused();
  await page.getByLabel('Task title').fill('<img src=x onerror=alert(1)>'); await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Complete <img src=x onerror=alert(1)>', exact: true })).toBeVisible();
  await expect(page.locator('.item img')).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete <img src=x onerror=alert(1)>', exact: true }).click();
  await openTool(page, 'Timers'); await page.getByRole('button', { name: '15 MIN', exact: true }).click();
  await expect(page.locator('.timer-row').filter({ hasText: '15 minutes timer' })).toBeVisible();
  await openTool(page, 'Commands'); await page.getByLabel('Ask JARVIS').fill('add task Mobile test'); await page.getByRole('button', { name: 'Send command' }).click();
  await openTool(page, 'Tasks & reminders'); await expect(page.getByRole('button', { name: 'Complete Mobile test', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close panel' }).click();
  for (const width of [320,390,768,1024]) {
    await page.setViewportSize({ width, height:844 });
    await page.getByRole('button', { name: 'Restore icons and reset layout' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for(const box of await tools.getByRole('button').evaluateAll(els => els.map(el => ({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y,w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})))) { expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0); expect(box.w).toBeGreaterThanOrEqual(44); }
    await openTool(page, 'Tasks & reminders'); await expect(page.getByLabel('Task title')).toBeVisible();
    await page.getByRole('button', { name: 'Close panel' }).click();
    if(width===390) await page.screenshot({path:'artifacts/floating-mobile.png'});
  }
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0,0]);
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test('touch drag moves; double tap hides and restores tools; Escape cancels movement', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, baseURL });
  const page = await context.newPage(); await page.goto('./');
  await page.getByRole('button', { name: 'Controls', exact: true }).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  const email = page.getByRole('navigation', { name: 'Floating tools' }).getByRole('button', { name: 'Email', exact: true });
  const box = (await email.boundingBox())!;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
  for (let step = 1; step <= 10; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width / 2 + (195 - box.x - box.width / 2) * step / 10, y: box.y + box.height / 2 + (825 - box.y - box.height / 2) * step / 10 }] });
    await page.waitForTimeout(40); // Model a human drag instead of a zero-duration swipe.
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(email).toHaveCount(1);
  await expect(page.getByText('Drop here to hide')).toHaveCount(0);
  await cdp.detach();
  await email.tap(); await email.tap();
  await expect(email).toHaveCount(0);
  await page.getByRole('button', { name: 'Restore icons and reset layout' }).tap();
  await expect(email).toHaveCount(1);
  const restored = (await email.boundingBox())!;
  await page.mouse.move(restored.x + 29, restored.y + 29); await page.mouse.down();
  await page.mouse.move(200, 300); await page.keyboard.press('Escape'); await page.mouse.up();
  expect((await email.boundingBox())!.x).toBeCloseTo(restored.x, 0);
  await expect(page.locator('.hud-panel')).toBeHidden();
  await page.setViewportSize({width:1920,height:1080});
  await page.getByRole('button',{name:'Restore icons and reset layout'}).tap();
  await email.tap(); await email.tap();
  await expect(email).toHaveCount(0);
  await context.close();
});

test('double-click hides without opening, opacity and keyboard restore remain usable', async ({ page }) => {
  await page.goto('./');
  const tools = page.getByRole('navigation', { name: 'Floating tools' });
  const email = tools.getByRole('button', { name: 'Email', exact: true });
  expect(await email.evaluate(el => getComputedStyle(el).opacity)).toBe('0.5');
  await email.dblclick();
  await expect(email).toHaveCount(0); await expect(page.locator('.hud-panel')).toBeHidden();
  await page.getByRole('button', { name: 'Restore icons and reset layout' }).click();
  await email.focus(); await page.keyboard.press('Enter');
  await expect(page.getByText('No email account connected.', { exact: true })).toBeVisible();
});

test('weather and YouTube require explicit consent, handle failures, and unload on close', async ({ page }) => {
  let weatherCalls = 0, youtubeCalls = 0;
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {value: {getCurrentPosition: (ok: (p: unknown) => void) => ok({coords:{latitude:53.349805,longitude:-6.26031}})}});
  });
  await page.route('https://api.open-meteo.com/**', async route => {
    weatherCalls++;
    const url = new URL(route.request().url()); expect(url.searchParams.get('latitude')).toBe('53.35'); expect(url.searchParams.get('longitude')).toBe('-6.26');
    if (weatherCalls === 1) await route.fulfill({status:503,body:'Unavailable'});
    else await route.fulfill({json:{timezone:'Europe/Dublin',current:{temperature_2m:15,apparent_temperature:13,wind_speed_10m:12,relative_humidity_2m:70,weather_code:3,time:'2026-10-05T12:00'}}});
  });
  await page.route('https://www.youtube-nocookie.com/**', async route => {youtubeCalls++; await route.fulfill({contentType:'text/html',body:'<p>Fixture player</p>'});});
  await page.goto('./'); await openTool(page,'Weather'); expect(weatherCalls).toBe(0);
  await page.getByRole('button',{name:'Use my location for weather'}).click();
  await expect(page.getByRole('alert')).toContainText('Weather is unavailable');
  await page.getByRole('button',{name:'Use my location for weather'}).click();
  await expect(page.locator('.weather-reading')).toHaveText('15°C');
  await openTool(page,'Music'); expect(youtubeCalls).toBe(0);
  await page.getByLabel('YouTube link').fill('https://evil.test/watch?v=dQw4w9WgXcQ');
  await page.getByRole('button',{name:'Load YouTube player'}).click();
  await expect(page.getByRole('alert')).toContainText('HTTPS YouTube'); expect(youtubeCalls).toBe(0);
  await page.getByLabel('YouTube link').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await page.getByRole('button',{name:'Load YouTube player'}).click();
  await expect(page.locator('iframe')).toHaveAttribute('src','https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=0');
  await expect.poll(() => youtubeCalls).toBe(1);
  await page.screenshot({path:'artifacts/services-music.png'});
  await page.getByRole('button',{name:'Close panel'}).click(); await expect(page.locator('iframe')).toHaveCount(0);
});

test('weather denial is recoverable and late location after closing sends nothing', async ({ page }) => {
  let requests = 0;
  await page.route('https://api.open-meteo.com/**', async route => {requests++;await route.abort();});
  await page.addInitScript(() => {
    const state = window as unknown as { deny: boolean; resolveLocation?: (point: unknown) => void }; state.deny = true;
    Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(ok:(point:unknown)=>void,fail:()=>void)=>{if(state.deny) fail();else state.resolveLocation=ok;}}});
  });
  await page.goto('./'); await openTool(page,'Weather');
  await page.getByRole('button',{name:'Use my location for weather'}).click();
  await expect(page.getByRole('alert')).toContainText('denied or unavailable');
  await page.evaluate(() => {(window as unknown as {deny:boolean}).deny=false;});
  await page.getByRole('button',{name:'Use my location for weather'}).click();
  await expect(page.getByRole('button',{name:'Finding your weather…'})).toBeDisabled();
  await page.getByRole('button',{name:'Close panel'}).click();
  await page.evaluate(() => {(window as unknown as {resolveLocation:(point:unknown)=>void}).resolveLocation({coords:{latitude:53.35,longitude:-6.26}});});
  expect(requests).toBe(0);
});
