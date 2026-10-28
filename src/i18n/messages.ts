import type { ClassType, CreditKind, Lang, Level, PlanId } from '../domain/types';

export interface ChurnReasonInput {
  reason: 'new' | 'occasional' | 'drop';
  baselinePerWeek: number;
  recentVisits: number;
  daysSinceLast: number | null;
}

export interface SuggestionInput {
  kind: 'add' | 'rethink';
  type: ClassType;
  startMinutes: number;
  weekdays: number[];
  n: number;
  full: number;
  avgFill: number;
  avgWait: number;
  capacity: number;
  branch?: string;
}

/** Every user-facing string, in one typed pack per language. */
export interface Messages {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  locale: string;

  // ---------- formatting ----------
  weekdayShort: readonly string[];
  weekdayLong: readonly string[];
  /** "Tue 20 Oct" */
  day(t: number): string;
  /** "20 Oct" */
  date(t: number): string;
  /** "October 2026" */
  monthYear(t: number): string;
  /** "Tue 20 Oct, 18:00" */
  dayTime(t: number): string;
  /** "in 3h 20m", "5m ago" */
  relative(target: number, now: number): string;
  /** "Today", "Tomorrow", otherwise day(t) */
  dayLabel(t: number, now: number): string;
  /** Short day chip: "Today", "Tomorrow", "Fri 30" */
  dayChip(t: number, now: number): string;
  minutes(n: number): string;
  money(n: number): string;
  /** "Sun to Thu", "Mon, Wed" */
  weekdays(days: number[]): string;

  // ---------- catalog ----------
  classType: Record<ClassType, string>;
  classTypeLong: Record<ClassType, string>;
  classBlurb: Record<ClassType, string>;
  level: Record<Level, string>;
  plan: Record<PlanId, string>;
  /** "Reformer, Tue 20 Oct 18:00" */
  session(type: ClassType, start: number): string;
  fallback: { branch: string; coach: string; member: string };

  // ---------- booking rules and outcomes ----------
  block: {
    past: string;
    notOpen(opensAt: number): string;
    already: string;
    frozen(until: number): string;
    cardEmpty: string;
    cardExpired: string;
    monthlyUsed(total: number, renewsOn: number | undefined): string;
    noWaiver: string;
    conflict(type: ClassType, start: number): string;
    full: string;
  };
  warn: {
    sameDay(items: { type: ClassType; start: number }[]): string;
    otherBranch(branch: string): string;
    lateWindow(hours: number): string;
  };
  terms: {
    free(deadline: number, now: number, kind: CreditKind): string;
    late(kind: CreditKind): string;
  };
  notice: {
    booked(what: string, who?: string): string;
    noBookingToCancel: string;
    cancelled(kind: CreditKind): string;
    cancelledLate: string;
    joinedWaitlist(position: number, pct: number, autoAccept: boolean): string;
    notOnWaitlist: string;
    leftWaitlist: string;
    autoBooked(what: string, who: string): string;
    spotHeld(what: string, who: string, until: number): string;
    noHeldSpot: string;
    holdExpiredSorry: string;
    claimed(what: string): string;
    released: string;
    holdExpired(what: string): string;
    nobodyToCancel: string;
    demoCancelled(name: string): string;
    alreadyFrozen: string;
    frozen(until: number, kind: CreditKind, newDate: number | undefined, cancelled: number): string;
    notFrozen: string;
    unfrozen(unusedDays: number): string;
    cardNotFound: string;
    cardRemoved(brand: string, last4: string): string;
    addCardHint: string;
    signatureTooShort: string;
    waiverSigned: string;
    cannotTopUp: string;
    toppedUp(pack: number, price: number): string;
    activeAgain(name: string): string;
    branchSet(branch: string): string;
    contacted(name: string): string;
    demoReset: string;
    copied: string;
    copyFailed: string;
  };
  status: {
    attended: string;
    booked: string;
    missed: string;
    waitlist(position: number): string;
    held: string;
    cancelled: string;
    lateCancel: string;
    leftWaitlist: string;
    released: string;
    holdExpired: string;
  };
  charge: {
    fromPlan(kind: CreditKind): string;
    lateCounted: string;
    none: string;
  };

  // ---------- owner insights ----------
  churnReason(c: ChurnReasonInput): string;
  suggestionTitle(s: SuggestionInput): string;
  suggestionDetail(s: SuggestionInput): string;
  winBack(first: string, studio: string, usual?: { type: ClassType; weekday: number; startMinutes: number }): string;

  // ---------- calendar export ----------
  ics: {
    title(type: ClassType, studio: string): string;
    description(coach: string, level: Level): string;
    reminder: string;
  };

