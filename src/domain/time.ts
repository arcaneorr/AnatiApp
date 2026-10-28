// Locale-free time helpers. Language-specific formatting lives in src/i18n.
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Calendar-safe day arithmetic (survives DST changes). */
export function addDays(t: number, days: number): number {
  const d = new Date(t);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function addMonths(t: number, months: number): number {
  const d = new Date(t);
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

export function atMinutes(dayStart: number, minutes: number): number {
  const d = new Date(dayStart);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.getTime();
}

/** Weeks start on Sunday (Israeli work week). */
export function startOfWeek(t: number): number {
  const day = startOfDay(t);
  return addDays(day, -new Date(day).getDay());
}

export function weekdayOf(t: number): number {
  return new Date(t).getDay();
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY);
}

export function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function fmtTime(t: number): string {
  const d = new Date(t);
  return hhmm(d.getHours() * 60 + d.getMinutes());
}

/** Local calendar date as YYYY-MM-DD. */
export function isoDate(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
