import { loc, msgs } from '../i18n';
import { PLANS, TOP_UP_PLAN } from './plans';
import { DAY, HOUR, MINUTE, addDays, addMonths, startOfDay } from './time';
import type { Booking, BookingStatus, ClassSession, CreditKind, ID, Membership, Notice, Outcome, State } from './types';

export const ACTIVE_STATUSES: readonly BookingStatus[] = ['booked', 'waitlisted', 'offered'];

const ok = (state: State, text: string, kind: Notice['kind'] = 'success'): Outcome => ({
  state,
  notices: [{ kind, text }],
});
const fail = (state: State, text: string): Outcome => ({ state, notices: [{ kind: 'error', text }] });

// ---------- lookups ----------

export function sessionById(s: State, id: ID): ClassSession {
  const found = s.sessions.find((x) => x.id === id);
  if (!found) throw new Error(`Unknown session ${id}`);
  return found;
}

export const sessionEnd = (x: ClassSession): number => x.start + x.durationMin * MINUTE;

export const spotsLeft = (x: ClassSession): number =>
  Math.max(0, x.capacity - x.bookedIds.length - x.heldIds.length);

export function activeBooking(s: State, sessionId: ID, profileId: ID): Booking | undefined {
  return s.bookings.find(
    (b) => b.sessionId === sessionId && b.profileId === profileId && ACTIVE_STATUSES.includes(b.status),
  );
}

export function waitlistPosition(x: ClassSession, profileId: ID): number {
  const i = x.waitlistIds.indexOf(profileId);
  return i < 0 ? 0 : i + 1;
}

export const isOurProfile = (s: State, id: ID): boolean => s.account.profiles.some((p) => p.id === id);

export function branchName(s: State, id: ID): string {
  const b = s.branches.find((x) => x.id === id);
  return b ? loc(s, b.name) : msgs(s).fallback.branch;
}

export function coachName(s: State, id: ID): string {
  const c = s.coaches.find((x) => x.id === id);
  return c ? loc(s, c.name) : msgs(s).fallback.coach;
}

export function profileName(s: State, id: ID): string {
  const p = s.account.profiles.find((x) => x.id === id);
  return p ? loc(s, p.name) : msgs(s).fallback.member;
}

export function personName(s: State, id: ID): string {
  const p = s.account.profiles.find((x) => x.id === id) ?? s.members.find((m) => m.id === id);
  return p ? loc(s, p.name) : msgs(s).fallback.member;
}

export const describeSession = (s: State, x: ClassSession): string => msgs(s).session(x.type, x.start);

export const creditKind = (s: State, profileId: ID): CreditKind => s.memberships[profileId]?.kind ?? 'card';

// ---------- immutable helpers ----------

function withSession(s: State, id: ID, fn: (x: ClassSession) => ClassSession): State {
  return { ...s, sessions: s.sessions.map((x) => (x.id === id ? fn(x) : x)) };
}

function withBooking(s: State, id: ID, patch: Partial<Booking>): State {
  return { ...s, bookings: s.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)) };
}

function withMembership(s: State, profileId: ID, patch: Partial<Membership>): State {
  return { ...s, memberships: { ...s.memberships, [profileId]: { ...s.memberships[profileId], ...patch } } };
}

/** Every Anati plan counts classes: a monthly quota or a class card. */
const usesCredits = (s: State, profileId: ID): boolean => s.memberships[profileId] !== undefined;

function consumeCredit(s: State, profileId: ID): State {
  const m = s.memberships[profileId];
  return m ? withMembership(s, profileId, { creditsLeft: Math.max(0, m.creditsLeft - 1) }) : s;
}

function refundCredit(s: State, profileId: ID): State {
  const m = s.memberships[profileId];
  return m ? withMembership(s, profileId, { creditsLeft: m.creditsLeft + 1 }) : s;
}

const newBookingId = (sessionId: ID, profileId: ID, now: number): ID => `b-${sessionId}-${profileId}-${now}`;

function bookedSessions(s: State, profileId: ID): ClassSession[] {
  return s.bookings
    .filter((b) => b.profileId === profileId && b.status === 'booked')
    .map((b) => sessionById(s, b.sessionId));
}

