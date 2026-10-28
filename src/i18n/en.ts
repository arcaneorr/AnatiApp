import { DAY, HOUR, MINUTE, daysBetween, fmtTime, hhmm } from '../domain/time';
import type { CreditKind } from '../domain/types';
import type { Messages } from './messages';

const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

const day = (t: number) => dayFmt.format(t);
const date = (t: number) => dateFmt.format(t);
const money = (n: number) => `₪${n.toLocaleString('en-US')}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const unit = (kind: CreditKind) => (kind === 'monthly' ? 'plan' : 'card');

function relative(target: number, now: number): string {
  const diff = target - now;
  const abs = Math.abs(diff);
  let text: string;
  if (abs < HOUR) {
    text = `${Math.max(1, Math.floor(abs / MINUTE))}m`;
  } else if (abs < DAY) {
    const h = Math.floor(abs / HOUR);
    const m = Math.floor((abs % HOUR) / MINUTE);
    text = m ? `${h}h ${m}m` : `${h}h`;
  } else {
    const d = Math.floor(abs / DAY);
    const h = Math.floor((abs % DAY) / HOUR);
    text = h ? `${d}d ${h}h` : `${d}d`;
  }
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

function weekdays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 5 && sorted.every((d, i) => d === i)) return 'Sun to Thu';
  return sorted.map((d) => WD_SHORT[d]).join(', ');
}

const classType = { Reformer: 'Reformer', Chair: 'Chair', Barre: 'Barre', Rehab: 'Rehab' } as const;

export const en: Messages = {
  lang: 'en',
  dir: 'ltr',
  locale: 'en-GB',

  weekdayShort: WD_SHORT,
  weekdayLong: WD_LONG,
  day,
  date,
  monthYear: (t) => monthFmt.format(t),
  dayTime: (t) => `${day(t)}, ${fmtTime(t)}`,
  relative,
  dayLabel: (t, now) => {
    const diff = daysBetween(now, t);
    return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : day(t);
  },
  dayChip: (t, now) => {
    const diff = daysBetween(now, t);
    return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `${WD_SHORT[new Date(t).getDay()]} ${new Date(t).getDate()}`;
  },
  minutes: (n) => `${n} min`,
  money,
  weekdays,

  classType,
  classTypeLong: { Reformer: 'Reformer Pilates', Chair: 'Wunda Chair', Barre: 'Pilates Barre', Rehab: 'Rehabilitation Pilates' },
  classBlurb: {
    Reformer: 'Strength, posture, flexibility and control on the reformer. Suits every fitness level.',
    Chair: 'A dynamic, challenging workout on the Wunda Chair for strength, stability and balance. Best with some Pilates experience.',
    Barre: 'Pilates principles with elements from ballet: strength, posture, balance and endurance for the whole body.',
    Rehab: 'Personally adapted training for recovery: orthopedic or neurological conditions, pain, injury, or after giving birth.',
  },
  level: { all: 'All levels', experienced: 'Some experience', tailored: 'Tailored to you' },
  plan: {
    m4: '4+1 monthly',
    m6: '6+1 monthly',
    m8: '8+1 monthly',
    m12: '12+1 monthly',
    c10: '10-class card',
    c15: '15-class card',
    c20: '20-class card',
  },
  session: (type, start) => `${classType[type]}, ${day(start)} ${fmtTime(start)}`,
  fallback: { branch: 'another branch', coach: 'Coach', member: 'Member' },

  block: {
    past: 'This class has already started.',
    notOpen: (at) => `Booking opens ${day(at)} at ${fmtTime(at)}.`,
    already: "You're already on this class.",
    frozen: (until) => `Membership is frozen until ${day(until)}.`,
    cardEmpty: 'No classes left on this card.',
    cardExpired: 'Your card expires before this class.',
    monthlyUsed: (total, renewsOn) =>
      `You've used all ${total} classes this month.${renewsOn ? ` Your plan renews ${date(renewsOn)}.` : ''}`,
    noWaiver: 'Sign the health declaration first. It takes about 20 seconds.',
    conflict: (type, start) => `Overlaps with your ${classType[type]} at ${fmtTime(start)}.`,
    full: 'This class is full. Join the waitlist instead.',
  },
  warn: {
    sameDay: (items) => `Also booked that day: ${items.map((i) => `${classType[i.type]} at ${fmtTime(i.start)}`).join(', ')}.`,
    otherBranch: (branch) => `This class is at ${branch}, not your default branch.`,
    lateWindow: (hours) => `Starts in under ${hours}h, so cancelling would count as late.`,
  },
  terms: {
    free: (deadline, now, kind) =>
      `Free cancellation until ${day(deadline)} ${fmtTime(deadline)} (${relative(deadline, now)}), and the class goes back to your ${unit(kind)}.`,
    late: () => 'Cancelling now is late: the class will still count.',
  },
  notice: {
    booked: (what, who) => (who ? `${who}: booked ${what}.` : `Booked ${what}.`),
    noBookingToCancel: 'There is no booking to cancel.',
    cancelled: (kind) => `Cancelled. The class went back to your ${unit(kind)}.`,
    cancelledLate: 'Cancelled late. The class still counts.',
    joinedWaitlist: (position, pct, autoAccept) =>
      `You're #${position} on the waitlist (about ${pct}% chance).${
        autoAccept ? " We'll book you automatically if a spot opens." : " We'll hold any spot that opens for you."
      }`,
    notOnWaitlist: "You're not on this waitlist.",
    leftWaitlist: 'You left the waitlist.',
    autoBooked: (what, who) => `${who} is in! Auto-booked from the waitlist: ${what}.`,
    spotHeld: (what, who, until) => `A spot opened in ${what}. It's held for ${who} until ${fmtTime(until)}.`,
    noHeldSpot: 'No spot is being held for you.',
    holdExpiredSorry: 'Sorry, the hold expired.',
    claimed: (what) => `Spot claimed: ${what}.`,
    released: 'Spot released to the next person.',
    holdExpired: (what) => `The held spot in ${what} expired.`,
    nobodyToCancel: 'Nobody else to cancel in this class.',
    demoCancelled: (name) => `Demo: ${name} cancelled.`,
    alreadyFrozen: 'This membership is already frozen.',
    frozen: (until, kind, newDate, cancelled) =>
      `Frozen until ${day(until)}.` +
      (newDate ? ` ${kind === 'monthly' ? 'Renewal' : 'Card expiry'} moved to ${day(newDate)}.` : '') +
      (cancelled ? ` ${plural(cancelled, 'booking')} in that period cancelled at no charge.` : ''),
    notFrozen: 'This membership is not frozen.',
    unfrozen: (unused) => `Membership active again. ${plural(unused, 'unused freeze day')} taken back off your dates.`,
    cardNotFound: 'Card not found.',
    cardRemoved: (brand, last4) => `${brand} ending ${last4} removed from your account.`,
    addCardHint: 'Add a card before your next renewal so your membership continues.',
    signatureTooShort: 'Type your full name to sign.',
    waiverSigned: 'Health declaration signed.',
    cannotTopUp: 'Monthly plans renew every month, so there is nothing to top up.',
    toppedUp: (pack, price) => `Added a ${pack}-class card (${money(price)}, demo purchase, no real payment).`,
    activeAgain: (name) => `${name}'s membership is active again.`,
    branchSet: (branch) => `Default branch set to ${branch}. We'll remember it.`,
    contacted: (name) => `${name} marked as contacted.`,
    demoReset: 'Demo data reset.',
    copied: 'Message copied. Paste it into WhatsApp or SMS.',
    copyFailed: 'Copy failed. Select the text and copy it manually.',
  },
  status: {
    attended: 'Attended',
    booked: 'Booked',
    missed: "Didn't get in",
    waitlist: (position) => `Waitlist #${position}`,
    held: 'Spot held',
    cancelled: 'Cancelled',
    lateCancel: 'Late cancel',
    leftWaitlist: 'Left waitlist',
    released: 'Released',
    holdExpired: 'Hold expired',
  },
  charge: {
    fromPlan: (kind) => (kind === 'monthly' ? 'From your monthly plan' : '1 class from your card'),
    lateCounted: 'Late cancel: the class counted',
    none: 'No charge',
  },

  churnReason: (c) => {
    if (c.reason === 'new') return 'New member, not enough history yet';
    if (c.reason === 'occasional') return 'Occasional visitor';
    return (
      `Usually ${c.baselinePerWeek.toFixed(1)}×/week, ${plural(c.recentVisits, 'visit')} in the last 2 weeks` +
      (c.daysSinceLast !== null ? `, last seen ${c.daysSinceLast}d ago` : '')
    );
  },
  suggestionTitle: (s) => {
    const when = `${hhmm(s.startMinutes)} (${weekdays(s.weekdays)})`;
    return s.kind === 'add' ? `Add another ${classType[s.type]} class at ${when}` : `Rethink ${classType[s.type]} at ${when}`;
  },
  suggestionDetail: (s) => {
    const where = s.branch ? `${s.branch}: ` : '';
    return s.kind === 'add'
      ? `${where}Full in ${s.full} of ${s.n} classes over the last 4 weeks, with about ${s.avgWait.toFixed(1)} people waitlisted each time.`
      : `${where}Averages ${Math.round(s.avgFill * 100)}% full (${(s.avgFill * s.capacity).toFixed(1)} of ${s.capacity} spots). Move it to a busier hour or merge it with a nearby class.`;
  },
  winBack: (first, studio, usual) =>
    `Hi ${first}! We've missed you at ${studio}. Want us to save you a spot in ${
      usual ? `your ${classType[usual.type]} class on ${WD_SHORT[usual.weekday]} at ${hhmm(usual.startMinutes)}` : 'a class this week'
    }? Just reply and we'll book it for you.`,

  ics: {
    title: (type, studio) => `${en.classTypeLong[type]} at ${studio}`,
    description: (coach, level) => `Coach: ${coach}. Level: ${en.level[level]}.`,
    reminder: 'Class reminder',
  },

  ui: {
    app: {
      tagline: 'prototype, demo data only',
      view: 'Prototype view',
      member: 'Member app',
      owner: 'Owner insights',
      reset: 'Reset demo',
      language: 'Language',
      branch: 'Default branch',
      profiles: 'Active family profile',
    },
    tabs: { nav: 'Main', home: 'Home', schedule: 'Schedule', bookings: 'Bookings', me: 'Me' },
    common: {
      close: 'Close',
      dismiss: 'Dismiss',
      details: 'Details',
      addToCalendar: 'Add to calendar',
      book: 'Book',
      signAndBook: 'Sign & book',
      frozen: 'Frozen',
      active: 'Active',
    },
    capacity: {
      left: (left, capacity) => `${left} of ${capacity} spots left`,
      fullWaitlist: (n) => `Full, ${n} on waitlist`,
      full: 'Full',
    },
    membership: {
      eyebrow: 'Membership',
      monthly: (left, total, renewsOn, price) =>
        `${left} of ${total} classes left this month. Renews ${renewsOn ? date(renewsOn) : 'monthly'} at ${money(price)}.`,
      card: (left, total, expiresOn) => `${left} of ${total} classes left.${expiresOn ? ` Valid until ${date(expiresOn)}.` : ''}`,
      frozenUntil: (until) => `Frozen until ${day(until)}.`,
      used: (used, total, kind) => `${used} of ${total} used${kind === 'monthly' ? ' this month' : ''}`,
      manage: 'Manage membership',
    },
    home: {
      hello: (hour, name) =>
        `${hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, ${name}`,
      quickEyebrow: 'No classes booked yet',
      quickTitle: 'Quick registration',
      quickEmpty: 'No open classes in the next week.',
      viewAll: 'All classes',
      daysLabel: 'Choose a day',
      bookedCount: (booked, capacity) => `${booked}/${capacity} booked`,
      fullTag: (waiting) => (waiting ? `Full · ${waiting} waiting` : 'Full'),
      fullSchedule: 'See full schedule',
      offerEyebrow: 'Spot held for you',
      offerText: (until, now) => `Claim it by ${fmtTime(until)} (${relative(until, now)}), or it goes to the next person.`,
      claim: 'Claim spot',
      release: 'Release it',
      waitEyebrow: 'Waitlist',
      waitTitle: (position, what) => `#${position} for ${what}`,
      waitText: (pct, autoAccept, holdMinutes) =>
        `About ${pct}% chance of a spot. ${autoAccept ? 'Auto-book is on.' : `We'll hold a freed spot for you for ${holdMinutes} min.`}`,
      usualEyebrow: 'Your usual',
      usualTitle: (type, start) => `${classType[type]}, ${WD_SHORT[new Date(start).getDay()]} ${fmtTime(start)}`,
      usualText: (d, coach, spots) => `${d} with ${coach}. ${plural(spots, 'spot')} left.`,
      bookOneTap: 'Book in one tap',
      fullOdds: 'Full: see waitlist odds',
      nextEyebrow: (rel) => `Next class, ${rel}`,
      nextText: (when, coach) => `${when} with ${coach}`,
      classDetails: 'Class details',
      weekRing: (attended, goal) => `${attended} of ${goal} classes this week`,
      goalReached: 'Weekly goal reached',
      goalLeft: (n) => `${n} more to reach your weekly goal`,
      weekText: (attended, booked) => `${attended} attended, ${booked} booked this week`,
      streak: (weeks) => `${weeks}-week streak`,
    },
    schedule: {
      title: 'Schedule',
      today: 'Today',
      prevWeek: 'Previous week',
      nextWeek: 'Next week',
      dayAria: (d, isToday, booked) => `${d}${isToday ? ', today' : ''}${booked ? ', you have a booking' : ''}`,
      typeLabel: 'Class type',
      all: 'All',
      branches: 'Branches',
      allBranches: 'All branches',
      pastDay: 'past day',
      closedSaturday: 'Closed on Saturdays.',
      noClasses: 'No classes this day.',
      noMatch: 'No classes match this filter.',
      waitlist: 'Waitlist',
      claim: 'Claim',
      ended: 'Ended',
      live: 'In progress',
      opens: (at) => `Opens ${day(at)}`,
      overlaps: 'Overlaps',
      actionAria: (action, what) => `${action}: ${what}`,
    },
    sheet: {
      oddsStrong: (pct) => `About ${pct}% chance`,
      oddsRest: (position, openings) =>
        ` you get in as #${position}. Usually ${openings.toFixed(1)} spots open up before this class.`,
      ended: 'This class has ended.',
      live: 'This class is in progress.',
      bookedSelf: "You're booked.",
      bookedFor: (who) => `${who} is booked.`,
      yesCancel: 'Yes, cancel',
      keepSpot: 'Keep my spot',
      cancelBooking: 'Cancel booking',
      onWaitlist: (position, who) => (who ? `${who} is #${position} on the waitlist.` : `You're #${position} on the waitlist.`),
      autoUntil: (time) => `Auto-book is on until ${time}.`,
      holdInfo: (minutes) => `If a spot opens, we hold it for ${minutes} min and notify you.`,
      leaveWaitlist: 'Leave waitlist',
      heldStrong: (who) => `A spot is held for ${who ?? 'you'}`,
      heldUntil: (until, now) => ` until ${fmtTime(until)} (${relative(until, now)}).`,
      bookFor: (who) => (who ? `Book for ${who}` : 'Book'),
      usesClass: (kind, leftAfter) =>
        `Uses 1 class from your ${unit(kind)}. ${leftAfter === 0 ? 'None' : leftAfter} left after booking.`,
      waiverNeeded: (who) => `${who} needs a health declaration before the first class. It's part of this booking, not a separate trip.`,
      signAndBookLong: 'Sign health declaration and book',
      fullStrong: 'Class is full.',
      inLine: (position, who) => (who ? `${who} would be #${position} in line.` : `You'd be #${position} in line.`),
      autoLabel: 'Auto-book me if a spot opens',
      autoHint: (hours, minutes) => `Until ${hours}h before class. After that, we hold the spot for ${minutes} min.`,
      joinWaitlist: 'Join waitlist',
      unfreezeAndBook: 'Unfreeze and book',
      buyCard: (pack, price) => `Buy a ${pack}-class card (demo, ${money(price)})`,
      when: 'When',
      coach: 'Coach',
      where: 'Where',
      level: 'Level',
      bookingFor: 'Booking for',
      whoCame: (n) => `Who came (${n})`,
      whoComing: (n) => `Who's coming (${n})`,
      seeAll: 'See everyone',
      hideList: 'Hide list',
      youTag: 'you',
      familyTag: 'family',
      demoTools: 'Demo controls',
      demoHint: 'Pretend another member cancels, to watch the waitlist move.',
      simulate: 'Simulate a cancellation',
    },
    waiver: {
      title: 'Health declaration',
      intro: (name) => `Health declaration for ${name}. You sign it once, and it takes about 20 seconds.`,
      healthySelf: "I'm in good health, and I know of no medical reason that prevents me from exercising.",
      healthyChild: (name) => `${name} is in good health, and I know of no medical reason that prevents them from exercising.`,
      inform: "I'll tell the coach about any injury or condition before class.",
      sigSelf: 'Type your full name to sign',
      sigChild: 'Parent or guardian: type your full name',
      sign: 'Sign',
    },
    bookings: {
      title: 'Bookings',
      view: 'Bookings view',
      upcoming: 'Upcoming',
      history: 'History',
      addAll: (n) => `Add all ${n} to calendar`,
      attended: 'attended',
      used: 'classes used',
      late: 'late cancels',
      note: 'Last 30 days. Every class is listed below with what it used.',
      emptyUpcoming: 'Nothing booked yet.',
      emptyHistory: 'No history yet.',
    },
    me: {
      freeze: 'Freeze membership',
      unfreeze: 'Unfreeze now',
      buyCard: (pack) => `Buy a ${pack}-class card (demo)`,
      family: 'Family profiles',
      relSelf: 'You',
      relChild: 'Child',
      waiverSigned: (d) => `Health declaration signed ${date(d)}`,
      waiverMissing: 'Health declaration not signed yet',
      signNow: 'Sign now',
      payments: 'Payment methods',
      noCards: 'No saved cards.',
      cardLabel: (brand, last4) => `${brand} ending ${last4}`,
      remove: 'Remove',
      keep: 'Keep',
      removeAria: (card) => `Remove ${card}`,
      display: 'Display and goals',
      textSize: 'Text size',
      sizeDefault: 'Default',
      sizeLarge: 'Large',
      sizeLarger: 'Larger',
      contrast: 'High contrast',
      contrastHint: 'Darker text and stronger borders',
      goal: 'Weekly goal',
      goalOption: (n) => `${n}×`,
      fineprint: 'Prototype. Demo data stays in this browser (localStorage). Use "Reset demo" at the top to start over.',
      freezeIntro: 'Pause for travel, injury or reserve duty. The days you freeze are added back to your plan.',
      freezeDays: (n) => `${n} days`,
      frozenUntil: 'Frozen until',
      renewal: 'Renewal',
      cardExpiry: 'Card expiry',
      affected: 'Bookings affected',
      affectedCount: (n) => `${n}, cancelled free of charge`,
      none: 'None',
      freezeFor: (n) => `Freeze for ${n} days`,
      arrow: '→',
    },
    owner: {
      title: 'Owner insights',
      sub: (studio, d) => `${studio} · ${d} · last 4 weeks`,
      branch: 'Branch',
      members: 'Members',
      joined: (n) => `${n} joined this month`,
      visits: 'Visits, last 7 days',
      vsPrev: (pct) => `${pct}% vs previous week`,
      fill: 'Average class fill',
      acrossAll: 'across all classes',
      risk: 'Revenue at risk',
      perMonth: (amount) => `${money(amount)}/mo`,
      riskSub: (high, total) => `${high} high-risk of ${total} flagged members`,
      churnTitle: 'Churn radar',
      churnSub: "Attendance vs each member's own baseline",
      high: 'High risk',
      medium: 'Medium',
      contacted: 'Contacted',
      planPrice: (plan, amount) => `${plan} · ${money(amount)}/mo`,
      winBack: 'Win back',
      messageAgain: 'Message again',
      showFewer: 'Show fewer',
      showAll: (n) => `Show all ${n}`,
      heatTitle: 'Class fill heatmap',
      heatSub: 'Average % full by start hour',
      heatCaption: 'Average class fill by weekday and start hour, last 4 weeks',
      hour: 'Hour',
      noClass: 'No class',
      cellTitle: (weekday, hour, pct, waitlisted) =>
        `${weekday} ${String(hour).padStart(2, '0')}:00, ${pct}% full, ${waitlisted.toFixed(1)} waitlisted on average`,
      heatNote: '"+N" means N people were waitlisted on average.',
      suggTitle: 'Schedule suggestions',
      addPill: 'Add capacity',
      lowPill: 'Low demand',
      winBackTitle: (name) => `Win back ${name}`,
      message: 'Message',
      copy: 'Copy message',
      markContacted: 'Mark as contacted',
    },
  },
};
