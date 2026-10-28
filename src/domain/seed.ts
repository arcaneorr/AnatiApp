import { PLANS, monthlyValue } from './plans';
import { DAY, HOUR, addDays, addMonths, atMinutes, isoDate, startOfDay, weekdayOf } from './time';
import type { Booking, ClassSession, ClassTemplate, ClassType, ID, Lang, Level, Member, PlanId, State } from './types';

// Demo world for Anati Pilates, Eilat (anati.co.il/pilates): one studio, four class
// types, small groups of 6 to 10, the studio's real price list. Members are fictional.
export const HISTORY_DAYS = 42;
export const AHEAD_DAYS = 14;
export const BOOKING_WINDOW_DAYS = 7;
export const ME_ID = 'me';
export const KID_ID = 'kid';
export const BRANCH_ID = 'eilat';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(rng: () => number, lambda: number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > limit);
  return k - 1;
}

function weightedSample<T>(rng: () => number, items: readonly T[], weight: (item: T) => number, n: number): T[] {
  const pool = items.map((item) => ({ item, w: weight(item) })).filter((x) => x.w > 0);
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((sum, x) => sum + x.w, 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      r -= pool[idx].w;
      if (r <= 0) break;
    }
    out.push(pool[idx].item);
    pool.splice(idx, 1);
  }
  return out;
}

interface SlotSpec {
  key: string;
  type: ClassType;
  days: number[];
  time: string;
  coachId: ID;
  capacity: number;
  durationMin: number;
  level: Level;
  popularity: number; // demand / capacity
  cancelRate: number; // average spots that open up per class
}

// Sunday to Thursday, Friday mornings, closed on Saturday. No two classes overlap.
const SLOTS: SlotSpec[] = [
  { key: 'ref0700', type: 'Reformer', days: [0, 1, 2, 3, 4], time: '07:00', coachId: 'adi', capacity: 8, durationMin: 50, level: 'all', popularity: 0.85, cancelRate: 0.9 },
  { key: 'ref0815', type: 'Reformer', days: [0, 2, 4], time: '08:15', coachId: 'amit', capacity: 8, durationMin: 50, level: 'all', popularity: 0.75, cancelRate: 0.8 },
  { key: 'reh0930', type: 'Rehab', days: [0, 2], time: '09:30', coachId: 'amit', capacity: 6, durationMin: 60, level: 'tailored', popularity: 0.7, cancelRate: 0.5 },
  { key: 'chr0930', type: 'Chair', days: [1, 3], time: '09:30', coachId: 'hadar', capacity: 6, durationMin: 50, level: 'experienced', popularity: 0.65, cancelRate: 0.6 },
  { key: 'bar1700', type: 'Barre', days: [0, 2, 4], time: '17:00', coachId: 'gitit', capacity: 10, durationMin: 50, level: 'all', popularity: 0.7, cancelRate: 1.0 },
  { key: 'reh1700', type: 'Rehab', days: [1, 3], time: '17:00', coachId: 'amit', capacity: 6, durationMin: 60, level: 'tailored', popularity: 0.75, cancelRate: 0.5 },
  { key: 'ref1800', type: 'Reformer', days: [0, 1, 2, 3, 4], time: '18:00', coachId: 'gitit', capacity: 8, durationMin: 50, level: 'all', popularity: 1.15, cancelRate: 1.5 },
  { key: 'ref1900', type: 'Reformer', days: [0, 1, 2, 3, 4], time: '19:00', coachId: 'adi', capacity: 8, durationMin: 50, level: 'all', popularity: 1.3, cancelRate: 1.8 },
  { key: 'chr2000', type: 'Chair', days: [1, 3], time: '20:00', coachId: 'hadar', capacity: 6, durationMin: 50, level: 'experienced', popularity: 0.6, cancelRate: 0.6 },
  { key: 'bar2000', type: 'Barre', days: [0], time: '20:00', coachId: 'hadar', capacity: 10, durationMin: 50, level: 'all', popularity: 0.3, cancelRate: 0.3 },
  { key: 'ref0800', type: 'Reformer', days: [5], time: '08:00', coachId: 'amit', capacity: 8, durationMin: 50, level: 'all', popularity: 1.1, cancelRate: 1.5 },
  { key: 'bar0915', type: 'Barre', days: [5], time: '09:15', coachId: 'gitit', capacity: 10, durationMin: 50, level: 'all', popularity: 0.8, cancelRate: 0.8 },
];

