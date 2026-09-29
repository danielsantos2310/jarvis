import type { Schedule } from './schedule.ts';
import { scheduleSchema } from './schedule.ts';
export type ItemKind = 'task' | 'reminder' | 'timer';
export interface Item {
  id: string; kind: ItemKind; title: string; dueAt: number | null;
  timezone: string; schedule: Schedule | null; createdAt: number; state: 'active' | 'done';
}
export interface Notice { id: string; itemId: string; title: string; kind: ItemKind; dueAt: number; late: boolean }
export interface Snapshot {
  recovery: { configured: boolean; deletionSync: 'synced' | 'pending' | 'not-configured'; lastBackupAt: number | null };
  now: number; paused: boolean; grant: boolean; items: Item[]; notices: Notice[];
  presence: { state: 'occupied' | 'vacant' | 'unknown'; synthetic: true; expiresAt: number | null };
  services: { core: 'ready'; storage: 'ready'; voice: 'not-installed'; model: 'not-installed'; cloud: 'disabled' };
  audit: { action: string; decision: string; at: number }[];
}
export type Action =
  | { type: 'item.create'; kind: ItemKind; title: string; dueAt?: number; timezone?: string; schedule?: Schedule; expectedDueAt?: number }
  | { type: 'item.complete' | 'item.delete' | 'notice.dismiss'; id: string };
export type Command = { action: Action } | { reply: string };
const text = { type: 'string', minLength: 1, maxLength: 160, pattern: '\\S' } as const;
const id = { type: 'string', format: 'uuid' } as const;
export const actionSchema = {
  oneOf: [
    { type: 'object', additionalProperties: false, required: ['type', 'kind', 'title'], properties: {
      type: { const: 'item.create' }, kind: { enum: ['task', 'reminder', 'timer'] }, title: text,
      schedule: scheduleSchema, expectedDueAt: { type: 'integer', minimum: 0 },
      dueAt: { type: 'integer', minimum: 0 }, timezone: { type: 'string', minLength: 1, maxLength: 80 },
    } },
    { type: 'object', additionalProperties: false, required: ['type', 'id'], properties: {
      type: { enum: ['item.complete', 'item.delete', 'notice.dismiss'] }, id,
    } },
  ],
} as const;
export const actionRequestSchema = {
  type: 'object', additionalProperties: false, required: ['requestId', 'action'],
  properties: { requestId: id, action: actionSchema },
} as const;
export const commandRequestSchema = {
  type: 'object', additionalProperties: false, required: ['requestId', 'text', 'timezone'],
  properties: { requestId: id, text: { type: 'string', minLength: 1, maxLength: 500 },
    timezone: { type: 'string', minLength: 1, maxLength: 80 } },
} as const;
