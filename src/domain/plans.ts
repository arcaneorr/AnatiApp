import type { CreditKind, PlanId } from './types';

export interface Plan {
  id: PlanId;
  kind: CreditKind;
  /** Classes per month (monthly plans, gift class included) or per card. */
  classes: number;
  price: number; // ILS: per month, or per card
  months?: number; // card validity
}

/** Anati Pilates price list (anati.co.il/pilates). "4 + 1" means 4 classes plus a gift class. */
export const PLANS: Record<PlanId, Plan> = {
  m4: { id: 'm4', kind: 'monthly', classes: 5, price: 260 },
  m6: { id: 'm6', kind: 'monthly', classes: 7, price: 360 },
  m8: { id: 'm8', kind: 'monthly', classes: 9, price: 480 },
  m12: { id: 'm12', kind: 'monthly', classes: 13, price: 680 },
  c10: { id: 'c10', kind: 'card', classes: 10, price: 700, months: 3 },
  c15: { id: 'c15', kind: 'card', classes: 15, price: 975, months: 4 },
  c20: { id: 'c20', kind: 'card', classes: 20, price: 1200, months: 5 },
};

/** What a plan is worth per month, for revenue figures. */
export const monthlyValue = (p: Plan): number => (p.kind === 'monthly' ? p.price : Math.round(p.price / (p.months ?? 1)));

/** The card members can buy in the demo when they run out. */
export const TOP_UP_PLAN: PlanId = 'c10';
