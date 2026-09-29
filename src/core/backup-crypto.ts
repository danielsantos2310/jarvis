import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'node:crypto';
import { closeSync, fsyncSync, openSync, readFileSync, fstatSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
const MAGIC = Buffer.from('JARVIS-BACKUP-1\n');
export const MAX_FILE = 32 * 1024 * 1024;
export function readBounded(path: string, max = MAX_FILE) {
  const fd = openSync(path, 'r');
  try { const stat = fstatSync(fd); if (!stat.isFile() || stat.size > max) throw new Error('RECOVERY_FILE_SIZE'); return readFileSync(fd); }
  finally { closeSync(fd); }
}
export function syncDirectory(path: string) {
  // Windows directory handles do not support this POSIX durability operation.
  if (process.platform !== 'win32') { const fd = openSync(path, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); } }
}
export function writePrivate(path: string, value: Buffer | string) {
  const fd = openSync(path, 'wx', 0o600);
  try { writeFileSync(fd, value); fsyncSync(fd); } finally { closeSync(fd); }
  syncDirectory(dirname(path));
}
export function replacePrivate(path: string, value: Buffer) {
  const temp = `${path}.${randomBytes(12).toString('hex')}.tmp`;
  try { writePrivate(temp, value); renameSync(temp, path); syncDirectory(dirname(path)); }
  finally { try { unlinkSync(temp); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; } }
}
export function seal(value: Buffer, key: Buffer, context: string): Buffer {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([cipher.update(value), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}
export function unseal(value: Buffer, key: Buffer, context: string): Buffer {
  if (value.length < 28) throw new Error('RECOVERY_AUTH_FAILED');
  try { const decipher = createDecipheriv('aes-256-gcm', key, value.subarray(0, 12));
    decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(value.subarray(12, 28));
    return Buffer.concat([decipher.update(value.subarray(28)), decipher.final()]);
  } catch { throw new Error('RECOVERY_AUTH_FAILED'); }
}
function derive(password: string, salt: Buffer): Promise<Buffer> {
  if (password.length < 12 || password.length > 128) throw new Error('BACKUP_PASSWORD_LENGTH');
  return new Promise((resolve, reject) => scrypt(password, salt, 32, { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 }, (err, key) => err ? reject(err) : resolve(key)));
}
export async function encryptBackup(value: Buffer, password: string) {
  const salt = randomBytes(32); const key = await derive(password, salt);
  try { return Buffer.concat([MAGIC, salt, seal(value, key, MAGIC.toString() + salt.toString('hex'))]); } finally { key.fill(0); }
}
export async function decryptBackup(value: Buffer, password: string) {
  if (value.length > MAX_FILE || !value.subarray(0, MAGIC.length).equals(MAGIC) || value.length < MAGIC.length + 60) throw new Error('BACKUP_FORMAT');
  const salt = value.subarray(MAGIC.length, MAGIC.length + 32); const key = await derive(password, salt);
  try { return unseal(value.subarray(MAGIC.length + 32), key, MAGIC.toString() + salt.toString('hex')); } finally { key.fill(0); }
}
