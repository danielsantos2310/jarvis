/** Local, non-authoritative demo replies. Never executes commands or reads accounts. */
export function previewReply(text: string, now = new Date()): string {
  const words = text.trim().toLowerCase().replace(/[?!.,]/g, '');
  if (/\b(time|clock)\b/.test(words)) return `The time on this device is ${new Intl.DateTimeFormat('en-GB', {hour:'numeric',minute:'2-digit'}).format(now)}.`;
  if (/\b(date|day)\b/.test(words)) return `Today is ${new Intl.DateTimeFormat('en-GB', {weekday:'long',day:'numeric',month:'long'}).format(now)}.`;
  if (/\b(hello|hi|hey|jarvis)\b/.test(words)) return 'Hello Daniel. I am here. You can ask me the time, the date, or what this preview can do.';
  if (/\b(help|can you do|status)\b/.test(words)) return 'I can give simple preview replies, tell the time and date, and greet you after a clap. My AI mind and real account actions are not connected in this preview.';
  return 'I heard you, but this is a limited voice preview, not an AI conversation yet. Try asking the time, the date, or saying hello. No command was executed.';
}

/** A transient loud sound after quiet; not clap identification or identity proof. */
export function clapDetector() {
  let quietSince: number | null = null;
  let armed = false;
  let onset: number | null = null;
  return (rms: number, peak: number, now: number): boolean => {
    if (onset !== null) {
      const age = now - onset;
      if (rms < .035 && age >= 20 && age <= 220) { onset = null; armed = false; return true; }
      if (age > 220) { onset = null; armed = false; quietSince = null; }
      return false;
    }
    if (rms < .035) {
      quietSince ??= now;
      if (now - quietSince >= 500) armed = true;
    } else {
      quietSince = null;
      if (armed && rms > .1 && peak > .45) onset = now;
      else if (rms > .07) armed = false;
    }
    return false;
  };
}
