import { loc, msgs } from '../i18n';
import { branchName, coachName, sessionEnd } from './booking';
import type { ClassSession, State } from './types';

export interface IcsEvent {
  uid: string;
  start: number;
  end: number;
  title: string;
  location: string;
  description: string;
}

/** 2026-10-20T11:00:00.000Z -> 20261020T110000Z */
export function icsDate(t: number): string {
  return new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export function buildIcs(events: IcsEvent[], now: number, reminder = 'Class reminder'): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pulse//Studio Prototype//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(e.start)}`,
      `DTEND:${icsDate(e.end)}`,
      `SUMMARY:${icsEscape(e.title)}`,
      `LOCATION:${icsEscape(e.location)}`,
      `DESCRIPTION:${icsEscape(e.description)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape(reminder)}`,
      'TRIGGER:-PT60M',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function sessionEvent(s: State, x: ClassSession): IcsEvent {
  const t = msgs(s);
  const branch = s.branches.find((b) => b.id === x.branchId);
  return {
    uid: `${x.id}@pulse.example`,
    start: x.start,
    end: sessionEnd(x),
    title: t.ics.title(x.type, loc(s, s.studioName)),
    location: branch ? `${loc(s, branch.name)}, ${loc(s, branch.address)}` : branchName(s, x.branchId),
    description: t.ics.description(coachName(s, x.coachId), x.level),
  };
}
