import { msgs } from '../i18n';
import {
  ACTIVE_STATUSES,
  activeBooking,
  checkBooking,
  creditKind,
  sessionById,
  sessionEnd,
  waitlistPosition,
} from './booking';
import { MINUTE, addDays, startOfDay, startOfWeek } from './time';
import type { Booking, ClassSession, ID, State } from './types';

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary';

export interface Row {
  b: Booking;
  x: ClassSession;
}

function rowsFor(s: State, profileIds: ID[]): Row[] {
  return s.bookings.filter((b) => profileIds.includes(b.profileId)).map((b) => ({ b, x: sessionById(s, b.sessionId) }));
}

export function upcomingFor(s: State, profileIds: ID[], now: number): Row[] {
  return rowsFor(s, profileIds)
    .filter((r) => r.x.start > now && ACTIVE_STATUSES.includes(r.b.status))
    .sort((a, b) => a.x.start - b.x.start);
}

/** Everything that already happened, plus cancelled or released future bookings. */
export function historyFor(s: State, profileIds: ID[], now: number): Row[] {
  return rowsFor(s, profileIds)
    .filter((r) => r.x.start <= now || !ACTIVE_STATUSES.includes(r.b.status))
    .sort((a, b) => b.x.start - a.x.start);
}

export function nextBooked(s: State, profileId: ID, now: number): Row | undefined {
  return upcomingFor(s, [profileId], now).find((r) => r.b.status === 'booked');
}

export function weekProgress(s: State, profileId: ID, now: number): { attended: number; booked: number } {
  const from = startOfWeek(now);
  const to = addDays(from, 7);
  let attended = 0;
  let booked = 0;
  for (const r of rowsFor(s, [profileId])) {
    if (r.b.status !== 'booked' || r.x.start < from || r.x.start >= to) continue;
    if (r.x.start < now) attended++;
    else booked++;
  }
  return { attended, booked };
}

/** Consecutive weeks (Sunday-based) hitting the weekly goal, counting this week once it is met. */
export function streakWeeks(s: State, profileId: ID, now: number, goal: number): number {
  const attended = rowsFor(s, [profileId])
    .filter((r) => r.b.status === 'booked' && r.x.start < now)
    .map((r) => r.x.start);
  const countIn = (from: number) => {
    const to = addDays(from, 7);
    return attended.filter((t) => t >= from && t < to).length;
  };
  const thisWeek = startOfWeek(now);
  let streak = countIn(thisWeek) >= goal ? 1 : 0;
  for (let w = addDays(thisWeek, -7), i = 0; i < 104; w = addDays(w, -7), i++) {
    if (countIn(w) < goal) break;
    streak++;
  }
  return streak;
}

