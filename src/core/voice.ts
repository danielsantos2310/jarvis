import { createConnection } from 'node:net';
import { AppError } from './security.ts';
export interface SpeechService {
  status(signal: AbortSignal): Promise<{ stt: boolean; tts: boolean }>;
  transcribe(pcm: Buffer, signal: AbortSignal): Promise<string>;
  synthesize(text: string, signal: AbortSignal): Promise<Buffer>;
}
type Event = { type: string; data: Record<string, unknown>; payload: Buffer };
export function voiceEvent(type: string, data = {}, payload: Buffer = Buffer.alloc(0)): Buffer {
  return Buffer.concat([Buffer.from(JSON.stringify({ type, data, payload_length: payload.length }) + '\n'), payload]);
}
/** Bounded Wyoming JSONL/PCM exchange. Connections are hard-coded to loopback. */
function exchange<T>(port: number, outgoing: Buffer[], signal: AbortSignal, consume: (event: Event) => T | undefined, timeout = 60_000): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new AppError(409, 'VOICE_CANCELLED')); return; }
    const socket = createConnection({ host: '127.0.0.1', port });
    let pending = Buffer.alloc(0), total = 0, done = false;
    const finish = (error?: Error, result?: T) => {
      if (done) return; done = true; clearTimeout(timer); signal.removeEventListener('abort', abort); socket.destroy();
      pending = Buffer.alloc(0); if (error) reject(error); else resolve(result!);
    };
    const abort = () => finish(new AppError(409, 'VOICE_CANCELLED'));
    const timer = setTimeout(() => finish(new AppError(504, 'VOICE_TIMEOUT')), timeout);
    signal.addEventListener('abort', abort, { once: true });
    socket.on('error', () => finish(new AppError(503, 'VOICE_UNAVAILABLE')));
    socket.on('close', () => { if (!done) finish(new AppError(503, 'VOICE_INCOMPLETE')); });
    socket.on('connect', () => { for (const frame of outgoing) socket.write(frame); });
    socket.on('data', chunk => {
      try {
        total += chunk.length;
        if (total > 4_000_000) throw new Error('Limit');
        pending = Buffer.concat([pending, chunk]);
        while (!done) {
          const newline = pending.indexOf(10);
          if (newline < 0) { if (pending.length > 8192) throw new Error('Header'); break; }
          if (newline > 8192) throw new Error('Header');
          const header = JSON.parse(pending.subarray(0, newline).toString('utf8'));
          const dl = header.data_length ?? 0, pl = header.payload_length ?? 0;
          if (!Number.isInteger(dl) || dl < 0 || dl > 8192 || !Number.isInteger(pl) || pl < 0 || pl > 192000 || typeof header.type !== 'string') throw new Error('Frame');
          const end = newline + 1 + dl + pl;
          if (pending.length < end) break;
          const extra = dl ? JSON.parse(pending.subarray(newline + 1, newline + 1 + dl).toString('utf8')) : {};
          const event = { type: header.type, data: { ...header.data, ...extra }, payload: pending.subarray(newline + 1 + dl, end) };
          pending = pending.subarray(end);
          if (event.type === 'error') throw new Error('Worker');
          const result = consume(event);
          if (result !== undefined) finish(undefined, result);
        }
      } catch { finish(new AppError(502, 'VOICE_PROTOCOL_ERROR')); }
    });
  });
}
export function makeWav(pcm: Buffer, rate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(pcm.length + 36, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
export function localSpeech(sttPort = 10300, ttsPort = 10200): SpeechService {
  for (const port of [sttPort, ttsPort]) if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid voice port');
  return {
    async status(signal) {
      const probe = async (port: number, kind: string) => {
        try { return await exchange(port, [voiceEvent('describe')], signal, e => e.type === 'info' ? Array.isArray(e.data[kind]) && (e.data[kind] as unknown[]).length > 0 : undefined, 2000); }
        catch { return false; }
      };
      const [stt, tts] = await Promise.all([probe(sttPort, 'asr'), probe(ttsPort, 'tts')]); return { stt, tts };
    },
    transcribe(pcm, signal) {
      const format = { rate: 16000, width: 2, channels: 1 };
      const frames = [voiceEvent('transcribe', { language: 'en' }), voiceEvent('audio-start', format)];
      for (let i = 0; i < pcm.length; i += 32000) frames.push(voiceEvent('audio-chunk', format, pcm.subarray(i, i + 32000)));
      frames.push(voiceEvent('audio-stop'));
      return exchange(sttPort, frames, signal, event => {
        if (event.type !== 'transcript') return;
        const text = event.data.text;
        if (typeof text !== 'string' || text.length > 500) throw new Error('Transcript');
        return text.trim();
      });
    },
    synthesize(text, signal) {
      const chunks: Buffer[] = []; let rate = 0, size = 0;
      return exchange(ttsPort, [voiceEvent('synthesize', { text })], signal, event => {
        if (event.type === 'audio-start') {
          if (rate || !Number.isInteger(event.data.rate) || Number(event.data.rate) < 8000 || Number(event.data.rate) > 48000 || event.data.width !== 2 || event.data.channels !== 1) throw new Error('Format');
          rate = Number(event.data.rate);
        } else if (event.type === 'audio-chunk') {
          if (!rate || event.data.rate !== rate || event.data.width !== 2 || event.data.channels !== 1 || event.payload.length % 2) throw new Error('Format');
          size += event.payload.length; if (size > rate * 2 * 30) throw new Error('Duration');
          chunks.push(Buffer.from(event.payload));
        } else if (event.type === 'audio-stop') {
          if (!rate || !size) throw new Error('Empty');
          return makeWav(Buffer.concat(chunks), rate);
        }
      });
    },
  };
}
