import { loc, msgs } from '../i18n';
import { personName } from './booking';
import { DAY, WEEK } from './time';
import type { ClassSession, ClassTemplate, ClassType, ID, Member, PlanId, State } from './types';

// ---------- churn risk ----------

export type RiskLevel = 'high' | 'medium' | 'low';

export interface ChurnSignal {
  memberId: ID;
  plan: PlanId;
  monthlyPrice: number;
  score: number;
  level: RiskLevel;
  reason: 'new' | 'occasional' | 'drop';
  baselinePerWeek: number;
  recentVisits: number;
  daysSinceLast: number | null;
}

const RECENT_DAYS = 14;
const BASELINE_DAYS = 28;

/**
 * Compares the last 2 weeks with the member's own 4-week baseline before that.
 * Score = drop in attendance (up to 70) + days idle beyond 5 (up to 30).
 */
export function churnSignal(m: Member, now: number): ChurnSignal {
  const recentFrom = now - RECENT_DAYS * DAY;
  const baselineFrom = Math.max(now - (RECENT_DAYS + BASELINE_DAYS) * DAY, m.joinedAt);
  const baselineWeeks = (recentFrom - baselineFrom) / WEEK;
  const recentVisits = m.visits.filter((t) => t >= recentFrom && t <= now).length;
  const baselineVisits = m.visits.filter((t) => t >= baselineFrom && t < recentFrom).length;
  const last = m.visits.filter((t) => t <= now).at(-1);
  const daysSinceLast = last === undefined ? null : Math.floor((now - last) / DAY);
  const base = { memberId: m.id, plan: m.plan, monthlyPrice: m.monthlyPrice, recentVisits, daysSinceLast };

  if (baselineWeeks < 1) return { ...base, score: 0, level: 'low', reason: 'new', baselinePerWeek: 0 };
  const baselinePerWeek = baselineVisits / baselineWeeks;
  if (baselinePerWeek < 0.75) return { ...base, score: 0, level: 'low', reason: 'occasional', baselinePerWeek };
  const expected = baselinePerWeek * (RECENT_DAYS / 7);
  const drop = Math.min(1, Math.max(0, 1 - recentVisits / expected));
  const idle = Math.min(15, Math.max(0, (daysSinceLast ?? RECENT_DAYS + BASELINE_DAYS) - 5));
  const score = Math.round(drop * 70 + idle * 2);
  const level: RiskLevel = score >= 65 ? 'high' : score >= 40 ? 'medium' : 'low';
  return { ...base, score, level, reason: 'drop', baselinePerWeek };
}

export function atRisk(members: Member[], now: number): ChurnSignal[] {
  return members
    .map((m) => churnSignal(m, now))
    .filter((c) => c.level !== 'low')
    .sort((a, b) => b.score - a.score);
}

// ---------- class fill heatmap ----------

export interface HeatCell {
  weekday: number;
  hour: number;
  sessions: number;
  avgFill: number;
  avgWaitlist: number;
}

export function fillHeatmap(sessions: ClassSession[], now: number, days = 28, branchId?: ID): HeatCell[] {
  const from = now - days * DAY;
  const cells = new Map<string, { weekday: number; hour: number; n: number; fill: number; wait: number }>();
  for (const x of sessions) {
    if (x.start < from || x.start >= now || (branchId && x.branchId !== branchId)) continue;
    const d = new Date(x.start);
    const key = `${d.getDay()}-${d.getHours()}`;
    const c = cells.get(key) ?? { weekday: d.getDay(), hour: d.getHours(), n: 0, fill: 0, wait: 0 };
    c.n += 1;
    c.fill += Math.min(1, x.bookedIds.length / x.capacity);
    c.wait += x.peakWaitlist;
    cells.set(key, c);
  }
  return [...cells.values()].map((c) => ({
    weekday: c.weekday,
    hour: c.hour,
    sessions: c.n,
    avgFill: c.fill / c.n,
    avgWaitlist: c.wait / c.n,
  }));
}

// ---------- schedule suggestions ----------

/** Structured, so each language words it in its own pack. */
export interface Suggestion {
  id: string;
  kind: 'add' | 'rethink';
  type: ClassType;
  branchId: ID;
  startMinutes: number;
  weekdays: number[];
  n: number;
  full: number;
  avgFill: number;
  avgWait: number;
  capacity: number;
}

interface SlotStats {
  t: ClassTemplate;
  n: number;
  avgFill: number;
  avgWait: number;
  full: number;
}

