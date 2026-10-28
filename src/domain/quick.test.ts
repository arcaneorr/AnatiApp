import { describe, expect, it } from 'vitest';
import { messages } from '../i18n';
import { book } from './booking';
import { quickClasses, quickDays, rowAction } from './progress';
import { KID_ID, ME_ID, createDemoState } from './seed';
import { NOW, tinyState } from './testkit';
import { DAY, HOUR, MINUTE, startOfDay, weekdayOf } from './time';

const now = new Date(2026, 9, 20, 14, 0).getTime(); // Tuesday afternoon
const s = createDemoState(now);

describe('quick registration', () => {
  it('offers up to 5 days, today first, inside the booking window and never on Saturday', () => {
    const days = quickDays(s, ME_ID, now);
    expect(days.length).toBeGreaterThan(0);
    expect(days.length).toBeLessThanOrEqual(5);
    expect(days).toEqual([...days].sort((a, b) => a - b));
    expect(days[0]).toBeGreaterThanOrEqual(startOfDay(now));
    for (const d of days) {
      expect(weekdayOf(d)).not.toBe(6);
      expect(d - startOfDay(now)).toBeLessThanOrEqual(s.policy.bookingWindowDays * DAY);
    }
  });

  it("lists the day's classes in time order, at the default branch, without rehab", () => {
    const [day] = quickDays(s, ME_ID, now);
    const items = quickClasses(s, ME_ID, now, day);
    expect(items.length).toBeGreaterThan(0);
    const starts = items.map((i) => i.x.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    for (const { x } of items) {
      expect(startOfDay(x.start)).toBe(day);
      expect(x.start).toBeGreaterThanOrEqual(now + 15 * MINUTE);
      expect(x.branchId).toBe(s.account.preferredBranchId);
      expect(x.level).not.toBe('tailored');
    }
  });

  it('asks for the health declaration on every card when it is missing', () => {
    const days = quickDays(s, KID_ID, now);
    const items = days.flatMap((d) => quickClasses(s, KID_ID, now, d));
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item.action.kind).toBe('sign');
  });

  it('keeps a class on the card after booking it, marked as booked', () => {
    const days = quickDays(s, ME_ID, now);
    const open = days.flatMap((d) => quickClasses(s, ME_ID, now, d)).find((i) => i.action.kind === 'book');
    expect(open).toBeDefined();
    if (!open) return;
    const day = startOfDay(open.x.start);
    const after = book(s, open.x.id, ME_ID, now).state;
    expect(quickClasses(after, ME_ID, now, day).find((i) => i.x.id === open.x.id)?.action.kind).toBe('booked');
  });
});

describe('schedule row action', () => {
  const t = tinyState();
  it('books in one tap when there is room', () => expect(rowAction(t, t.sessions[0], 'me', NOW).kind).toBe('book'));
  it('joins the waitlist when full', () => expect(rowAction(t, t.sessions[2], 'me', NOW).kind).toBe('waitlist'));
  it('asks for the health declaration first', () => expect(rowAction(t, t.sessions[0], 'kid', NOW).kind).toBe('sign'));
  it('says when booking opens', () => expect(rowAction(t, t.sessions[5], 'me', NOW).kind).toBe('opens'));
  it('shows booked and ended states', () => {
    const booked = book(t, 'open', 'me', NOW).state;
    expect(rowAction(booked, booked.sessions[0], 'me', NOW).kind).toBe('booked');
    expect(rowAction(booked, booked.sessions[0], 'me', NOW + 3 * DAY).kind).toBe('ended');
  });
});

describe('dates in both languages', () => {
  it('says Today and Tomorrow', () => {
    const en = messages('en');
    const he = messages('he');
    expect(en.dayLabel(now + 60_000, now)).toBe('Today');
    expect(en.dayLabel(now + DAY, now)).toBe('Tomorrow');
    expect(en.dayLabel(now + 3 * DAY, now)).not.toMatch(/Today|Tomorrow/);
    expect(he.dayLabel(now + 60_000, now)).toBe('היום');
    expect(he.dayLabel(now + DAY, now)).toBe('מחר');
    expect(he.day(now)).toMatch(/^יום ג׳, 20/);
  });

  it('labels day chips briefly', () => {
    expect(messages('he').dayChip(now + 3 * DAY, now)).toBe('ו׳ 23');
    expect(messages('en').dayChip(now + 3 * DAY, now)).toBe('Fri 23');
    expect(messages('he').dayChip(now, now)).toBe('היום');
  });

  it('counts down in natural Hebrew', () => {
    const he = messages('he');
    expect(he.relative(now + 2 * HOUR, now)).toBe('בעוד שעתיים');
    expect(he.relative(now + 2 * DAY + 3 * HOUR, now)).toBe('בעוד יומיים ו־3 שעות');
    expect(he.relative(now - 5 * 60_000, now)).toBe('לפני 5 דק׳');
    expect(messages('en').relative(now + 2 * HOUR + 20 * 60_000, now)).toBe('in 2h 20m');
  });
});