  // ---------- screens ----------
  ui: {
    app: {
      tagline: string;
      view: string;
      member: string;
      owner: string;
      reset: string;
      language: string;
      branch: string;
      profiles: string;
    };
    tabs: { nav: string; home: string; schedule: string; bookings: string; me: string };
    common: {
      close: string;
      dismiss: string;
      details: string;
      addToCalendar: string;
      book: string;
      signAndBook: string;
      frozen: string;
      active: string;
    };
    capacity: { left(left: number, capacity: number): string; fullWaitlist(n: number): string; full: string };
    membership: {
      eyebrow: string;
      monthly(left: number, total: number, renewsOn: number | undefined, price: number): string;
      card(left: number, total: number, expiresOn: number | undefined): string;
      frozenUntil(until: number): string;
      used(used: number, total: number, kind: CreditKind): string;
      manage: string;
    };
    home: {
      hello(hour: number, name: string): string;
      quickEyebrow: string;
      quickTitle: string;
      quickEmpty: string;
      viewAll: string;
      daysLabel: string;
      bookedCount(booked: number, capacity: number): string;
      fullTag(waiting: number): string;
      fullSchedule: string;
      offerEyebrow: string;
      offerText(until: number, now: number): string;
      claim: string;
      release: string;
      waitEyebrow: string;
      waitTitle(position: number, what: string): string;
      waitText(pct: number, autoAccept: boolean, holdMinutes: number): string;
      usualEyebrow: string;
      usualTitle(type: ClassType, start: number): string;
      usualText(day: string, coach: string, spots: number): string;
      bookOneTap: string;
      fullOdds: string;
      nextEyebrow(relative: string): string;
      nextText(when: string, coach: string): string;
      classDetails: string;
      weekRing(attended: number, goal: number): string;
      goalReached: string;
      goalLeft(n: number): string;
      weekText(attended: number, booked: number): string;
      streak(weeks: number): string;
    };
    schedule: {
      title: string;
      today: string;
      prevWeek: string;
      nextWeek: string;
      dayAria(day: string, isToday: boolean, booked: boolean): string;
      typeLabel: string;
      all: string;
      branches: string;
      allBranches: string;
      pastDay: string;
      closedSaturday: string;
      noClasses: string;
      noMatch: string;
      waitlist: string;
      claim: string;
      ended: string;
      live: string;
      opens(at: number): string;
      overlaps: string;
      actionAria(action: string, what: string): string;
    };
    sheet: {
      oddsStrong(pct: number): string;
      oddsRest(position: number, openings: number): string;
      ended: string;
      live: string;
      bookedSelf: string;
      bookedFor(who: string): string;
      yesCancel: string;
      keepSpot: string;
      cancelBooking: string;
      onWaitlist(position: number, who?: string): string;
      autoUntil(time: string): string;
      holdInfo(minutes: number): string;
      leaveWaitlist: string;
      heldStrong(who?: string): string;
      heldUntil(until: number, now: number): string;
      bookFor(who?: string): string;
      usesClass(kind: CreditKind, leftAfter: number): string;
      waiverNeeded(who: string): string;
      signAndBookLong: string;
      fullStrong: string;
      inLine(position: number, who?: string): string;
      autoLabel: string;
      autoHint(hours: number, minutes: number): string;
      joinWaitlist: string;
      unfreezeAndBook: string;
      buyCard(pack: number, price: number): string;
      when: string;
      coach: string;
      where: string;
      level: string;
      bookingFor: string;
      whoCame(n: number): string;
      whoComing(n: number): string;
      seeAll: string;
      hideList: string;
      youTag: string;
      familyTag: string;
      demoTools: string;
      demoHint: string;
      simulate: string;
    };
    waiver: {
      title: string;
      intro(name: string): string;
      healthySelf: string;
      healthyChild(name: string): string;
      inform: string;
      sigSelf: string;
      sigChild: string;
      sign: string;
    };
    bookings: {
      title: string;
      view: string;
      upcoming: string;
      history: string;
      addAll(n: number): string;
      attended: string;
      used: string;
      late: string;
      note: string;
      emptyUpcoming: string;
      emptyHistory: string;
    };
    me: {
      freeze: string;
      unfreeze: string;
      buyCard(pack: number): string;
      family: string;
      relSelf: string;
      relChild: string;
      waiverSigned(date: number): string;
      waiverMissing: string;
      signNow: string;
      payments: string;
      noCards: string;
      cardLabel(brand: string, last4: string): string;
      remove: string;
      keep: string;
      removeAria(card: string): string;
      display: string;
      textSize: string;
      sizeDefault: string;
      sizeLarge: string;
      sizeLarger: string;
      contrast: string;
      contrastHint: string;
      goal: string;
      goalOption(n: number): string;
      fineprint: string;
      freezeIntro: string;
      freezeDays(n: number): string;
      frozenUntil: string;
      renewal: string;
      cardExpiry: string;
      affected: string;
      affectedCount(n: number): string;
      none: string;
      freezeFor(n: number): string;
      arrow: string;
    };
    owner: {
      title: string;
      sub(studio: string, day: string): string;
      branch: string;
      members: string;
      joined(n: number): string;
      visits: string;
      vsPrev(pct: number): string;
      fill: string;
      acrossAll: string;
      risk: string;
      perMonth(amount: number): string;
      riskSub(high: number, total: number): string;
      churnTitle: string;
      churnSub: string;
      high: string;
      medium: string;
      contacted: string;
      planPrice(plan: string, amount: number): string;
      winBack: string;
      messageAgain: string;
      showFewer: string;
      showAll(n: number): string;
      heatTitle: string;
      heatSub: string;
      heatCaption: string;
      hour: string;
      noClass: string;
      cellTitle(weekday: string, hour: number, pct: number, waitlisted: number): string;
      heatNote: string;
      suggTitle: string;
      addPill: string;
      lowPill: string;
      winBackTitle(name: string): string;
      message: string;
      copy: string;
      markContacted: string;
    };
  };
}
