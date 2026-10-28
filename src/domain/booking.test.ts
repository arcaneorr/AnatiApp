import { describe, expect, it } from 'vitest';
import { messages } from '../i18n';
import { applyAction } from './actions';
import {
  activeBooking,
  blockMessage,
  book,
  buyCredits,
  cancel,
  checkBooking,
  claimOffer,
  expireOffers,
  freeze,
  joinWaitlist,
  removePaymentMethod,
  sessionById,
  simulateCancellation,
  spotsLeft,
  unfreeze,
  waitlistOdds,
} from './booking';
import { NOW, tinyState } from './testkit';
import { DAY, HOUR, MINUTE } from './time';
import type { State } from './types';

const hebrew = (s: State): State => ({ ...s, prefs: { ...s.prefs, lang: 'he' } });
const HEBREW_LETTERS = /[\u0590-\u05FF]/;

describe('booking', () => {
  it('books a spot and records it', () => {
    const { state } = book(tinyState(), 'open', 'me', NOW);
    expect(sessionById(state, 'open').bookedIds).toContain('me');
    expect(activeBooking(state, 'open', 'me')?.status).toBe('booked');
  });

  it('takes one class from a monthly plan and from a card', () => {
    let s = applyAction(tinyState(), { type: 'signWaiver', profileId: 'kid', signature: 'Parent Name' }, NOW).state;
    s = book(s, 'open', 'me', NOW).state;
    s = book(s, 'overlap', 'kid', NOW).state;
    expect(s.memberships.me.creditsLeft).toBe(8);
    expect(s.memberships.kid.creditsLeft).toBe(1);
    expect(s.bookings.every((b) => b.creditUsed)).toBe(true);
  });

  it('blocks booking without a health declaration, and sign-and-book completes in one step', () => {
    const s = tinyState();
    const check = checkBooking(s, 'open', 'kid', NOW);
    expect(check.ok ? 'ok' : check.block.code).toBe('NO_WAIVER');
    const out = applyAction(
      s,
      { type: 'signWaiverAndBook', sessionId: 'open', profileId: 'kid', signature: 'Parent Name', autoAccept: true },
      NOW,
    );
    expect(out.state.waivers.kid).toBeDefined();
    expect(activeBooking(out.state, 'open', 'kid')?.status).toBe('booked');
  });

  it('rejects overlapping classes', () => {
    const s = book(tinyState(), 'open', 'me', NOW).state;
    const check = checkBooking(s, 'overlap', 'me', NOW);
    expect(check.ok ? 'ok' : check.block.code).toBe('CONFLICT');
  });

  it('warns when booking at a different branch', () => {
    const check = checkBooking(tinyState(), 'annex', 'me', NOW);
    expect(check.ok && check.warnings.some((w) => w.includes('Annex'))).toBe(true);
  });

  it('respects the booking window', () => {
    const check = checkBooking(tinyState(), 'far', 'me', NOW);
    expect(check.ok ? 'ok' : check.block.code).toBe('NOT_OPEN');
  });

  it('stops at the monthly quota and says when the plan renews', () => {
    const s = tinyState();
    const used: State = { ...s, memberships: { ...s.memberships, me: { ...s.memberships.me, creditsLeft: 0 } } };
    const check = checkBooking(used, 'open', 'me', NOW);
    expect(check.ok ? 'ok' : check.block.code).toBe('NO_CREDITS');
    if (!check.ok) {
      expect(blockMessage(used, check.block)).toContain('renews');
      expect(blockMessage(hebrew(used), check.block)).toContain('מתחדש');
    }
  });

  it('blocks classes after a card expires', () => {
    const s = tinyState();
    const expiring: State = { ...s, waivers: { ...s.waivers, kid: { signedAt: NOW, signature: 'P' } }, memberships: { ...s.memberships, kid: { ...s.memberships.kid, expiresOn: NOW + DAY } } };
    const check = checkBooking(expiring, 'open', 'kid', NOW);
    expect(check.ok ? 'ok' : check.block.code).toBe('NO_CREDITS');
    if (!check.ok) expect(blockMessage(expiring, check.block)).toContain('expires');
  });
});

describe('cancellation terms', () => {
  it('is free before the late window and gives the class back', () => {
    let s = applyAction(tinyState(), { type: 'signWaiver', profileId: 'kid', signature: 'Parent Name' }, NOW).state;
    s = book(s, 'open', 'kid', NOW).state;
    const out = cancel(s, 'open', 'kid', NOW + HOUR);
    expect(out.state.memberships.kid.creditsLeft).toBe(2);
    expect(out.state.bookings.at(-1)?.status).toBe('cancelled');
    expect(out.state.bookings.at(-1)?.creditUsed).toBe(false);
  });

  it('counts the class when cancelling late', () => {
    const s = book(tinyState(), 'soon', 'me', NOW).state;
    const out = cancel(s, 'soon', 'me', NOW + HOUR); // 2h before start, window is 6h
    const b = out.state.bookings.at(-1);
    expect(b?.status).toBe('late-cancelled');
    expect(b?.creditUsed).toBe(true);
    expect(out.state.memberships.me.creditsLeft).toBe(8);
  });
});

