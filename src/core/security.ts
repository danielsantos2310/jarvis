import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import type { SessionStore } from '@fastify/session';
import type { Session } from 'fastify';
export class AppError extends Error {
  statusCode: number;
  constructor(status: number, code: string) { super(code); this.statusCode = status; }
}
export function equalSecret(a: string, b: string): boolean {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
async function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCallback(password, salt, 64,
    { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 }, (err, key) => err ? reject(err) : resolve(key)));
}
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 128) throw new AppError(400, 'PASSWORD_LENGTH');
  const salt = randomBytes(32).toString('hex');
  return `${salt}:${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (password.length > 128) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  return equalSecret((await derive(password, salt)).toString('hex'), hash);
}
// An explicitly bounded process-local session store. Restart invalidates every session.
export class BoundedSessions implements SessionStore {
  entries = new Map<string, { session: Session; expires: number }>();
  prune() { for (const [id, value] of this.entries) if (value.expires <= Date.now()) this.entries.delete(id); }
  set(id: string, session: Session, callback: (error?: Error) => void) {
    this.prune();
    if (!this.entries.has(id) && this.entries.size >= 100) return callback(new Error('SESSION_LIMIT'));
    this.entries.set(id, { session: structuredClone(session), expires: Math.min(Date.now() + 30 * 60_000, session.authUntil ?? Infinity) });
    callback();
  }
  get(id: string, callback: (error: Error | null, session?: Session | null) => void) {
    this.prune(); callback(null, this.entries.has(id) ? structuredClone(this.entries.get(id)!.session) : null);
  }
  destroy(id: string, callback: (error?: Error) => void) { this.entries.delete(id); callback(); }
}
export function validTimezone(value: string): boolean {
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true; } catch { return false; }
}
