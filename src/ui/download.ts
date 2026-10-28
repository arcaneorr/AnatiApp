import { buildIcs, sessionEvent } from '../domain/ics';
import { isoDate } from '../domain/time';
import type { ClassSession, State } from '../domain/types';
import { msgs } from '../i18n';

export function downloadText(filename: string, text: string, mime = 'text/calendar'): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download one or more classes as an .ics file (opens in Apple/Google/Outlook calendars). */
export function downloadSessions(s: State, sessions: ClassSession[], now: number): void {
  if (!sessions.length) return;
  const name = sessions.length === 1 ? `${sessions[0].type}-${isoDate(sessions[0].start)}` : `${s.wordmark}-classes`;
  const ics = buildIcs(
    sessions.map((x) => sessionEvent(s, x)),
    now,
    msgs(s).ics.reminder,
  );
  downloadText(`${name.replace(/\s+/g, '-').toLowerCase()}.ics`, ics);
}
