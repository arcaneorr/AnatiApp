import { describe, expect, it } from 'vitest';
import { checkBooking } from './booking';
import { atRisk, scheduleSuggestions } from './insights';
import { quickClasses, quickDays, usualSession, upcomingFor } from './progress';
import { BOOKING_WINDOW_DAYS, KID_ID, ME_ID, createDemoState } from './seed';
import { DAY, HOUR } from './time';

// Several clock positions, so weekends and evenings are covered.
const CLOCKS = [
  new Date(2026, 9, 20, 14, 0).getTime(), // Tue afternoon
  new Date(2026, 9, 23, 18, 0).getTime(), // Fri evening
  new Date(2026, 9, 24, 9, 0).getTime(), // Sat morning (closed)
];

describe.each(CLOCKS)('demo world at %i', (now) => {
  const s = createDemoState(now);

  it('never overbooks a class', () => {
    for (const x of s.sessions) expect(x.bookedIds.length + x.heldIds.length).toBeLessThanOrEqual(x.capacity);
  });

  it('never lists a person twice in one class', () => {
    for (const x of s.sessions) {
      const all = [...x.bookedIds, ...x.waitlistIds, ...x.heldIds];
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it('keeps classes small: 6 to 10 spots', () => {
    for (const x of s.sessions) {
      expect(x.capacity).toBeGreaterThanOrEqual(6);
      expect(x.capacity).toBeLessThanOrEqual(10);
    }
  });

  it('has nobody booked before the booking window opens', () => {
    for (const x of s.sessions) {
      if (x.start - now > BOOKING_WINDOW_DAYS * DAY) expect(x.bookedIds.length + x.waitlistIds.length).toBe(0);
    }
  });

  it('gives Maya upcoming bookings, a waitlist spot and a bookable usual class', () => {
    const rows = upcomingFor(s, [ME_ID], now);
    expect(rows.some((r) => r.b.status === 'booked')).toBe(true);
    expect(rows.some((r) => r.b.status === 'waitlisted')).toBe(true);
    const usual = usualSession(s, ME_ID, now);
    expect(usual).toBeDefined();
    if (usual) expect(checkBooking(s, usual.id, ME_ID, now).ok).toBe(true);
  });

  it("starts Romi without a health declaration, on Anati's 10-class card", () => {
    expect(s.waivers[KID_ID]).toBeUndefined();
    expect(s.memberships[KID_ID]).toMatchObject({ planId: 'c10', creditsLeft: 10, price: 700 });
  });

  it('produces owner insights worth showing', () => {
    expect(atRisk(s.members, now).length).toBeGreaterThan(3);
    const kinds = new Set(scheduleSuggestions(s, now).map((x) => x.kind));
    expect(kinds.has('add')).toBe(true);
    expect(kinds.has('rethink')).toBe(true);
  });
});

it('is deterministic for the same clock and seed', () => {
  const now = CLOCKS[0];
  expect(JSON.stringify(createDemoState(now))).toBe(JSON.stringify(createDemoState(now)));
});

// The old render test failed at some hours because the demo had no full class then.
// Every 3 hours across a whole week, each demo scenario must be available.
describe('every demo scenario exists at any time of the week', () => {
  const start = new Date(2026, 9, 25, 0, 30).getTime(); // Sunday
  const clocks = Array.from({ length: 56 }, (_, i) => start + i * 3 * HOUR);

  it.each(clocks)('at %i', (now) => {
    const s = createDemoState(now);
    const future = s.sessions.filter((x) => x.start > now + 3 * HOUR);
    const fullForMaya = future.find((x) => {
      const c = checkBooking(s, x.id, ME_ID, now);
      return !c.ok && c.block.code === 'FULL';
    });
    expect(fullForMaya).toBeDefined();
    expect(upcomingFor(s, [ME_ID], now).some((r) => r.b.status === 'waitlisted')).toBe(true);
    const quick = (pid: string) => quickDays(s, pid, now).flatMap((d) => quickClasses(s, pid, now, d));
    expect(quick(ME_ID).some((i) => i.action.kind === 'book')).toBe(true);
    expect(quick(KID_ID).some((i) => i.action.kind === 'sign')).toBe(true);
    expect(s.memberships[ME_ID].creditsLeft).toBeGreaterThanOrEqual(2);
  });
});