// ---------- booking rules ----------

export type Block =
  | { code: 'PAST' }
  | { code: 'NOT_OPEN'; opensAt: number }
  | { code: 'ALREADY' }
  | { code: 'FROZEN'; until: number }
  | { code: 'NO_CREDITS'; kind: CreditKind; expired: boolean; total: number; renewsOn?: number }
  | { code: 'NO_WAIVER' }
  | { code: 'CONFLICT'; sessionId: ID }
  | { code: 'FULL' };

export type Check = { ok: true; warnings: string[] } | { ok: false; block: Block };

export function checkBooking(
  s: State,
  sessionId: ID,
  profileId: ID,
  now: number,
  opts: { ignoreCapacity?: boolean } = {},
): Check {
  const t = msgs(s);
  const x = sessionById(s, sessionId);
  if (now >= x.start) return { ok: false, block: { code: 'PAST' } };
  const opensAt = x.start - s.policy.bookingWindowDays * DAY;
  if (now < opensAt) return { ok: false, block: { code: 'NOT_OPEN', opensAt } };
  if (activeBooking(s, sessionId, profileId)) return { ok: false, block: { code: 'ALREADY' } };

  const m = s.memberships[profileId];
  if (m?.status === 'frozen' && m.frozenUntil !== undefined && x.start < m.frozenUntil) {
    return { ok: false, block: { code: 'FROZEN', until: m.frozenUntil } };
  }
  if (m) {
    const expired = m.kind === 'card' && m.expiresOn !== undefined && x.start > m.expiresOn;
    if (m.creditsLeft <= 0 || expired) {
      return { ok: false, block: { code: 'NO_CREDITS', kind: m.kind, expired, total: m.creditsTotal, renewsOn: m.renewsOn } };
    }
  }
  if (!s.waivers[profileId]) return { ok: false, block: { code: 'NO_WAIVER' } };

  const mine = bookedSessions(s, profileId).filter((o) => o.id !== x.id);
  const clash = mine.find((o) => o.start < sessionEnd(x) && x.start < sessionEnd(o));
  if (clash) return { ok: false, block: { code: 'CONFLICT', sessionId: clash.id } };
  if (!opts.ignoreCapacity && spotsLeft(x) === 0) return { ok: false, block: { code: 'FULL' } };

  const warnings: string[] = [];
  const sameDay = mine.filter((o) => startOfDay(o.start) === startOfDay(x.start));
  if (sameDay.length) warnings.push(t.warn.sameDay(sameDay.map((o) => ({ type: o.type, start: o.start }))));
  if (x.branchId !== s.account.preferredBranchId) warnings.push(t.warn.otherBranch(branchName(s, x.branchId)));
  if (x.start - now < s.policy.lateCancelHours * HOUR) warnings.push(t.warn.lateWindow(s.policy.lateCancelHours));
  return { ok: true, warnings };
}

export function blockMessage(s: State, b: Block): string {
  const t = msgs(s);
  switch (b.code) {
    case 'PAST':
      return t.block.past;
    case 'NOT_OPEN':
      return t.block.notOpen(b.opensAt);
    case 'ALREADY':
      return t.block.already;
    case 'FROZEN':
      return t.block.frozen(b.until);
    case 'NO_CREDITS':
      if (b.kind === 'monthly') return t.block.monthlyUsed(b.total, b.renewsOn);
      return b.expired ? t.block.cardExpired : t.block.cardEmpty;
    case 'NO_WAIVER':
      return t.block.noWaiver;
    case 'CONFLICT': {
      const o = sessionById(s, b.sessionId);
      return t.block.conflict(o.type, o.start);
    }
    case 'FULL':
      return t.block.full;
  }
}

