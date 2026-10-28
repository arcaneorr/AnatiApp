export type ID = string;
export type Lang = 'he' | 'en';

/** Display text in both UI languages. */
export interface Localized {
  he: string;
  en: string;
}

export type ClassType = 'Reformer' | 'Chair' | 'Barre' | 'Rehab';
export type Level = 'all' | 'experienced' | 'tailored';

export interface Branch {
  id: ID;
  name: Localized;
  address: Localized;
}

export interface Coach {
  id: ID;
  name: Localized;
}

/** A recurring weekly slot. One template per weekday. */
export interface ClassTemplate {
  id: ID;
  type: ClassType;
  weekday: number; // 0 = Sunday
  startMinutes: number; // minutes after local midnight
  durationMin: number;
  capacity: number;
  coachId: ID;
  branchId: ID;
  level: Level;
}

export interface ClassSession {
  id: ID;
  templateId: ID;
  type: ClassType;
  start: number; // epoch ms
  durationMin: number;
  capacity: number;
  coachId: ID;
  branchId: ID;
  level: Level;
  bookedIds: ID[];
  waitlistIds: ID[];
  /** Spots held for a waitlisted person who was offered the place. */
  heldIds: ID[];
  /** Largest waitlist the session reached (history, used by insights). */
  peakWaitlist: number;
  /** Bookings cancelled for this session, i.e. spots that opened up. */
  cancellations: number;
}

/** Monthly plans (classes per month, gift class included) and class cards. */
export type PlanId = 'm4' | 'm6' | 'm8' | 'm12' | 'c10' | 'c15' | 'c20';
export type CreditKind = 'monthly' | 'card';

export interface Member {
  id: ID;
  name: Localized;
  plan: PlanId;
  monthlyPrice: number; // ILS per month, used for revenue at risk
  joinedAt: number;
  visits: number[]; // epoch ms of attended sessions, ascending
}

export interface Membership {
  planId: PlanId;
  kind: CreditKind;
  status: 'active' | 'frozen';
  /** Classes left: this month for monthly plans, on the card for cards. */
  creditsLeft: number;
  creditsTotal: number;
  /** ILS: per month for monthly plans, per card for cards. */
  price: number;
  renewsOn?: number; // monthly plans
  expiresOn?: number; // cards
  frozenUntil?: number;
}

export interface PaymentMethod {
  id: ID;
  brand: 'Visa' | 'Mastercard';
  last4: string;
}

export interface Profile {
  id: ID;
  name: Localized;
  relation: 'self' | 'child';
}

export interface Account {
  profiles: Profile[];
  activeProfileId: ID;
  preferredBranchId: ID;
  paymentMethods: PaymentMethod[];
}

export type BookingStatus =
  | 'booked'
  | 'waitlisted'
  | 'offered'
  | 'cancelled'
  | 'late-cancelled'
  | 'left-waitlist'
  | 'declined'
  | 'offer-expired';

export interface Booking {
  id: ID;
  sessionId: ID;
  profileId: ID;
  status: BookingStatus;
  createdAt: number;
  autoAccept?: boolean;
  offerExpiresAt?: number;
  /** The class was taken from the plan or card. */
  creditUsed?: boolean;
}

export interface Waiver {
  signedAt: number;
  signature: string;
}

export interface Policy {
  lateCancelHours: number;
  bookingWindowDays: number;
  offerHoldMinutes: number;
  autoAcceptCutoffHours: number;
}

export interface Prefs {
  lang: Lang;
  textScale: number;
  highContrast: boolean;
  weeklyGoal: number;
}

export type Role = 'member' | 'owner';

export interface State {
  version: 2;
  generatedAt: number;
  studioName: Localized;
  /** Latin logo text shown in the app header. */
  wordmark: string;
  tagline: Localized;
  branches: Branch[];
  coaches: Coach[];
  templates: ClassTemplate[];
  sessions: ClassSession[];
  members: Member[];
  account: Account;
  memberships: Record<ID, Membership>;
  waivers: Record<ID, Waiver>;
  bookings: Booking[];
  policy: Policy;
  prefs: Prefs;
  contacted: Record<ID, number>;
  role: Role;
}

export interface Notice {
  kind: 'success' | 'error' | 'info';
  text: string;
}

export interface Outcome {
  state: State;
  notices: Notice[];
}