// Fictional members: [Hebrew, English] first names and last initials.
const FIRST: readonly [string, string][] = [
  ['נועה', 'Noa'], ['יעל', 'Yael'], ['תמר', 'Tamar'], ['שירה', 'Shira'], ['מיכל', 'Michal'],
  ['הילה', 'Hila'], ['ענבר', 'Inbar'], ['קרן', 'Keren'], ['סיון', 'Sivan'], ['ליהי', 'Lihi'],
  ['נטע', 'Neta'], ['הדס', 'Hadas'], ['טליה', 'Talia'], ['רוני', 'Roni'], ['גל', 'Gal'],
  ['עדן', 'Eden'], ['שני', 'Shani'], ['ליאור', 'Lior'], ['מור', 'Mor'], ['רותם', 'Rotem'],
  ['אביטל', 'Avital'], ['דנה', 'Dana'], ['אורית', 'Orit'], ['ענת', 'Anat'], ['שרון', 'Sharon'],
  ['לימור', 'Limor'], ['אפרת', 'Efrat'], ['יפעת', 'Yifat'], ['נגה', 'Noga'], ['אלה', 'Ella'],
  ['אגם', 'Agam'], ['רעות', 'Reut'], ['ספיר', 'Sapir'], ['הודיה', 'Hodaya'], ['מורן', 'Moran'],
  ['אסנת', 'Osnat'], ['דפנה', 'Dafna'], ['אורטל', 'Ortal'], ['בתיה', 'Batya'], ['רינת', 'Rinat'],
];
const LAST: readonly [string, string][] = [
  ['א׳', 'A.'], ['ב׳', 'B.'], ['ג׳', 'G.'], ['ד׳', 'D.'], ['ה׳', 'H.'], ['ז׳', 'Z.'], ['כ׳', 'K.'], ['ל׳', 'L.'],
  ['מ׳', 'M.'], ['נ׳', 'N.'], ['ס׳', 'S.'], ['פ׳', 'P.'], ['ר׳', 'R.'], ['ש׳', 'Sh.'], ['ת׳', 'T.'],
];

interface Persona {
  member: Member;
  freq: number; // classes per week
  churned: boolean;
  rehab: boolean; // comes mainly for rehab classes
  experienced: boolean; // takes Chair classes
}

function pickPlan(r: number): PlanId {
  if (r < 0.18) return 'm4';
  if (r < 0.42) return 'm6';
  if (r < 0.68) return 'm8';
  if (r < 0.8) return 'm12';
  if (r < 0.92) return 'c10';
  if (r < 0.97) return 'c15';
  return 'c20';
}