export function book(s: State, sessionId: ID, profileId: ID, now: number): Outcome {
  const check = checkBooking(s, sessionId, profileId, now);
  if (!check.ok) return fail(s, blockMessage(s, check.block));
  const x = sessionById(s, sessionId);
  let next = withSession(s, sessionId, (y) => ({ ...y, bookedIds: [...y.bookedIds, profileId] }));
  next = consumeCredit(next, profileId);
  const booking: Booking = {
    id: newBookingId(sessionId, profileId, now),
    sessionId,
    profileId,
    status: 'booked',
    createdAt: now,
    creditUsed: usesCredits(s, profileId),
  };
  next = { ...next, bookings: [...next.bookings, booking] };
  const who = profileId === s.account.profiles[0]?.id ? undefined : profileName(s, profileId);
  return ok(next, msgs(s).notice.booked(describeSession(s, x), who));
}

/** Book if there is room, otherwise join the waitlist. */
export function bookOrWaitlist(s: State, sessionId: ID, profileId: ID, autoAccept: boolean, now: number): Outcome {
  const check = checkBooking(s, sessionId, profileId, now);
  if (!check.ok && check.block.code === 'FULL') return joinWaitlist(s, sessionId, profileId, autoAccept, now);
  return book(s, sessionId, profileId, now);
}

// ---------- cancellation ----------

export interface CancelTerms {
  late: boolean;
  deadline: number;
  kind: CreditKind;
}

export function cancelTerms(s: State, sessionId: ID, profileId: ID, now: number): CancelTerms {
  const x = sessionById(s, sessionId);
  const deadline = x.start - s.policy.lateCancelHours * HOUR;
  return { late: now > deadline, deadline, kind: creditKind(s, profileId) };
}

export function describeTerms(s: State, terms: CancelTerms, now: number): string {
  const t = msgs(s);
  return terms.late ? t.terms.late(terms.kind) : t.terms.free(terms.deadline, now, terms.kind);
}

/** Free until the late window: the class goes back. Late: the class still counts. */
export function cancel(s: State, sessionId: ID, profileId: ID, now: number): Outcome {
  const t = msgs(s);
  const b = activeBooking(s, sessionId, profileId);
  if (!b) return fail(s, t.notice.noBookingToCancel);
  if (b.status !== 'booked') return leaveWaitlist(s, sessionId, profileId, now);
  const x = sessionById(s, sessionId);
  if (now >= x.start) return fail(s, t.block.past);
  const terms = cancelTerms(s, sessionId, profileId, now);
  const refund = !terms.late && !!b.creditUsed;
  let next = withBooking(s, b.id, {
    status: terms.late ? 'late-cancelled' : 'cancelled',
    creditUsed: refund ? false : b.creditUsed,
  });
  next = withSession(next, sessionId, (y) => ({
    ...y,
    bookedIds: y.bookedIds.filter((id) => id !== profileId),
    cancellations: y.cancellations + 1,
  }));
  if (refund) next = refundCredit(next, profileId);
  const text = terms.late ? t.notice.cancelledLate : t.notice.cancelled(terms.kind);
  const promoted = promoteWaitlist(next, sessionId, now);
  return { state: promoted.state, notices: [{ kind: 'info', text }, ...promoted.notices] };
}

// ---------- smart waitlist ----------

/** Chance that at least `position` spots open up, when openings ~ Poisson(lambda). */
export function waitlistOdds(position: number, lambda: number): number {
  if (position <= 0) return 1;
  if (lambda <= 0) return 0;
  let term = Math.exp(-lambda);
  let cdf = term;
  for (let i = 1; i < position; i++) {
    term *= lambda / i;
    cdf += term;
  }
  return Math.min(1, Math.max(0, 1 - cdf));
}

/** Spots expected to open before class, from this slot's history, scaled by time left. */
export function expectedOpenings(s: State, x: ClassSession, now: number): number {
  const past = s.sessions.filter((o) => o.templateId === x.templateId && o.start < now);
  const avg = past.length ? past.reduce((sum, o) => sum + o.cancellations, 0) / past.length : 1;
  const hoursLeft = Math.max(0, (x.start - now) / HOUR);
  return avg * Math.min(1, Math.max(0.15, hoursLeft / 24));
}

