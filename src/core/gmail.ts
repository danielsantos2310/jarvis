import { createHash, randomBytes } from 'node:crypto';
import { AppError, equalSecret } from './security.ts';
export const gmailScope = 'https://www.googleapis.com/auth/gmail.readonly';
export type GmailConfig = { clientId: string; clientSecret: string };
type Connection = { state?: string; verifier?: string; pendingUntil?: number; token?: string; expires?: number; sessionUntil: number; controller: AbortController };
/** Session-only credentials. No refresh tokens, disk persistence, email cache or logging. */
export class GmailService {
  private connections = new Map<string, Connection>();
  private config: GmailConfig | undefined;
  private origin: string;
  private now: () => number;
  private transport: typeof fetch;
  constructor(config: GmailConfig | undefined, origin: string, now = Date.now, transport: typeof fetch = fetch) { this.config = config; this.origin = origin; this.now = now; this.transport = transport; }
  status(key: string) { this.prune(); const entry = this.connections.get(key); return { configured: !!this.config, connected: !!entry?.token && (entry.expires ?? 0) > this.now() }; }
  prune() { for (const [key, entry] of this.connections) if (entry.sessionUntil <= this.now() || (entry.token && (entry.expires ?? 0) <= this.now()) || (entry.state && (entry.pendingUntil ?? 0) <= this.now())) this.forget(key); }
  forget(key: string) { this.connections.get(key)?.controller.abort(); this.connections.delete(key); }
  clear() { for (const key of this.connections.keys()) this.forget(key); }
  start(key: string, sessionUntil: number) {
    if (!this.config) throw new AppError(503, 'GMAIL_SETUP_REQUIRED');
    this.prune(); this.forget(key);
    if (this.connections.size >= 16) throw new AppError(429, 'GMAIL_BUSY');
    const state = randomBytes(32).toString('base64url'), verifier = randomBytes(32).toString('base64url');
    this.connections.set(key, { state, verifier, pendingUntil: this.now() + 300000, sessionUntil, controller: new AbortController() });
    const query = new URLSearchParams({ client_id: this.config.clientId, redirect_uri: `${this.origin}/`, response_type: 'code', scope: gmailScope, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', access_type: 'online', prompt: 'consent select_account' });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${query}` };
  }
  private async json(url: string, options: RequestInit, signal: AbortSignal) {
    const response = await this.transport(url, { ...options, redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) });
    if (!response.ok) { await response.body?.cancel(); throw new AppError(response.status === 401 ? 401 : 502, response.status === 401 ? 'GMAIL_RECONNECT_REQUIRED' : 'GMAIL_PROVIDER_ERROR'); }
    // Bound even chunked upstream responses before parsing.
    const reader = response.body?.getReader(); if (!reader) throw new AppError(502, 'GMAIL_PROVIDER_ERROR');
    let size = 0; const chunks: Uint8Array[] = [];
    try { for (;;) { const {done,value} = await reader.read(); if (done) break; size += value.byteLength; if (size > 2_000_000) throw new AppError(502, 'GMAIL_MESSAGE_TOO_LARGE'); chunks.push(value); } }
    finally { await reader.cancel().catch(() => {}); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AppError(502, 'GMAIL_PROVIDER_ERROR'); }
  }
  async complete(key: string, code: string, state: string, signal: AbortSignal) {
    const entry = this.connections.get(key);
    if (!this.config || !entry?.state || !equalSecret(entry.state, state) || (entry.pendingUntil ?? 0) <= this.now()) throw new AppError(400, 'GMAIL_AUTH_EXPIRED');
    const verifier = entry.verifier!; entry.state = undefined; entry.verifier = undefined; // one use, including failed exchanges
    try {
      const data = await this.json('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: this.config.clientId, client_secret: this.config.clientSecret, code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: `${this.origin}/` }) }, AbortSignal.any([signal, entry.controller.signal]));
      if (this.connections.get(key) !== entry || signal.aborted || !data.scope?.split(' ').includes(gmailScope) || typeof data.access_token !== 'string' || data.access_token.length > 8192 || !Number.isFinite(data.expires_in) || data.expires_in <= 0 || data.token_type?.toLowerCase() !== 'bearer') throw new AppError(403, 'GMAIL_READ_PERMISSION_REQUIRED');
      entry.token = data.access_token; entry.expires = Math.min(this.now() + data.expires_in * 1000, entry.sessionUntil); return { connected: true };
    } catch (error) { if (this.connections.get(key) === entry) this.forget(key); throw error; }
  }
  private async get(key: string, path: string, signal: AbortSignal) {
    this.prune(); const entry = this.connections.get(key);
    if (!entry?.token) throw new AppError(409, 'GMAIL_RECONNECT_REQUIRED');
    try {
      const data = await this.json(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, { headers: { Authorization: `Bearer ${entry.token}` } }, AbortSignal.any([signal, entry.controller.signal]));
      if (this.connections.get(key) !== entry || signal.aborted) throw new AppError(409, 'GMAIL_CANCELLED');
      return data;
    } catch (error) { if (error instanceof AppError && error.message === 'GMAIL_RECONNECT_REQUIRED') this.forget(key); throw error; }
  }
  async inbox(key: string, signal: AbortSignal) {
    const list = await this.get(key, 'messages?maxResults=10&labelIds=INBOX', signal);
    if (list.messages !== undefined && !Array.isArray(list.messages)) throw new AppError(502, 'GMAIL_PROVIDER_ERROR');
    const messages = [];
    for (const item of (list.messages ?? []).slice(0,10)) {
      if (!/^[a-f0-9]{1,64}$/i.test(item.id)) throw new AppError(502, 'GMAIL_PROVIDER_ERROR');
      const message = await this.get(key, `messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, signal);
      messages.push(this.overview(message));
    }
    return { messages };
  }
  async profile(key: string, signal: AbortSignal) {
    const data = await this.get(key,'profile',signal);
    if (typeof data.emailAddress !== 'string' || data.emailAddress.length > 320 || !data.emailAddress.includes('@')) throw new AppError(502,'GMAIL_PROVIDER_ERROR');
    return {emailAddress:data.emailAddress};
  }
  private overview(data: any) {
    const header = (name: string) => String((data.payload?.headers ?? []).find((h: any) => String(h.name).toLowerCase() === name)?.value ?? '').slice(0,1000);
    return { id: String(data.id), subject: header('subject') || '(No subject)', from: header('from'), date: header('date'), excerpt: String(data.snippet ?? '').slice(0,1500) };
  }
  async message(key: string, id: string, signal: AbortSignal) {
    const data = await this.get(key, `messages/${id}?format=full`, signal);
    const parts: string[] = []; let length = 0; let truncated = false;
    function walk(part: any, depth = 0) {
      if (!part || depth > 10) return;
      if (part.mimeType === 'text/plain' && !part.filename && typeof part.body?.data === 'string') { const text = Buffer.from(part.body.data, 'base64url').toString('utf8'); if (length + text.length > 20000) truncated = true; parts.push(text.slice(0, Math.max(0,20000-length))); length += text.length; }
      for (const child of (Array.isArray(part.parts) ? part.parts : []).slice(0,50)) walk(child, depth + 1);
    }
    walk(data.payload);
    return { ...this.overview(data), body: parts.join('\n').slice(0,20000) || 'No plain-text body available. Open Gmail to read this message.', truncated };
  }
  async disconnect(key: string) {
    const token = this.connections.get(key)?.token; this.forget(key);
    if (!token) return { disconnected: true, revoked: true };
    try { const response = await this.transport('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }), signal: AbortSignal.timeout(5000), redirect: 'error' }); await response.body?.cancel(); return { disconnected: true, revoked: response.ok }; }
    catch { return { disconnected: true, revoked: false }; }
  }
}