/** Deterministic demo world relative to `now`. */
export function createDemoState(now: number, lang: Lang = 'he', seed = 7): State {
  const rng = mulberry32(seed);
  const today = startOfDay(now);

  const templates: ClassTemplate[] = [];
  const demand = new Map<ID, { popularity: number; cancelRate: number }>();
  for (const slot of SLOTS) {
    const [h, m] = slot.time.split(':').map(Number);
    for (const weekday of slot.days) {
      const id = `${BRANCH_ID}-${slot.key}-${weekday}`;
      templates.push({
        id,
        type: slot.type,
        weekday,
        startMinutes: h * 60 + m,
        durationMin: slot.durationMin,
        capacity: slot.capacity,
        coachId: slot.coachId,
        branchId: BRANCH_ID,
        level: slot.level,
      });
      demand.set(id, { popularity: slot.popularity * (0.92 + rng() * 0.16), cancelRate: slot.cancelRate });
    }
  }

  const personas: Persona[] = [];
  for (let i = 0; i < 110; i++) {
    const plan = pickPlan(rng());
    const p = PLANS[plan];
    const perWeek = p.kind === 'monthly' ? (p.classes * 12) / 52 : p.classes / ((p.months ?? 3) * 4.345);
    const isNew = rng() < 0.08;
    const joinedAt = isNew ? now - (3 + Math.floor(rng() * 17)) * DAY : now - (60 + Math.floor(rng() * 640)) * DAY;
    const [firstHe, firstEn] = FIRST[i % FIRST.length];
    const [lastHe, lastEn] = LAST[(i * 7 + Math.floor(i / FIRST.length)) % LAST.length];
    personas.push({
      member: {
        id: `m${i + 1}`,
        name: { he: `${firstHe} ${lastHe}`, en: `${firstEn} ${lastEn}` },
        plan,
        monthlyPrice: monthlyValue(p),
        joinedAt,
        visits: [],
      },
      freq: perWeek * (0.85 + rng() * 0.3),
      churned: !isNew && rng() < 0.13,
      rehab: rng() < 0.12,
      experienced: !isNew && rng() < 0.6,
    });
  }

  const typeWeight = (p: Persona, type: ClassType): number => {
    if (type === 'Rehab') return p.rehab ? 3 : 0.05;
    const base = p.rehab ? 0.35 : 1;
    if (type === 'Chair') return base * (p.experienced ? 0.7 : 0.08);
    if (type === 'Barre') return base * 0.7;
    return base;
  };
  const weightAt = (p: Persona, t: ClassTemplate, at: number): number => {
    if (at < p.member.joinedAt) return 0;
    let w = p.freq * typeWeight(p, t.type);
    if (p.churned && at >= now - 16 * DAY) w *= 0.06;
    return w;
  };

  const sessions: ClassSession[] = [];
  for (let d = -HISTORY_DAYS; d <= AHEAD_DAYS; d++) {
    const day = addDays(today, d);
    const wd = weekdayOf(day);
    for (const t of templates) {
      if (t.weekday !== wd) continue;
      const start = atMinutes(day, t.startMinutes);
      const { popularity, cancelRate } = demand.get(t.id) ?? { popularity: 0.5, cancelRate: 1 };
      const past = start < now;
      // Nobody can book before the window opens; inside it, demand builds up as the class gets closer.
      const open = past || start - now <= BOOKING_WINDOW_DAYS * DAY;
      const closeness = past ? 1 : Math.max(0.35, 1 - (start - now) / (8 * DAY));
      const wanted = open ? Math.round(t.capacity * popularity * closeness * (0.85 + rng() * 0.3)) : 0;
      const seats = Math.min(t.capacity, wanted);
      const overflow = Math.max(0, Math.min(past ? 4 : 3, wanted - t.capacity));
      const picked = weightedSample(rng, personas, (p) => weightAt(p, t, start), seats + (past ? 0 : overflow)).map(
        (p) => p.member.id,
      );
      sessions.push({
        id: `${t.id}@${isoDate(day)}`,
        templateId: t.id,
        type: t.type,
        start,
        durationMin: t.durationMin,
        capacity: t.capacity,
        coachId: t.coachId,
        branchId: t.branchId,
        level: t.level,
        bookedIds: picked.slice(0, seats),
        waitlistIds: past ? [] : picked.slice(seats),
        heldIds: [],
        peakWaitlist: past ? overflow : 0,
        cancellations: past ? poisson(rng, cancelRate) : 0,
      });
    }
  }
  sessions.sort((a, b) => a.start - b.start);

  // ----- the demo account: Maya (12+1 monthly) and her daughter Romi (10-class card) -----
  const me: Member = {
    id: ME_ID,
    name: { he: 'מאיה', en: 'Maya' },
    plan: 'm12',
    monthlyPrice: PLANS.m12.price,
    joinedAt: now - 400 * DAY,
    visits: [],
  };
  const bookings: Booking[] = [];
  const seat = (x: ClassSession, id: ID) => {
    x.waitlistIds = x.waitlistIds.filter((w) => w !== id);
    if (!x.bookedIds.includes(id)) {
      if (x.bookedIds.length >= x.capacity) x.bookedIds.pop();
      x.bookedIds.push(id);
    }
  };
  const fill = (x: ClassSession) => {
    const others = personas.filter((p) => !p.churned && !x.bookedIds.includes(p.member.id) && !x.waitlistIds.includes(p.member.id));
    while (x.bookedIds.length < x.capacity && others.length) x.bookedIds.push((others.shift() as Persona).member.id);
    return others;
  };
  const firstFuture = (pred: (x: ClassSession) => boolean) => sessions.find((x) => x.start > now && pred(x));
  const sameDay = (a: ClassSession, b?: ClassSession) => !!b && startOfDay(a.start) === startOfDay(b.start);
  const of = (key: string) => (x: ClassSession) => x.templateId.startsWith(`${BRANCH_ID}-${key}-`);

  // History: Tue + Thu 07:00 Reformer for 6 weeks, plus Sunday 18:00 Reformer in the last 4 weeks.
  const usual = [`${BRANCH_ID}-ref0700-2`, `${BRANCH_ID}-ref0700-4`, `${BRANCH_ID}-ref1800-0`];
  for (const x of sessions) {
    if (x.start >= now) continue;
    const recent = now - x.start <= 28 * DAY;
    if (!(x.templateId === usual[0] || x.templateId === usual[1] || (recent && x.templateId === usual[2]))) continue;
    seat(x, ME_ID);
    bookings.push({ id: `seed-${x.id}`, sessionId: x.id, profileId: ME_ID, status: 'booked', createdAt: x.start - 2 * DAY, creditUsed: true });
  }
  const lateCancel = sessions.filter((x) => of('bar1700')(x) && x.start <= now - 3 * DAY).at(-1);
  if (lateCancel) {
    bookings.push({ id: `seed-${lateCancel.id}`, sessionId: lateCancel.id, profileId: ME_ID, status: 'late-cancelled', createdAt: lateCancel.start - DAY, creditUsed: true });
  }

  // Upcoming: #2 on the waitlist for a full evening Reformer, a booked Barre, a booked Chair.
  const waitSession = firstFuture((x) => of('ref1900')(x) && x.start >= now + 8 * HOUR);
  if (waitSession) {
    const others = fill(waitSession);
    const ahead = others.shift()?.member.id;
    waitSession.waitlistIds = ahead ? [ahead, ME_ID] : [ME_ID];
    bookings.push({ id: `seed-wait-${waitSession.id}`, sessionId: waitSession.id, profileId: ME_ID, status: 'waitlisted', createdAt: now - 3 * HOUR, autoAccept: false });
  }
  const barre = firstFuture((x) => of('bar1700')(x) && x.start >= now + 3 * HOUR);
  if (barre) {
    seat(barre, ME_ID);
    bookings.push({ id: `seed-${barre.id}`, sessionId: barre.id, profileId: ME_ID, status: 'booked', createdAt: now - DAY, creditUsed: true });
  }
  const chair = firstFuture(
    (x) => of('chr2000')(x) && x.start >= now + 24 * HOUR && x.start - now <= BOOKING_WINDOW_DAYS * DAY && !sameDay(x, waitSession) && !sameDay(x, barre),
  );
  if (chair) {
    seat(chair, ME_ID);
    bookings.push({ id: `seed-${chair.id}`, sessionId: chair.id, profileId: ME_ID, status: 'booked', createdAt: now - DAY, creditUsed: true });
  }
  // Keep room in the next "usual" classes so one-tap rebooking can be demoed.
  for (const id of usual) {
    const next = firstFuture((x) => x.templateId === id);
    if (next) {
      next.bookedIds = next.bookedIds.slice(0, Math.max(0, next.capacity - 3));
      next.waitlistIds = [];
    }
  }
  // Always have one full class Maya can join the waitlist for, whatever the clock says.
  const fullDemo = firstFuture(
    (x) => of('ref1800')(x) && !usual.includes(x.templateId) && x.id !== waitSession?.id && x.start >= now + 4 * HOUR && x.start - now <= 6 * DAY,
  );
  if (fullDemo) {
    const others = fill(fullDemo);
    if (!fullDemo.waitlistIds.length && others.length) fullDemo.waitlistIds = [(others.shift() as Persona).member.id];
  }

  const members: Member[] = [me, ...personas.map((p) => p.member)];
  const byId = new Map(members.map((m) => [m.id, m]));
  for (const x of sessions) {
    if (x.start >= now) continue;
    for (const id of x.bookedIds) byId.get(id)?.visits.push(x.start);
  }
  for (const m of members) m.visits.sort((a, b) => a - b);

  // Classes used so far in Maya's current month.
  const startOf = new Map(sessions.map((x) => [x.id, x.start]));
  const renewsOn = addDays(today, 20);
  const periodStart = addMonths(renewsOn, -1);
  const used = bookings.filter(
    (b) => b.profileId === ME_ID && b.creditUsed && (startOf.get(b.sessionId) ?? 0) >= periodStart,
  ).length;
  const plan = PLANS.m12;
  const card = PLANS.c10;

  return {
    version: 2,
    generatedAt: now,
    studioName: { he: 'ענתי פילאטיס', en: 'Anati Pilates' },
    wordmark: 'Anati',
    tagline: { he: 'סטודיו פילאטיס · אילת', en: 'Pilates studio · Eilat' },
    branches: [
      { id: BRANCH_ID, name: { he: 'אילת', en: 'Eilat' }, address: { he: 'רחוב דודאים 12, חניה חופשית', en: '12 Dudaim St, free parking' } },
    ],
    coaches: [
      { id: 'gitit', name: { he: 'גיתית', en: 'Gitit' } },
      { id: 'adi', name: { he: 'עדי', en: 'Adi' } },
      { id: 'hadar', name: { he: 'הדר', en: 'Hadar' } },
      { id: 'amit', name: { he: 'עמית', en: 'Amit' } },
    ],
    templates,
    sessions,
    members,
    account: {
      profiles: [
        { id: ME_ID, name: { he: 'מאיה', en: 'Maya' }, relation: 'self' },
        { id: KID_ID, name: { he: 'רומי', en: 'Romi' }, relation: 'child' },
      ],
      activeProfileId: ME_ID,
      preferredBranchId: BRANCH_ID,
      paymentMethods: [
        { id: 'pm-visa', brand: 'Visa', last4: '4242' },
        { id: 'pm-mc', brand: 'Mastercard', last4: '5100' },
      ],
    },
    memberships: {
      [ME_ID]: {
        planId: plan.id,
        kind: 'monthly',
        status: 'active',
        creditsTotal: plan.classes,
        creditsLeft: Math.max(2, plan.classes - used),
        price: plan.price,
        renewsOn,
      },
      [KID_ID]: {
        planId: card.id,
        kind: 'card',
        status: 'active',
        creditsTotal: card.classes,
        creditsLeft: card.classes,
        price: card.price,
        expiresOn: addMonths(today, card.months ?? 3),
      },
    },
    waivers: { [ME_ID]: { signedAt: now - 200 * DAY, signature: 'Maya' } },
    bookings,
    policy: { lateCancelHours: 6, bookingWindowDays: BOOKING_WINDOW_DAYS, offerHoldMinutes: 15, autoAcceptCutoffHours: 2 },
    prefs: { lang, textScale: 1, highContrast: false, weeklyGoal: 3 },
    contacted: {},
    role: 'member',
  };
}