export function joinWaitlist(s: State, sessionId: ID, profileId: ID, autoAccept: boolean, now: number): Outcome {
  const check = checkBooking(s, sessionId, profileId, now);
  if (check.ok) return book(s, sessionId, profileId, now);
  if (check.block.code !== 'FULL') return fail(s, blockMessage(s, check.block));
  const x = sessionById(s, sessionId);
  const position = x.waitlistIds.length + 1;
  const odds = waitlistOdds(position, expectedOpenings(s, x, now));
  let next = withSession(s, sessionId, (y) => ({ ...y, waitlistIds: [...y.waitlistIds, profileId] }));
  const booking: Booking = {
    id: newBookingId(sessionId, profileId, now),
    sessionId,
    profileId,
    status: 'waitlisted',
    createdAt: now,
    autoAccept,
  };
  next = { ...next, bookings: [...next.bookings, booking] };
  return ok(next, msgs(s).notice.joinedWaitlist(position, Math.round(odds * 100), autoAccept));
}

export function leaveWaitlist(s: State, sessionId: ID, profileId: ID, now: number): Outcome {
  const t = msgs(s);
  const b = activeBooking(s, sessionId, profileId);
  if (!b || b.status === 'booked') return fail(s, t.notice.notOnWaitlist);
  if (b.status === 'offered') return declineOffer(s, sessionId, profileId, now);
  let next = withBooking(s, b.id, { status: 'left-waitlist' });
  next = withSession(next, sessionId, (y) => ({ ...y, waitlistIds: y.waitlistIds.filter((id) => id !== profileId) }));
  return ok(next, t.notice.leftWaitlist, 'info');
}

/**
 * Fill open spots from the front of the waitlist. Community members are promoted
 * directly. Our profiles are auto-booked when they opted in and there is enough
 * time; otherwise the spot is held for them for `offerHoldMinutes`.
 */
export function promoteWaitlist(s: State, sessionId: ID, now: number): Outcome {
  const t = msgs(s);
  let next = s;
  const notices: Notice[] = [];
  for (let guard = 0; guard < 100; guard++) {
    const x = sessionById(next, sessionId);
    if (spotsLeft(x) === 0 || x.waitlistIds.length === 0 || now >= x.start) break;
    const id = x.waitlistIds[0];
    const rest = x.waitlistIds.slice(1);
    const mine = activeBooking(next, sessionId, id);
    if (!mine) {
      next = withSession(next, sessionId, (y) => ({ ...y, waitlistIds: rest, bookedIds: [...y.bookedIds, id] }));
      continue;
    }
    const probe: State = { ...next, bookings: next.bookings.filter((b) => b.id !== mine.id) };
    const eligible = checkBooking(probe, sessionId, id, now, { ignoreCapacity: true }).ok;
    const enoughTime = x.start - now >= next.policy.autoAcceptCutoffHours * HOUR;
    const who = profileName(next, id);
    if (mine.autoAccept && enoughTime && eligible) {
      next = withSession(next, sessionId, (y) => ({ ...y, waitlistIds: rest, bookedIds: [...y.bookedIds, id] }));
      next = withBooking(next, mine.id, { status: 'booked', creditUsed: usesCredits(next, id) });
      next = consumeCredit(next, id);
      notices.push({ kind: 'success', text: t.notice.autoBooked(describeSession(next, x), who) });
    } else {
      const expires = Math.min(now + next.policy.offerHoldMinutes * MINUTE, x.start);
      next = withSession(next, sessionId, (y) => ({ ...y, waitlistIds: rest, heldIds: [...y.heldIds, id] }));
      next = withBooking(next, mine.id, { status: 'offered', offerExpiresAt: expires });
      notices.push({ kind: 'success', text: t.notice.spotHeld(describeSession(next, x), who, expires) });
    }
  }
  return { state: next, notices };
}

