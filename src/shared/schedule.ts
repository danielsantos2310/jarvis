export interface Schedule {
  frequency: 'once' | 'daily' | 'weekly';
  localStart: string;
  timezone: string;
  gap: 'next-valid' | 'skip';
  overlap: 'earlier' | 'later';
  missed: 'inbox' | 'skip';
}
export interface Occurrence {
  index: number;
  dueAt: number;
  requestedLocal: string;
  resolvedLocal: string;
  offset: string;
  adjustment: 'none' | 'gap-shifted' | 'overlap-earlier' | 'overlap-later';
}
export interface SchedulePreview { occurrences: Occurrence[]; timezone: string; tzdb: string }
export const scheduleSchema = {
  type: 'object', additionalProperties: false,
  required: ['frequency', 'localStart', 'timezone', 'gap', 'overlap', 'missed'],
  properties: {
    frequency: { enum: ['once', 'daily', 'weekly'] },
    localStart: { type: 'string', pattern: '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$' },
    timezone: { type: 'string', minLength: 1, maxLength: 80 },
    gap: { enum: ['next-valid', 'skip'] }, overlap: { enum: ['earlier', 'later'] }, missed: { enum: ['inbox', 'skip'] },
  },
} as const;