describe('smart waitlist', () => {
  it('computes Poisson odds', () => {
    expect(waitlistOdds(1, 2)).toBeCloseTo(1 - Math.exp(-2), 6);
    expect(waitlistOdds(3, 0)).toBe(0);
    expect(waitlistOdds(1, 2)).toBeGreaterThan(waitlistOdds(2, 2));
  });

  it('joins at the back of the queue', () => {
    const { state } = joinWaitlist(tinyState(), 'full', 'me', false, NOW);
    expect(sessionById(state, 'full').waitlistIds).toEqual(['m3', 'me']);
  });

  it('auto-books an opted-in member when a spot opens, using a class', () => {
    let s = joinWaitlist(tinyState(), 'full', 'me', true, NOW).state;
    s = simulateCancellation(s, 'full', NOW).state; // m3 (ahead) gets the first spot
    s = simulateCancellation(s, 'full', NOW).state;
    expect(activeBooking(s, 'full', 'me')?.status).toBe('booked');
    expect(s.memberships.me.creditsLeft).toBe(8);
  });

  it('holds the spot for 15 minutes when auto-book is off', () => {
    let s = tinyState();
    s = { ...s, sessions: s.sessions.map((x) => (x.id === 'full' ? { ...x, waitlistIds: [] } : x)) };
    s = joinWaitlist(s, 'full', 'me', false, NOW).state;
    s = simulateCancellation(s, 'full', NOW).state;
    const held = activeBooking(s, 'full', 'me');
    expect(held?.status).toBe('offered');
    expect(held?.offerExpiresAt).toBe(NOW + 15 * MINUTE);
    expect(spotsLeft(sessionById(s, 'full'))).toBe(0);
    expect(activeBooking(claimOffer(s, 'full', 'me', NOW + 5 * MINUTE).state, 'full', 'me')?.status).toBe('booked');
  });

  it('expires an unclaimed hold and passes it on', () => {
    let s = tinyState();
    s = { ...s, sessions: s.sessions.map((x) => (x.id === 'full' ? { ...x, waitlistIds: [] } : x)) };
    s = joinWaitlist(s, 'full', 'me', false, NOW).state;
    s = joinWaitlist(s, 'full', 'kid', false, NOW).state; // blocked: no waiver
    s = simulateCancellation(s, 'full', NOW).state;
    const out = expireOffers(s, NOW + 16 * MINUTE);
    expect(out.state.bookings.find((b) => b.profileId === 'me')?.status).toBe('offer-expired');
    expect(spotsLeft(sessionById(out.state, 'full'))).toBe(1);
  });
});

describe('membership self-service', () => {
  it('freezes, moves renewal, and cancels bookings in the period for free', () => {
    const s = book(tinyState(), 'open', 'me', NOW).state;
    const out = freeze(s, 'me', 14, NOW);
    const m = out.state.memberships.me;
    expect(m.status).toBe('frozen');
    expect(m.renewsOn).toBeGreaterThan(NOW + 23 * DAY);
    expect(out.state.bookings.at(-1)?.status).toBe('cancelled');
    expect(m.creditsLeft).toBe(9);
  });

  it('unfreeze gives back unused days', () => {
    const frozen = freeze(tinyState(), 'me', 14, NOW).state;
    const out = unfreeze(frozen, 'me', NOW);
    expect(out.state.memberships.me.status).toBe('active');
    expect(Math.abs((out.state.memberships.me.renewsOn ?? 0) - (NOW + 10 * DAY))).toBeLessThan(DAY);
  });

  it('removes a saved card and reminds about the monthly renewal', () => {
    const out = removePaymentMethod(tinyState(), 'pm1');
    expect(out.state.account.paymentMethods).toHaveLength(0);
    expect(out.notices.some((n) => n.text.includes('Add a card'))).toBe(true);
  });

  it('buys another card, but not for a monthly plan', () => {
    const s = tinyState();
    const out = buyCredits(s, 'kid', NOW);
    expect(out.state.memberships.kid.creditsLeft).toBe(12);
    expect(buyCredits(s, 'me', NOW).state).toBe(s);
  });
});

describe('Hebrew', () => {
  it('words rules and outcomes in Hebrew when the state is Hebrew', () => {
    const s = hebrew(tinyState());
    const check = checkBooking(s, 'open', 'kid', NOW);
    if (!check.ok) expect(blockMessage(s, check.block)).toMatch(HEBREW_LETTERS);
    const booked = book(s, 'open', 'me', NOW);
    expect(booked.notices[0].text).toMatch(HEBREW_LETTERS);
    expect(booked.notices[0].text).toContain(messages('he').classType.Reformer);
  });
});