export function claimOffer(s: State, sessionId: ID, profileId: ID, now: number): Outcome {
  const t = msgs(s);
  const b = activeBooking(s, sessionId, profileId);
  if (!b || b.status !== 'offered') return fail(s, t.notice.noHeldSpot);
  if (b.offerExpiresAt !== undefined && now > b.offerExpiresAt) {
    const expired = expireOffers(s, now);
    return { state: expired.state, notices: [{ kind: 'error', text: t.notice.holdExpiredSorry }] };
  }
  const probe: State = { ...s, bookings: s.bookings.filter((o) => o.id !== b.id) };
  const check = checkBooking(probe, sessionId, profileId, now, { ignoreCapacity: true });
  if (!check.ok) return fail(s, blockMessage(s, check.block));
  const x = sessionById(s, sessionId);
  let next = withSession(s, sessionId, (y) => ({
    ...y,
    heldIds: y.heldIds.filter((id) => id !== profileId),
    bookedIds: [...y.bookedIds, profileId],
  }));
  next = withBooking(next, b.id, { status: 'booked', offerExpiresAt: undefined, creditUsed: usesCredits(s, profileId) });
  next = consumeCredit(next, profileId);
  return ok(next, t.notice.claimed(describeSession(s, x)));
}

export function declineOffer(s: State, sessionId: ID, profileId: ID, now: number): Outcome {
  const b = activeBooking(s, sessionId, profileId);
  if (!b || b.status !== 'offered') return fail(s, msgs(s).notice.noHeldSpot);
  let next = withBooking(s, b.id, { status: 'declined' });
  next = withSession(next, sessionId, (y) => ({ ...y, heldIds: y.heldIds.filter((id) => id !== profileId) }));
  const promoted = promoteWaitlist(next, sessionId, now);
  return { state: promoted.state, notices: [{ kind: 'info', text: msgs(s).notice.released }] };
}

export function expireOffers(s: State, now: number): Outcome {
  let next = s;
  const notices: Notice[] = [];
  for (const b of s.bookings) {
    if (b.status !== 'offered' || b.offerExpiresAt === undefined || now <= b.offerExpiresAt) continue;
    next = withBooking(next, b.id, { status: 'offer-expired' });
    next = withSession(next, b.sessionId, (y) => ({ ...y, heldIds: y.heldIds.filter((id) => id !== b.profileId) }));
    notices.push({ kind: 'info', text: msgs(s).notice.holdExpired(describeSession(s, sessionById(s, b.sessionId))) });
    const promoted = promoteWaitlist(next, b.sessionId, now);
    next = promoted.state;
    notices.push(...promoted.notices);
  }
  return { state: next, notices };
}

/** Demo control: someone else cancels, so the waitlist moves. */
export function simulateCancellation(s: State, sessionId: ID, now: number): Outcome {
  const t = msgs(s);
  const x = sessionById(s, sessionId);
  const victim = [...x.bookedIds].reverse().find((id) => !isOurProfile(s, id));
  if (!victim || now >= x.start) return ok(s, t.notice.nobodyToCancel, 'info');
  const next = withSession(s, sessionId, (y) => ({
    ...y,
    bookedIds: y.bookedIds.filter((id) => id !== victim),
    cancellations: y.cancellations + 1,
  }));
  const promoted = promoteWaitlist(next, sessionId, now);
  return {
    state: promoted.state,
    notices: [{ kind: 'info', text: t.notice.demoCancelled(personName(s, victim)) }, ...promoted.notices],
  };
}

// ---------- membership self-service ----------

export interface FreezeImpact {
  until: number;
  newDate?: number;
  affected: Booking[];
}

export function freezeImpact(s: State, profileId: ID, days: number, now: number): FreezeImpact {
  const until = addDays(startOfDay(now), days);
  const m = s.memberships[profileId];
  const base = m.kind === 'monthly' ? m.renewsOn : m.expiresOn;
  const affected = s.bookings.filter((b) => {
    if (b.profileId !== profileId || !ACTIVE_STATUSES.includes(b.status)) return false;
    const x = sessionById(s, b.sessionId);
    return x.start > now && x.start < until;
  });
  return { until, newDate: base === undefined ? undefined : addDays(base, days), affected };
}