/** Add classes where demand overflows, rethink classes that run mostly empty. */
export function scheduleSuggestions(s: State, now: number, days = 28): Suggestion[] {
  const from = now - days * DAY;
  const stats: SlotStats[] = [];
  for (const t of s.templates) {
    const past = s.sessions.filter((x) => x.templateId === t.id && x.start >= from && x.start < now);
    if (past.length < 3) continue;
    stats.push({
      t,
      n: past.length,
      avgFill: past.reduce((sum, x) => sum + Math.min(1, x.bookedIds.length / x.capacity), 0) / past.length,
      avgWait: past.reduce((sum, x) => sum + x.peakWaitlist, 0) / past.length,
      full: past.filter((x) => x.bookedIds.length >= x.capacity).length,
    });
  }

  // Group the weekday variants of the same slot (same branch, type and time).
  const groups = new Map<string, { kind: Suggestion['kind']; items: SlotStats[] }>();
  for (const st of stats) {
    const kind = st.avgFill >= 0.95 && st.avgWait >= 1.5 ? 'add' : st.avgFill < 0.4 ? 'rethink' : null;
    if (!kind) continue;
    const key = `${kind}|${st.t.branchId}|${st.t.type}|${st.t.startMinutes}`;
    const g = groups.get(key) ?? { kind, items: [] };
    g.items.push(st);
    groups.set(key, g);
  }

  const ranked: { suggestion: Suggestion; rank: number }[] = [];
  for (const [key, g] of groups) {
    const t = g.items[0].t;
    const n = g.items.reduce((sum, i) => sum + i.n, 0);
    const avgFill = g.items.reduce((sum, i) => sum + i.avgFill * i.n, 0) / n;
    const avgWait = g.items.reduce((sum, i) => sum + i.avgWait * i.n, 0) / n;
    const suggestion: Suggestion = {
      id: key,
      kind: g.kind,
      type: t.type,
      branchId: t.branchId,
      startMinutes: t.startMinutes,
      weekdays: g.items.map((i) => i.t.weekday),
      n,
      full: g.items.reduce((sum, i) => sum + i.full, 0),
      avgFill,
      avgWait,
      capacity: t.capacity,
    };
    ranked.push({ suggestion, rank: g.kind === 'add' ? 100 + avgWait * g.items.length : 50 - avgFill * 50 });
  }
  return ranked
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 5)
    .map((r) => r.suggestion);
}

/** Title and detail in the state's language. */
export function suggestionText(s: State, sg: Suggestion): { title: string; detail: string } {
  const t = msgs(s);
  const branch = s.branches.length > 1 ? loc(s, s.branches.find((b) => b.id === sg.branchId)?.name ?? { he: '', en: '' }) : undefined;
  const input = { ...sg, branch };
  return { title: t.suggestionTitle(input), detail: t.suggestionDetail(input) };
}

// ---------- KPIs and win-back ----------

export interface Kpis {
  members: number;
  newThisMonth: number;
  visits7: number;
  visitsPrev7: number;
  avgFill: number;
  atRiskHigh: number;
  atRiskTotal: number;
  revenueAtRisk: number;
  mrr: number;
}

export function kpis(s: State, now: number): Kpis {
  const visitsIn = (from: number, to: number) =>
    s.members.reduce((sum, m) => sum + m.visits.filter((t) => t >= from && t < to).length, 0);
  const past28 = s.sessions.filter((x) => x.start >= now - 28 * DAY && x.start < now);
  const avgFill = past28.length
    ? past28.reduce((sum, x) => sum + Math.min(1, x.bookedIds.length / x.capacity), 0) / past28.length
    : 0;
  const risks = atRisk(s.members, now);
  const high = risks.filter((r) => r.level === 'high');
  return {
    members: s.members.length,
    newThisMonth: s.members.filter((m) => m.joinedAt >= now - 30 * DAY).length,
    visits7: visitsIn(now - 7 * DAY, now + 1),
    visitsPrev7: visitsIn(now - 14 * DAY, now - 7 * DAY),
    avgFill,
    atRiskHigh: high.length,
    atRiskTotal: risks.length,
    revenueAtRisk: high.reduce((sum, r) => sum + r.monthlyPrice, 0),
    mrr: s.members.reduce((sum, m) => sum + m.monthlyPrice, 0),
  };
}

export function usualClassOf(s: State, memberId: ID, now: number): ClassTemplate | undefined {
  const counts = new Map<ID, number>();
  for (const x of s.sessions) {
    if (x.start < now && x.bookedIds.includes(memberId)) counts.set(x.templateId, (counts.get(x.templateId) ?? 0) + 1);
  }
  let best: ID | undefined;
  let bestCount = 0;
  for (const [id, n] of counts) {
    if (n > bestCount) {
      best = id;
      bestCount = n;
    }
  }
  return s.templates.find((t) => t.id === best);
}

export function winBackMessage(s: State, c: ChurnSignal, now: number): string {
  const first = personName(s, c.memberId).split(' ')[0];
  const t = usualClassOf(s, c.memberId, now);
  return msgs(s).winBack(
    first,
    loc(s, s.studioName),
    t ? { type: t.type, weekday: t.weekday, startMinutes: t.startMinutes } : undefined,
  );
}