/** Next open occurrence of the classes this profile attends most. */
export function usualSession(s: State, profileId: ID, now: number): ClassSession | undefined {
  const counts = new Map<ID, number>();
  for (const r of rowsFor(s, [profileId])) {
    if (r.b.status === 'booked' && r.x.start < now) counts.set(r.x.templateId, (counts.get(r.x.templateId) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const candidates = top
    .map(([templateId]) =>
      s.sessions.find((x) => x.templateId === templateId && x.start > now && !activeBooking(s, x.id, profileId)),
    )
    .filter((x): x is ClassSession => x !== undefined);
  return candidates.sort((a, b) => a.start - b.start)[0];
}

export function displayStatus(s: State, b: Booking, x: ClassSession, now: number): { label: string; tone: Tone } {
  const t = msgs(s).status;
  const started = now >= x.start;
  switch (b.status) {
    case 'booked':
      return started ? { label: t.attended, tone: 'neutral' } : { label: t.booked, tone: 'success' };
    case 'waitlisted':
      return started ? { label: t.missed, tone: 'neutral' } : { label: t.waitlist(waitlistPosition(x, b.profileId)), tone: 'warning' };
    case 'offered':
      return { label: t.held, tone: 'primary' };
    case 'cancelled':
      return { label: t.cancelled, tone: 'neutral' };
    case 'late-cancelled':
      return { label: t.lateCancel, tone: 'danger' };
    case 'left-waitlist':
      return { label: t.leftWaitlist, tone: 'neutral' };
    case 'declined':
      return { label: t.released, tone: 'neutral' };
    case 'offer-expired':
      return { label: t.holdExpired, tone: 'neutral' };
  }
}

/** What a booking used, so members can reconcile their plan. */
export function chargeLabel(s: State, b: Booking): string {
  const t = msgs(s).charge;
  if (b.status === 'booked') return b.creditUsed ? t.fromPlan(creditKind(s, b.profileId)) : t.none;
  if (b.status === 'late-cancelled') return b.creditUsed ? t.lateCounted : t.none;
  return t.none;
}

/** Classes used and the plan size, for the usage bar. */
export function planUsage(s: State, profileId: ID): { used: number; total: number } {
  const m = s.memberships[profileId];
  return { used: Math.max(0, m.creditsTotal - m.creditsLeft), total: m.creditsTotal };
}

export type RowAction =
  | { kind: 'book' }
  | { kind: 'waitlist' }
  | { kind: 'sign' }
  | { kind: 'finish' }
  | { kind: 'claim' }
  | { kind: 'booked' }
  | { kind: 'waitlisted' }
  | { kind: 'ended' }
  | { kind: 'live' }
  | { kind: 'opens'; at: number }
  | { kind: 'overlaps' }
  | { kind: 'none' };

/** What the schedule row offers in one tap for this profile. */
export function rowAction(s: State, x: ClassSession, profileId: ID, now: number): RowAction {
  if (now >= sessionEnd(x)) return { kind: 'ended' };
  if (now >= x.start) return { kind: 'live' };
  const mine = activeBooking(s, x.id, profileId);
  if (mine?.status === 'booked') return { kind: 'booked' };
  if (mine?.status === 'waitlisted') return { kind: 'waitlisted' };
  if (mine?.status === 'offered') return { kind: 'claim' };
  const check = checkBooking(s, x.id, profileId, now);
  if (check.ok) return { kind: 'book' };
  switch (check.block.code) {
    case 'FULL':
      return { kind: 'waitlist' };
    case 'NO_WAIVER':
      return { kind: 'sign' };
    case 'FROZEN':
    case 'NO_CREDITS':
      return { kind: 'finish' };
    case 'NOT_OPEN':
      return { kind: 'opens', at: check.block.opensAt };
    case 'CONFLICT':
      return { kind: 'overlaps' };
    default:
      return { kind: 'none' };
  }
}

export interface QuickItem {
  x: ClassSession;
  action: RowAction;
}

/** What quick registration shows: something to tap, or a booking already made. */
const QUICK_KINDS: RowAction['kind'][] = ['book', 'waitlist', 'sign', 'finish', 'claim', 'booked', 'waitlisted'];

/**
 * Classes on `day` for quick registration on Home: starting in 15+ minutes, at the default branch.
 * Rehab classes are left out: they are tailored to each person, so they are booked deliberately.
 */
export function quickClasses(s: State, profileId: ID, now: number, day: number): QuickItem[] {
  return s.sessions
    .filter(
      (x) =>
        startOfDay(x.start) === day &&
        x.start >= now + 15 * MINUTE &&
        x.branchId === s.account.preferredBranchId &&
        x.level !== 'tailored',
    )
    .sort((a, b) => a.start - b.start)
    .map((x) => ({ x, action: rowAction(s, x, profileId, now) }))
    .filter((item) => QUICK_KINDS.includes(item.action.kind));
}

/** The next days, today first, that have something for quick registration. */
export function quickDays(s: State, profileId: ID, now: number, limit = 5): number[] {
  const days: number[] = [];
  for (let i = 0; i <= s.policy.bookingWindowDays && days.length < limit; i++) {
    const day = addDays(startOfDay(now), i);
    if (quickClasses(s, profileId, now, day).length) days.push(day);
  }
  return days;
}