export function freeze(s: State, profileId: ID, days: number, now: number): Outcome {
  const t = msgs(s);
  const m = s.memberships[profileId];
  if (m.status === 'frozen') return fail(s, t.notice.alreadyFrozen);
  const impact = freezeImpact(s, profileId, days, now);
  let next = s;
  for (const b of impact.affected) {
    if (b.status === 'booked') {
      next = withBooking(next, b.id, { status: 'cancelled', creditUsed: false });
      next = withSession(next, b.sessionId, (y) => ({
        ...y,
        bookedIds: y.bookedIds.filter((id) => id !== profileId),
        cancellations: y.cancellations + 1,
      }));
      if (b.creditUsed) next = refundCredit(next, profileId);
      next = promoteWaitlist(next, b.sessionId, now).state;
    } else if (b.status === 'waitlisted') {
      next = leaveWaitlist(next, b.sessionId, profileId, now).state;
    } else {
      next = declineOffer(next, b.sessionId, profileId, now).state;
    }
  }
  next = withMembership(
    next,
    profileId,
    m.kind === 'monthly'
      ? { status: 'frozen', frozenUntil: impact.until, renewsOn: impact.newDate }
      : { status: 'frozen', frozenUntil: impact.until, expiresOn: impact.newDate },
  );
  return ok(next, t.notice.frozen(impact.until, m.kind, impact.newDate, impact.affected.length));
}

export function unfreeze(s: State, profileId: ID, now: number): Outcome {
  const t = msgs(s);
  const m = s.memberships[profileId];
  if (m.status !== 'frozen' || m.frozenUntil === undefined) return fail(s, t.notice.notFrozen);
  const unused = Math.max(0, Math.round((m.frozenUntil - startOfDay(now)) / DAY));
  const shift = (d: number | undefined) => (d === undefined ? undefined : addDays(d, -unused));
  const next = withMembership(s, profileId, {
    status: 'active',
    frozenUntil: undefined,
    renewsOn: shift(m.renewsOn),
    expiresOn: shift(m.expiresOn),
  });
  return ok(next, t.notice.unfrozen(unused));
}

export function removePaymentMethod(s: State, id: ID): Outcome {
  const t = msgs(s);
  const pm = s.account.paymentMethods.find((p) => p.id === id);
  if (!pm) return fail(s, t.notice.cardNotFound);
  const remaining = s.account.paymentMethods.filter((p) => p.id !== id);
  const next: State = { ...s, account: { ...s.account, paymentMethods: remaining } };
  const notices: Notice[] = [{ kind: 'success', text: t.notice.cardRemoved(pm.brand, pm.last4) }];
  const renews = Object.values(s.memberships).some((m) => m.kind === 'monthly');
  if (!remaining.length && renews) notices.push({ kind: 'info', text: t.notice.addCardHint });
  return { state: next, notices };
}

export function signWaiver(s: State, profileId: ID, signature: string, now: number): Outcome {
  const t = msgs(s);
  const sig = signature.trim();
  if (sig.length < 2) return fail(s, t.notice.signatureTooShort);
  return ok({ ...s, waivers: { ...s.waivers, [profileId]: { signedAt: now, signature: sig } } }, t.notice.waiverSigned);
}

/** Demo purchase of another class card. Monthly plans renew instead. */
export function buyCredits(s: State, profileId: ID, now: number): Outcome {
  const t = msgs(s);
  const m = s.memberships[profileId];
  if (m.kind !== 'card') return fail(s, t.notice.cannotTopUp);
  const card = PLANS[TOP_UP_PLAN];
  const validUntil = addMonths(startOfDay(now), card.months ?? 3);
  const next = withMembership(s, profileId, {
    creditsLeft: m.creditsLeft + card.classes,
    creditsTotal: m.creditsTotal + card.classes,
    expiresOn: Math.max(m.expiresOn ?? 0, validUntil),
  });
  return ok(next, t.notice.toppedUp(card.classes, card.price));
}

/** Periodic housekeeping: expire held spots, end finished freezes. */
export function tick(s: State, now: number): Outcome {
  const expired = expireOffers(s, now);
  let next = expired.state;
  const notices = [...expired.notices];
  for (const p of next.account.profiles) {
    const m = next.memberships[p.id];
    if (m?.status === 'frozen' && m.frozenUntil !== undefined && now >= m.frozenUntil) {
      next = withMembership(next, p.id, { status: 'active', frozenUntil: undefined });
      notices.push({ kind: 'info', text: msgs(next).notice.activeAgain(loc(next, p.name)) });
    }
  }
  return { state: next, notices };
}
