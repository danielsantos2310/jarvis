import { openTool } from './spatial-helpers.ts';
import { test, expect } from '@playwright/test';
test('bounded capture transcribes for review; actual PCM output drives waves and stops on lock', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  let transcriptions = 0; page.on('request', r => { if (r.url().endsWith('/voice/transcribe')) transcriptions++; });
  await page.addInitScript(() => {
    const Original = AudioContext;
    const contexts: AudioContext[] = [], tracks: MediaStreamTrack[] = [];
    Object.assign(window, { voiceFixture: { contexts, tracks } });
    window.AudioContext = class extends Original { constructor(options?: AudioContextOptions) { super(options); contexts.push(this); } };
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      const context = new AudioContext(), oscillator = context.createOscillator(), destination = context.createMediaStreamDestination();
      oscillator.connect(destination); oscillator.start(); await context.resume();
      for (const track of destination.stream.getTracks()) { tracks.push(track); const stop = track.stop.bind(track); track.stop = () => { stop(); void context.close().catch(() => {}); }; }
      return destination.stream;
    } });
  });
  await page.goto('/'); await page.getByLabel('Setup code').fill('synthetic-browser-setup');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic speech passphrase');
  await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Create workspace' }).click();
  await openTool(page, 'Microphone');
  const controls = page.locator('#speech-controls');
  const panel = page.getByRole('region', { name: 'Local voice session' }); await expect(panel).toBeVisible();
  expect(transcriptions).toBe(0);
  await expect(page.getByRole('region', { name: 'Microphone test' })).toHaveCount(0);
  await expect(page.locator('.command-note')).toContainText('Local voice panel below');
  await controls.getByRole('button', { name: 'Check voice engines' }).click();
  await expect(controls.getByRole('button', { name: 'Start voice capture' })).toBeEnabled();
  await controls.getByRole('button', { name: 'Start voice capture' }).click();
  await expect(controls.getByRole('button', { name: 'Finish and transcribe' })).toBeVisible();
  await page.waitForTimeout(800);
  await controls.getByRole('button', { name: 'Finish and transcribe' }).click();
  await expect(page.getByLabel('Ask JARVIS')).toHaveValue('add task Voice review check');
  await expect(page.getByRole('button', { name: 'Complete Voice review check', exact: true })).toHaveCount(0);
  expect(transcriptions).toBe(1);
  await page.getByRole('button', { name: 'Send command' }).click();
  await openTool(page, 'Tasks & reminders');
  await expect(page.getByRole('button', { name: 'Complete Voice review check', exact: true })).toBeVisible();
  await openTool(page, 'Microphone');
  await controls.getByRole('button', { name: 'Read latest reply aloud' }).click();
  await expect(panel.locator('.voice-output [role=status]')).toHaveText('JARVIS speaking');
  await expect(panel.locator('.voice-wave-0')).not.toHaveAttribute('d', 'M0 48H600');
  await controls.getByRole('button', { name: 'Stop voice', exact: true }).click();
  await expect(panel.locator('.voice-output [role=status]')).toContainText('Standby');
  await controls.getByRole('button', { name: 'Test spoken voice' }).click();
  await expect(panel.locator('.voice-output [role=status]')).toHaveText('JARVIS speaking');
  await page.screenshot({ path: 'artifacts/local-speech.png', fullPage: true });
  await page.getByRole('button', { name: 'Lock workspace' }).click();
  await expect(panel).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const f = (window as unknown as { voiceFixture: { contexts: AudioContext[]; tracks: MediaStreamTrack[] } }).voiceFixture;
    return f.contexts.every(c => c.state === 'closed') && f.tracks.every(t => t.readyState === 'ended');
  })).toBe(true);
  expect(errors).toEqual([]);
});
