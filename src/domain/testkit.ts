import { DAY, HOUR, MINUTE } from './time';
import type { ClassSession, Member, State } from './types';

export const NOW = Date.UTC(2026, 9, 20, 9, 0); // fixed clock for tests

export function session(id: string, start: number, capacity: number, bookedIds: string[] = [], waitlistIds: string[] = []): ClassSession {
  return {
    id,
    templateId: `t-${id}`,
    type: 'Reformer',
    start,
    durationMin: 50,
    capacity,
    coachId: 'c1',
    branchId: 'b1',
    level: 'all',
    bookedIds,
    waitlistIds,
    heldIds: [],
    peakWaitlist: 0,
    cancellations: 0,
  };
}

export function member(id: string, visits: number[], joinedAt = NOW - 400 * DAY): Member {
  return { id, name: { he: `${id} בדיקה`, en: `${id.toUpperCase()} Test` }, plan: 'm8', monthlyPrice: 480, joinedAt, visits };
}

/** Small hand-built world: Maya (8+1 monthly, waiver signed) and Romi (card with 2 classes, no waiver). */
export function tinyState(now = NOW): State {
  const start = now + 2 * DAY;
  return {
    version: 2,
    generatedAt: now,
    studioName: { he: 'סטודיו בדיקה', en: 'Test Studio' },
    wordmark: 'Test',
    tagline: { he: 'סטודיו בדיקה', en: 'Test studio' },
    branches: [
      { id: 'b1', name: { he: 'ראשי', en: 'Main' }, address: { he: 'רחוב ראשי 1', en: '1 Main St' } },
      { id: 'b2', name: { he: 'נספח', en: 'Annex' }, address: { he: 'רחוב צדדי 2', en: '2 Side St' } },
    ],
    coaches: [{ id: 'c1', name: { he: 'מדריכה ג׳', en: 'Coach C.' } }],
    templates: [],
    sessions: [
      session('open', start, 2, ['m1']),
      session('overlap', start + 30 * MINUTE, 10),
      session('full', start + DAY, 2, ['m1', 'm2'], ['m3']),
      session('soon', now + 3 * HOUR, 5),
      { ...session('annex', start + 5 * HOUR, 5), branchId: 'b2' },
      session('far', now + 20 * DAY, 5),
    ],
    members: [member('m1', []), member('m2', []), member('m3', [])],
    account: {
      profiles: [
        { id: 'me', name: { he: 'מאיה', en: 'Maya' }, relation: 'self' },
        { id: 'kid', name: { he: 'רומי', en: 'Romi' }, relation: 'child' },
      ],
      activeProfileId: 'me',
      preferredBranchId: 'b1',
      paymentMethods: [{ id: 'pm1', brand: 'Visa', last4: '4242' }],
    },
    memberships: {
      me: { planId: 'm8', kind: 'monthly', status: 'active', creditsTotal: 9, creditsLeft: 9, price: 480, renewsOn: now + 10 * DAY },
      kid: { planId: 'c10', kind: 'card', status: 'active', creditsTotal: 10, creditsLeft: 2, price: 700, expiresOn: now + 60 * DAY },
    },
    waivers: { me: { signedAt: now - DAY, signature: 'Maya' } },
    bookings: [],
    policy: { lateCancelHours: 6, bookingWindowDays: 14, offerHoldMinutes: 15, autoAcceptCutoffHours: 2 },
    prefs: { lang: 'en', textScale: 1, highContrast: false, weeklyGoal: 3 },
    contacted: {},
    role: 'member',
  };
}
