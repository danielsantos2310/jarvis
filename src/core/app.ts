import { GmailService, type GmailConfig } from './gmail.ts';
import Fastify from 'fastify';
import type { SpeechService } from './voice.ts';
import type { FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import swagger from '@fastify/swagger';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Store } from './database.ts';
import type { Owner } from './database.ts';
import { AppError, BoundedSessions, equalSecret, hashPassword, verifyPassword, validTimezone } from './security.ts';
import { previewSchedule } from './scheduling.ts';
import { scheduleSchema } from '../shared/schedule.ts';
import type { Schedule } from '../shared/schedule.ts';
import { parseCommand } from './commands.ts';
import { actionRequestSchema, commandRequestSchema } from '../shared/contracts.ts';
import type { Action, Snapshot, AutomaticBackupStatus } from '../shared/contracts.ts';
declare module 'fastify' {
  interface Session { ownerId?: string; household?: string; epoch?: number; csrf?: string; authUntil?: number }
  interface FastifyRequest { actor: Owner | null }
}
export interface AppOptions { gmail?: GmailConfig; gmailFetch?: typeof fetch; speech?: SpeechService; store: Store; port?: number; bootstrapCode: string; now?: () => number; serveWeb?: boolean; scheduler?: boolean; automaticBackupStatus?: () => AutomaticBackupStatus }
export async function createApp(options: AppOptions) {
  const store = options.store; const now = options.now ?? Date.now;
  const port = options.port ?? 3000; const origin = `http://127.0.0.1:${port}`;
  const gmail = new GmailService(options.gmail, origin, now, options.gmailFetch);
  const gmailExpiry = setInterval(() => gmail.prune(), 30000); gmailExpiry.unref();
  const started = now();
  let authBusy = false;
  let schedulerHealthy = true;
  let presence: Snapshot['presence'] = { state: 'unknown', synthetic: true, expiresAt: null };
  const app = Fastify({ logger: false, bodyLimit: 4096, requestTimeout: 10_000,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false, useDefaults: false } } });
  app.decorateRequest('actor', null);
  app.addHook('onRequest', async (req, reply) => {
    reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff')
      .header('Referrer-Policy', 'no-referrer').header('X-Frame-Options', 'DENY')
      .header('Permissions-Policy', 'microphone=(self), camera=(), geolocation=(self)')
      .header('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://api.open-meteo.com; frame-src https://www.youtube-nocookie.com; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'");
    if (req.headers.host !== `127.0.0.1:${port}`) throw new AppError(403, 'HOST_DENIED');
    if (req.headers.origin && req.headers.origin !== origin) throw new AppError(403, 'ORIGIN_DENIED');
    if (req.headers['sec-fetch-site'] === 'cross-site' && !(req.method === 'GET' && req.url.split('?')[0] === '/')) throw new AppError(403, 'ORIGIN_DENIED');
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (req.headers.origin !== origin) throw new AppError(403, 'ORIGIN_REQUIRED');
      if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') throw new AppError(415, 'JSON_REQUIRED');
    }
  });
  await app.register(rateLimit, { global: true, max: 240, timeWindow: '1 minute', keyGenerator: () => 'local',
    errorResponseBuilder: () => ({ statusCode: 429, error: 'RATE_LIMIT', message: 'Wait before trying again.' }) });
  await app.register(cookie);
  await app.register(session, {
    secret: randomBytes(32).toString('hex'), cookieName: 'jarvis_session',
    cookie: { httpOnly: true, sameSite: 'strict', secure: false, path: '/api', maxAge: 30 * 60_000 },
    saveUninitialized: false, rolling: false, store: new BoundedSessions(),
  });
  await app.register(swagger, { openapi: { info: { title: 'JARVIS local alpha API', version: '0.4.0-alpha.4' } } });
  const anonymous = new Set(['/api/session', '/api/enroll', '/api/login', '/api/public']);
  app.addHook('preHandler', async req => {
    const path = req.url.split('?')[0];
    if (!path.startsWith('/api/')) return;
    if (anonymous.has(path)) return;
    const owner = store.owner();
    if (!owner || req.session.ownerId !== owner.id || req.session.household !== owner.household ||
        req.session.epoch !== owner.epoch || !req.session.authUntil || req.session.authUntil <= now()) throw new AppError(401, 'LOGIN_REQUIRED');
    req.actor = owner;
    if (!['GET', 'HEAD'].includes(req.method) && (!req.session.csrf || !equalSecret(String(req.headers['x-csrf-token'] ?? ''), req.session.csrf)))
      throw new AppError(403, 'CSRF_REQUIRED');
  });
  app.setErrorHandler((err, _req, reply) => {
    const known = err instanceof AppError;
    const status = known ? err.statusCode : (err as { statusCode?: number }).statusCode ?? 503;
    const message = known ? err.message : status === 429 ? 'RATE_LIMIT' : status < 500 ? 'INVALID_REQUEST' : 'SERVICE_UNAVAILABLE';
    reply.code(status).send({ error: message });
  });
  const passwordSchema = { type: 'string', minLength: 12, maxLength: 128 };
  const authSchema = (enroll: boolean) => ({
    body: { type: 'object', additionalProperties: false,
      required: enroll ? ['password', 'code', 'localConsent'] : ['password'],
      properties: enroll ? { password: passwordSchema, code: { type: 'string', minLength: 1, maxLength: 100 }, localConsent: { const: true } } : { password: passwordSchema } },
  });
  async function authenticate(req: FastifyRequest, owner: Owner) {
    await req.session.regenerate();
    req.session.ownerId = owner.id; req.session.household = owner.household; req.session.epoch = owner.epoch;
    req.session.authUntil = now() + 30 * 60_000; req.session.csrf = randomBytes(32).toString('hex');
    await req.session.save();
    return { authenticated: true, setupRequired: false, csrf: req.session.csrf, expiresAt: req.session.authUntil };
  }
  app.get('/api/public', async () => ({ mode: 'local', microphone: 'manual-test', cloud: 'on-request' }));
  app.get('/api/session', async req => {
    const owner = store.owner();
    const valid = owner && req.session.ownerId === owner.id && req.session.household === owner.household &&
      req.session.epoch === owner.epoch && (req.session.authUntil ?? 0) > now();
    return valid ? { authenticated: true, setupRequired: false, csrf: req.session.csrf, expiresAt: req.session.authUntil }
      : { authenticated: false, setupRequired: !owner };
  });
  app.post<{ Body: { password: string; code: string; localConsent: true } }>('/api/enroll',
    { schema: authSchema(true), config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async req => {
      if (store.owner()) throw new AppError(409, 'ALREADY_ENROLLED');
      if (now() - started >= 10 * 60_000 || !equalSecret(req.body.code, options.bootstrapCode)) throw new AppError(403, 'SETUP_CODE_INVALID_OR_EXPIRED');
      if (authBusy) throw new AppError(429, 'AUTH_BUSY'); authBusy = true;
      try { return await authenticate(req, store.enroll(await hashPassword(req.body.password), now())); }
      finally { authBusy = false; }
    });
  app.post<{ Body: { password: string } }>('/api/login',
    { schema: authSchema(false), config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async req => {
      const owner = store.owner(); if (!owner) throw new AppError(401, 'LOGIN_FAILED');
      if (authBusy) throw new AppError(429, 'AUTH_BUSY'); authBusy = true;
      try {
        if (!await verifyPassword(req.body.password, owner.password)) {
          store.audit(owner.id, 'login', 'denied', now()); throw new AppError(401, 'LOGIN_FAILED');
        }
        // Recovery during an async hash must invalidate this login.
        if (store.owner()?.epoch !== owner.epoch) throw new AppError(401, 'LOGIN_FAILED');
        store.audit(owner.id, 'login', 'allowed', now()); return await authenticate(req, owner);
      } finally { authBusy = false; }
    });
  app.post('/api/logout', async (req, reply) => {
    gmail.forget(req.session.csrf ?? '');
    await req.session.destroy(); reply.clearCookie('jarvis_session', { path: '/api' }); return { ok: true };
  });
  app.get('/api/snapshot', async req => {
    if (!schedulerHealthy) throw new AppError(503, 'SCHEDULER_UNAVAILABLE');
    const owner = req.actor!;
    if (presence.expiresAt !== null && presence.expiresAt <= now()) presence = { state: 'unknown', synthetic: true, expiresAt: null };
    return { automaticBackups: options.automaticBackupStatus?.() ?? { state: 'off', nextAttemptAt: null }, recovery: store.recoveryStatus(), now: now(), paused: store.paused(), grant: store.canRead(owner), items: store.list(owner), notices: store.notices(owner), presence,
      services: { core: 'ready', storage: 'ready', voice: options.speech ? 'configured' : 'not-installed', model: 'not-installed', cloud: 'on-request' },
      audit: store.db.prepare('SELECT action,decision,at FROM audit WHERE owner=? ORDER BY id DESC LIMIT 8').all(owner.id) as unknown as Snapshot['audit'],
    } satisfies Snapshot;
  });
  function execute(owner: Owner, requestId: string, action: Action, intent?: string) {
    try { return store.action(owner, requestId, action, now(), intent); }
    catch (error) { store.audit(owner.id, 'action', 'denied', now()); throw error; }
  }
  app.post<{ Body: Schedule }>('/api/schedule-preview', {
    schema: { body: scheduleSchema }, config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async req => {
    if (!store.canRead(req.actor!)) throw new AppError(403, 'LOCAL_GRANT_REQUIRED');
    const occurrences = previewSchedule(req.body);
    if (occurrences[0].dueAt < now() + 500 || occurrences[0].dueAt > now() + 365 * 86_400_000) throw new AppError(400, 'DUE_TIME_RANGE');
    return { occurrences, timezone: req.body.timezone, tzdb: process.versions.tz ?? 'runtime' };
  });
  app.post<{ Body: { requestId: string; action: Action } }>('/api/actions', { schema: { body: actionRequestSchema } },
    async req => execute(req.actor!, req.body.requestId, req.body.action));
  app.post<{ Body: { requestId: string; text: string; timezone: string } }>('/api/commands', { schema: { body: commandRequestSchema } }, async req => {
    if (!validTimezone(req.body.timezone)) throw new AppError(400, 'INVALID_TIMEZONE');
    const parsed = parseCommand(req.body.text, now(), req.body.timezone);
    if ('reply' in parsed) return { reply: parsed.reply };
    const result = execute(req.actor!, req.body.requestId, parsed.action, JSON.stringify({ command: req.body.text.trim(), timezone: req.body.timezone }));
    return { reply: result.duplicate ? 'This request was already saved.' : 'Saved locally. You can inspect it in your workspace.', result };
  });
  app.post<{ Body: { change: 'stop' | 'resume' | 'grant' | 'revoke'; password?: string } }>('/api/control', {
    schema: { body: { type: 'object', additionalProperties: false, required: ['change'], properties: {
      change: { enum: ['stop', 'resume', 'grant', 'revoke'] }, password: passwordSchema,
    } } }, config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async req => {
    const { change, password } = req.body;
    if (change !== 'stop') {
      if (authBusy) throw new AppError(429, 'AUTH_BUSY'); authBusy = true;
      try {
        if (!password || !await verifyPassword(password, req.actor!.password)) throw new AppError(401, 'REAUTH_REQUIRED');
      } finally { authBusy = false; }
      if (store.owner()?.epoch !== req.actor!.epoch) throw new AppError(401, 'LOGIN_REQUIRED');
    }
    store.control(req.actor!, change, now()); if (change === 'stop' || change === 'revoke') gmail.clear(); return { ok: true };
  });
  app.post<{ Body: { state: 'occupied' | 'vacant' | 'unknown' } }>('/api/synthetic-presence', { schema: { body: {
    type: 'object', additionalProperties: false, required: ['state'], properties: { state: { enum: ['occupied', 'vacant', 'unknown'] } },
  } } }, async req => {
    presence = { state: req.body.state, synthetic: true, expiresAt: req.body.state === 'unknown' ? null : now() + 30_000 };
    return presence;
  });
  const gmailControllers = new Set<AbortController>();
  function gmailAccess(req: FastifyRequest) {
    const owner = store.owner();
    if (!owner || owner.id !== req.session.ownerId || owner.household !== req.session.household || owner.epoch !== req.session.epoch || (req.session.authUntil ?? 0) <= now()) throw new AppError(401, 'LOGIN_REQUIRED');
    if (!store.canRead(owner)) throw new AppError(403, 'LOCAL_GRANT_REQUIRED');
    if (store.paused()) throw new AppError(403, 'ACTIONS_PAUSED');
  }
  async function gmailJob<T>(req: FastifyRequest, reply: import('fastify').FastifyReply, work: (signal: AbortSignal) => Promise<T>) {
    gmailAccess(req); const key = req.session.csrf!;
    if (gmailControllers.size >= 4) throw new AppError(429, 'GMAIL_BUSY');
    const controller = new AbortController(); gmailControllers.add(controller);
    const cancel = () => { if (!reply.raw.writableEnded) controller.abort(); }; reply.raw.on('close', cancel);
    const monitor = setInterval(() => { void req.session.reload().then(() => gmailAccess(req)).catch(() => { controller.abort(); gmail.forget(key); }); }, 250);
    const timeout = setTimeout(() => controller.abort(), 25000);
    try { const result = await work(controller.signal); await req.session.reload(); gmailAccess(req); if (controller.signal.aborted) throw new AppError(409, 'GMAIL_CANCELLED'); return result; }
    finally { clearTimeout(timeout); clearInterval(monitor); reply.raw.off('close', cancel); controller.abort(); gmailControllers.delete(controller); }
  }
  app.get('/api/gmail/status', async req => { gmailAccess(req); return gmail.status(req.session.csrf!); });
  app.post('/api/gmail/connect', async req => { gmailAccess(req); return gmail.start(req.session.csrf!, req.session.authUntil!); });
  app.post<{Body:{code:string;state:string}}>('/api/gmail/complete', { schema: { body: { type: 'object', additionalProperties: false, required: ['code','state'], properties: { code: {type:'string',minLength:1,maxLength:2048}, state:{type:'string',minLength:32,maxLength:128} } } } }, async (req,reply) => gmailJob(req,reply,signal => gmail.complete(req.session.csrf!,req.body.code,req.body.state,signal)));
  app.get('/api/gmail/inbox', async (req,reply) => gmailJob(req,reply,signal => gmail.inbox(req.session.csrf!,signal)));
  app.get('/api/gmail/profile', async (req,reply) => gmailJob(req,reply,signal => gmail.profile(req.session.csrf!,signal)));
  app.get<{Params:{id:string}}>('/api/gmail/messages/:id', { schema: { params: { type:'object',required:['id'],properties:{id:{type:'string',pattern:'^[a-fA-F0-9]{1,64}$'}} } } }, async (req,reply) => gmailJob(req,reply,signal => gmail.message(req.session.csrf!,req.params.id,signal)));
  app.post('/api/gmail/disconnect', async req => gmail.disconnect(req.session.csrf!));
  app.addHook('preClose', async () => { clearInterval(gmailExpiry); for (const controller of gmailControllers) controller.abort(); gmail.clear(); });
  let voiceBusy = false;
  const voiceControllers = new Set<AbortController>();
  function voiceAccess(req: FastifyRequest) {
    const owner = store.owner();
    if (!owner || owner.epoch !== req.session.epoch || owner.id !== req.session.ownerId || owner.household !== req.session.household || (req.session.authUntil ?? 0) <= now()) throw new AppError(401, 'LOGIN_REQUIRED');
    if (!store.canRead(owner)) throw new AppError(403, 'LOCAL_GRANT_REQUIRED');
    if (store.paused()) throw new AppError(403, 'ACTIONS_PAUSED');
    if (!options.speech) throw new AppError(503, 'VOICE_DISABLED');
  }
  async function voiceJob<T>(req: FastifyRequest, reply: import('fastify').FastifyReply, work: (signal: AbortSignal) => Promise<T>) {
    voiceAccess(req);
    if (voiceBusy) throw new AppError(429, 'VOICE_BUSY');
    voiceBusy = true;
    const controller = new AbortController(); voiceControllers.add(controller);
    const cancel = () => { if (!reply.raw.writableEnded) controller.abort(); };
    reply.raw.on('close', cancel);
    // Revalidate even if another tab locks, pauses or revokes access during inference.
    const monitor = setInterval(() => { void req.session.reload().then(() => voiceAccess(req)).catch(() => controller.abort()); }, 250);
    try {
      const result = await work(controller.signal);
      await req.session.reload(); voiceAccess(req);
      if (controller.signal.aborted) throw new AppError(409, 'VOICE_CANCELLED');
      return result;
    } finally { clearInterval(monitor); reply.raw.off('close', cancel); controller.abort(); voiceControllers.delete(controller); voiceBusy = false; }
  }
  app.get('/api/voice/status', async (req, reply) => {
    if (!options.speech) return { enabled: false, stt: false, tts: false };
    return voiceJob(req, reply, async signal => ({ enabled: true, ...await options.speech!.status(signal) }));
  });
  app.post<{ Body: { pcm: string } }>('/api/voice/transcribe', {
    bodyLimit: 1_300_000, config: { rateLimit: { max: 6, timeWindow: '1 minute' } },
    schema: { body: { type: 'object', additionalProperties: false, required: ['pcm'], properties: { pcm: { type: 'string', minLength: 4268, maxLength: 1280000, pattern: '^[A-Za-z0-9+/]+={0,2}$' } } } },
  }, async (req, reply) => {
    const pcm = Buffer.from(req.body.pcm, 'base64');
    if (pcm.length < 3200 || pcm.length > 960000 || pcm.length % 2 || pcm.toString('base64') !== req.body.pcm) throw new AppError(400, 'INVALID_AUDIO');
    try { return await voiceJob(req, reply, async signal => ({ text: await options.speech!.transcribe(pcm, signal) })); }
    finally { pcm.fill(0); }
  });
  app.post<{ Body: { text: string } }>('/api/voice/speak', {
    config: { rateLimit: { max: 6, timeWindow: '1 minute' } },
    schema: { body: { type: 'object', additionalProperties: false, required: ['text'], properties: { text: { type: 'string', minLength: 1, maxLength: 500, pattern: '\\S' } } } },
  }, async (req, reply) => {
    const wav = await voiceJob(req, reply, signal => options.speech!.synthesize(req.body.text, signal));
    return reply.type('audio/wav').send(wav);
  });
  app.addHook('preClose', async () => { for (const controller of voiceControllers) controller.abort(); });
  app.get('/api/openapi.json', async () => app.swagger());
  if (options.serveWeb !== false && existsSync(resolve('dist/index.html'))) {
    await app.register(staticFiles, { root: resolve('dist'), index: 'index.html', cacheControl: false });
  }
  let interval: NodeJS.Timeout | undefined;
  if (options.scheduler !== false) {
    const tick = () => { try { store.tick(now()); schedulerHealthy = true; } catch { schedulerHealthy = false; } };
    tick(); interval = setInterval(tick, 1000); interval.unref();
  }
  app.addHook('onClose', async () => { if (interval) clearInterval(interval); });
  await app.ready();
  return app;
}
