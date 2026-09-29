import { Temporal } from '@js-temporal/polyfill';
import type { Schedule, Occurrence } from '../shared/schedule.ts';
import { AppError, validTimezone } from './security.ts';

export const MISSED_GRACE_MS = 60_000;
function plain(value: string) { return Temporal.PlainDateTime.from(value, { overflow: 'reject' }); }
function stamp(value: Temporal.PlainDateTime) { return value.toString({ smallestUnit: 'minute' }); }
export function validateSchedule(schedule: Schedule) {
  try {
    if (!['once', 'daily', 'weekly'].includes(schedule.frequency) || !['next-valid', 'skip'].includes(schedule.gap) ||
        !['earlier', 'later'].includes(schedule.overlap) || !['inbox', 'skip'].includes(schedule.missed) ||
        !/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(schedule.localStart) || !validTimezone(schedule.timezone))
      throw new Error('invalid');
    plain(schedule.localStart);
  } catch { throw new AppError(400, 'INVALID_SCHEDULE'); }
}
export function occurrenceAt(schedule: Schedule, index: number): Occurrence | null {
  if (schedule.frequency === 'once' && index !== 0) return null;
  if (!Number.isSafeInteger(index) || index < 0) throw new AppError(400, 'INVALID_SCHEDULE');
  const wanted = plain(schedule.localStart).add({ days: index * (schedule.frequency === 'weekly' ? 7 : 1) });
  const earlier = wanted.toZonedDateTime(schedule.timezone, { disambiguation: 'earlier' });
  const later = wanted.toZonedDateTime(schedule.timezone, { disambiguation: 'later' });
  const exists = earlier.toPlainDateTime().equals(wanted);
  let selected = earlier;
  let adjustment: Occurrence['adjustment'] = 'none';
  if (!exists) {
    if (schedule.gap === 'skip') return null;
    // Temporal's "later" shifts by the gap. The project instead promises the
    // FIRST valid local instant after the gap (01:30 -> 02:00, not 02:30).
    const transition = earlier.getTimeZoneTransition('next');
    if (!transition || transition.epochMilliseconds > later.epochMilliseconds ||
        Temporal.PlainDateTime.compare(transition.toPlainDateTime(), wanted) < 0) throw new AppError(400, 'INVALID_SCHEDULE');
    selected = transition; adjustment = 'gap-shifted';
  } else if (earlier.epochMilliseconds !== later.epochMilliseconds) {
    selected = schedule.overlap === 'earlier' ? earlier : later;
    adjustment = schedule.overlap === 'earlier' ? 'overlap-earlier' : 'overlap-later';
  }
  return { index, dueAt: selected.epochMilliseconds, requestedLocal: stamp(wanted),
    resolvedLocal: stamp(selected.toPlainDateTime()), offset: selected.offset, adjustment };
}
export function previewSchedule(schedule: Schedule): Occurrence[] {
  validateSchedule(schedule);
  const result: Occurrence[] = [];
  for (let index = 0; index < 12 && result.length < (schedule.frequency === 'once' ? 1 : 3); index++) {
    const item = occurrenceAt(schedule, index);
    if (item && (!result.length || item.dueAt > result[result.length - 1].dueAt)) result.push(item);
    if (schedule.frequency === 'once') break;
  }
  if (!result.length) throw new AppError(400, 'NO_SCHEDULE_OCCURRENCE');
  return result;
}
// Jump by calendar date, not by elapsed 24-hour blocks or one iteration per
// missed occurrence. Work stays bounded even after years of downtime.
export function scheduleWindow(schedule: Schedule, minimumIndex: number, now: number): { latest: Occurrence | null; next: Occurrence | null } {
  if (schedule.frequency === 'once') {
    const only = occurrenceAt(schedule, 0);
    return { latest: only && only.dueAt <= now ? only : null, next: only && only.dueAt > now ? only : null };
  }
  const today = Temporal.Instant.fromEpochMilliseconds(now).toZonedDateTimeISO(schedule.timezone).toPlainDate();
  const days = plain(schedule.localStart).toPlainDate().until(today, { largestUnit: 'day' }).days;
  const near = Math.max(minimumIndex, Math.floor(days / (schedule.frequency === 'weekly' ? 7 : 1)) - 2);
  let latest: Occurrence | null = null;
  for (let index = near; index < near + 12; index++) {
    const occurrence = occurrenceAt(schedule, index);
    if (!occurrence) continue;
    if (occurrence.dueAt > now) return { latest, next: occurrence };
    latest = occurrence;
  }
  throw new AppError(503, 'SCHEDULE_ADVANCE_FAILED');
}
