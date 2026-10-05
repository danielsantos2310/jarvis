import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { localSpeech } from '../core/voice.ts';
export type Check = { name: string; state: 'pass' | 'fail' | 'optional'; detail: string; next?: string };
export type VoiceReport = { readyForBrowserTest: boolean; checks: Check[]; limits: string[] };
const docker = (args: string[]) => new Promise<boolean>(resolve => {
  execFile('docker', args, { timeout: 4000, maxBuffer: 32768, windowsHide: true }, error => resolve(!error));
});
export async function checkVoice(options: {
  root?: string; version?: string; sttPort?: number; ttsPort?: number;
  dockerCheck?: (args: string[]) => Promise<boolean>;
  probe?: () => Promise<{ stt: boolean; tts: boolean }>;
} = {}): Promise<VoiceReport> {
  const root = options.root ?? process.cwd(), version = options.version ?? process.versions.node;
  const parts = version.split('.').map(Number);
  const nodeOK = parts[0] === 24 && parts[1] >= 19;
  const checks: Check[] = [{ name: 'Node runtime', state: nodeOK ? 'pass' : 'fail', detail: `Node ${version}`, ...(!nodeOK ? { next: 'Use the project-required Node 24.19 or later within Node 24.' } : {}) }];
  for (const [name, path, next] of [
    ['Local dashboard build', 'dist/index.html', 'Run npm run build from the repository root.'],
    ['Microphone capture module', 'dist/voice-capture.js', 'Run npm run build to include the capture module.'],
  ]) {
    const present = existsSync(resolve(root, path)); checks.push({ name, state: present ? 'pass' : 'fail', detail: present ? 'Present' : 'Missing', ...(!present ? { next } : {}) });
  }
  const dockerCheck = options.dockerCheck ?? docker;
  const dockerReady = await dockerCheck(['info', '--format', '{{.ServerVersion}}']);
  checks.push({ name: 'Docker engine', state: dockerReady ? 'pass' : 'optional', detail: dockerReady ? 'Responded' : 'Unavailable or not installed; native Wyoming workers can also be used.', ...(!dockerReady ? { next: 'For the supplied Compose setup, start Docker Desktop with Linux containers.' } : {}) });
  if (dockerReady) {
    const compose = await dockerCheck(['compose', 'version']);
    checks.push({ name: 'Docker Compose', state: compose ? 'pass' : 'optional', detail: compose ? 'Available' : 'Unavailable', ...(!compose ? { next: 'Enable Docker Compose, or run compatible local workers separately.' } : {}) });
  }
  const sttPort = options.sttPort ?? Number(process.env.JARVIS_STT_PORT ?? 10300);
  const ttsPort = options.ttsPort ?? Number(process.env.JARVIS_TTS_PORT ?? 10200);
  let engines = { stt: false, tts: false };
  if (![sttPort, ttsPort].every(p => Number.isInteger(p) && p >= 1024 && p <= 65535)) {
    checks.push({ name: 'Worker port configuration', state: 'fail', detail: 'Invalid port', next: 'Use integer JARVIS_STT_PORT/JARVIS_TTS_PORT values from 1024 to 65535, or unset them for defaults.' });
  } else {
    try { engines = await (options.probe?.() ?? localSpeech(sttPort, ttsPort).status(AbortSignal.timeout(3000))); } catch { /* Report availability, never raw worker errors or paths. */ }
    for (const [name, port, responded] of [['Whisper', sttPort, engines.stt], ['Piper', ttsPort, engines.tts]] as const) {
      checks.push({ name, state: responded ? 'pass' : 'fail', detail: responded ? `Responded on 127.0.0.1:${port}` : `No compatible response on 127.0.0.1:${port}`, ...(!responded ? { next: 'Start the workers: docker compose -f deploy/voice.compose.yaml up -d. Allow initial model downloads to finish, then retry.' } : {}) });
    }
  }
  return { readyForBrowserTest: !checks.some(c => c.state === 'fail'), checks,
    limits: ['Read-only checks: no microphone, audio playback, model downloads, account access or workspace changes.', 'A protocol response does not prove model accuracy, voice quality, offline operation or Windows microphone compatibility.', 'Build presence does not establish freshness. Rebuild after pulling source changes.'] };
}
