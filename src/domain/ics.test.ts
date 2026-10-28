import { describe, expect, it } from 'vitest';
import { buildIcs, icsDate, icsEscape, sessionEvent } from './ics';
import { createDemoState } from './seed';

describe('calendar export', () => {
  it('formats UTC dates and escapes text', () => {
    expect(icsDate(Date.UTC(2026, 9, 20, 11, 5, 9))).toBe('20261020T110509Z');
    expect(icsEscape('a, b; c\nd')).toBe('a\\, b\\; c\\nd');
  });

  it('builds a CRLF calendar with a reminder', () => {
    const ics = buildIcs([{ uid: 'u1', start: 0, end: 3_600_000, title: 'Reformer', location: 'Eilat', description: 'x' }], 0);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('TRIGGER:-PT60M');
    expect(ics).toContain('DESCRIPTION:Class reminder');
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('names the class and studio in the app language', () => {
    const now = new Date(2026, 9, 20, 14, 0).getTime();
    const he = createDemoState(now, 'he');
    const en = createDemoState(now, 'en');
    const x = he.sessions.find((s) => s.type === 'Reformer' && s.start > now);
    expect(x).toBeDefined();
    if (!x) return;
    expect(sessionEvent(he, x).title).toBe('פילאטיס רפורמר בענתי פילאטיס');
    expect(sessionEvent(en, x).title).toBe('Reformer Pilates at Anati Pilates');
    expect(sessionEvent(en, x).location).toContain('Dudaim');
  });
});
