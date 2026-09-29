import type { Command } from '../shared/contracts.ts';
const help = 'Try “add task Buy milk”, “timer 5 minutes” or “remind me in 10 minutes to stretch”. Commands run locally. Open-ended AI conversation arrives in a later milestone.';
export function parseCommand(text: string, now: number, timezone: string): Command {
  const input = text.trim();
  if (/^(help|what can you do)[?.!]?$/i.test(input)) return { reply: help };
  if (/^(status|hello|hi)[!.]?$/i.test(input)) return { reply: 'The local core is online. Voice, AI models and cloud services are not connected. Your tasks and timers stay on this PC.' };
  const task = /^(?:add|create) task (.{1,160})$/i.exec(input);
  if (task) return { action: { type: 'item.create', kind: 'task', title: task[1].trim(), timezone } };
  const timer = /^(?:set |start )?timer (\d{1,4}) (second|minute|hour)s?$/i.exec(input);
  const reminder = /^remind me in (\d{1,4}) (second|minute|hour)s? to (.{1,160})$/i.exec(input);
  const match = timer ?? reminder;
  if (match) {
    const duration = Number(match[1]) * ({ second: 1000, minute: 60_000, hour: 3_600_000 }[match[2].toLowerCase()] ?? 0);
    if (duration < 1000 || duration > 7 * 86_400_000) return { reply: 'Choose a duration between 1 second and 7 days.' };
    return { action: { type: 'item.create', kind: timer ? 'timer' : 'reminder',
      title: timer ? `${match[1]} ${match[2].toLowerCase()}${Number(match[1]) === 1 ? '' : 's'} timer` : match[3].trim(), dueAt: now + duration, timezone } };
  }
  return { reply: `I could not match that command. ${help}` };
}
