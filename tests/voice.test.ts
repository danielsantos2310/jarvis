import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localSpeech, voiceEvent } from '../src/core/voice.ts';
import { createApp } from '../src/core/app.ts';
import { Store } from '../src/core/database.ts';
import { hashPassword } from '../src/core/security.ts';
async function worker(response: Buffer) {
  let incoming = Buffer.alloc(0);
  const server = createServer(socket => { socket.on('error', () => {}); socket.on('data', chunk => {
    incoming = Buffer.concat([incoming, chunk]);
    if (incoming.includes('audio-stop') || incoming.includes('synthesize') || incoming.includes('describe')) {
      // Force header/data/payload across TCP reads.
      socket.write(response.subarray(0, 11)); setTimeout(() => socket.end(response.subarray(11)), 5);
    }
  }); });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  return { port: (server.address() as { port: number }).port, get incoming() { return incoming; }, close: () => new Promise<void>(r => server.close(() => r())) };
}
test('Wyoming handles fragmented headers, additional JSON and PCM, sending English 16k audio', async () => {
  const extra = Buffer.from(JSON.stringify({ text: 'timer 5 minutes' }));
  const asr = await worker(Buffer.concat([Buffer.from(JSON.stringify({ type: 'transcript', data_length: extra.length }) + '\n'), extra]));
  const format = { rate: 22050, width: 2, channels: 1 };
  const tts = await worker(Buffer.concat([voiceEvent('audio-start', format), voiceEvent('audio-chunk', format, Buffer.alloc(4410)), voiceEvent('audio-stop')]));
  try {
    const speech = localSpeech(asr.port, tts.port);
    assert.equal(await speech.transcribe(Buffer.alloc(3200), new AbortController().signal), 'timer 5 minutes');
    assert(asr.incoming.includes('"language":"en"')); assert(asr.incoming.includes('"rate":16000'));
    const wav = await speech.synthesize('Hello', new AbortController().signal);
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF'); assert.equal(wav.readUInt32LE(24), 22050); assert.equal(wav.length, 4454);
  } finally { await asr.close(); await tts.close(); }
});
test('Wyoming rejects oversized frames and invalid audio formats; abort closes work', async () => {
  for (const response of [Buffer.from('{"type":"audio-chunk","payload_length":999999999}\n'), voiceEvent('audio-start', { rate: 22050, width: 4, channels: 2 })]) {
    const w = await worker(response);
    try { await assert.rejects(localSpeech(w.port, w.port).synthesize('Hello', new AbortController().signal), /VOICE_PROTOCOL_ERROR/); }
    finally { await w.close(); }
  }
  const server = createServer(socket => socket.on('error', () => {}));
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const controller = new AbortController();
  const promise = localSpeech((server.address() as { port: number }).port).transcribe(Buffer.alloc(3200), controller.signal);
  controller.abort(); await assert.rejects(promise, /VOICE_CANCELLED/);
  await new Promise<void>(r => server.close(() => r()));
});
test('voice API requires auth/CSRF/grant, bounds audio, does not execute transcripts and cancels on pause', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'jarvis-voice-')), store = new Store(join(dir, 'test.sqlite'));
  const password = 'Synthetic voice passphrase'; store.enroll(await hashPassword(password), Date.now());
  let calls = 0, hold = false, started: () => void = () => {};
  const app = await createApp({ store, bootstrapCode: 'test', scheduler: false, serveWeb: false, speech: {
    status: async () => ({ stt: true, tts: true }), synthesize: async () => Buffer.alloc(0),
    transcribe: async (_pcm, signal) => { calls++; if (hold) { started(); await new Promise<void>((_, reject) => signal.addEventListener('abort', () => reject(new Error('Cancelled')), { once: true })); } return 'add task Must review'; },
  } });
  let cookie = '', csrf = '';
  const request = (url: string, body?: unknown, extra = {}) => app.inject({ method: body === undefined ? 'GET' : 'POST', url,
    headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', cookie, 'x-csrf-token': csrf, ...(body ? { 'content-type': 'application/json' } : {}), ...extra }, ...(body ? { payload: JSON.stringify(body) } : {}) });
  try {
    assert.equal((await request('/api/voice/status')).statusCode, 401);
    const login = await request('/api/login', { password }); cookie = String(login.headers['set-cookie']).split(';')[0]; csrf = login.json().csrf;
    assert.equal((await request('/api/voice/status')).json().stt, true);
    const audio = { pcm: Buffer.alloc(3200).toString('base64') };
    assert.equal((await request('/api/voice/transcribe', audio, { 'x-csrf-token': 'bad' })).statusCode, 403);
    assert.equal((await request('/api/voice/transcribe', { pcm: 'AAAA' })).statusCode, 400);
    assert.equal((await request('/api/voice/transcribe', { pcm: Buffer.alloc(960002).toString('base64') })).statusCode, 400);
    assert.equal((await request('/api/voice/transcribe', audio)).json().text, 'add task Must review');
    assert.equal(store.list(store.owner()!).length, 0); assert.equal(calls, 1);
    hold = true; const began = new Promise<void>(r => { started = r; });
    const job = request('/api/voice/transcribe', audio); void job.then(() => {}); await began;
    assert.equal((await request('/api/voice/speak', { text: 'test' })).statusCode, 429);
    await request('/api/control', { change: 'stop' });
    assert.notEqual((await job).statusCode, 200);
    assert.equal((await request('/api/voice/speak', { text: 'test' })).statusCode, 403);
    assert(!JSON.stringify(store.db.prepare('SELECT * FROM audit').all()).includes('Must review'));
  } finally { await app.close(); store.close(); rmSync(dir, { recursive: true, force: true }); }
});
