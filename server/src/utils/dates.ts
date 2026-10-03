/**
 * Calendar-date helpers. Planting and harvest dates are stored as PostgreSQL DATE
 * columns, which Prisma maps to midnight UTC — so all arithmetic here is done in UTC
 * to avoid off-by-one errors around time zones and daylight saving.
 */
const DAY_MS = 86_400_000;

export function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid date: ${value}`);
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) throw new Error(`Invalid date: ${value}`);
  return date;
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar date at midnight UTC (or the date part of `now`). */
export function startOfDayUTC(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function diffInDays(later: Date, earlier: Date): number {
  return Math.round((startOfDayUTC(later).getTime() - startOfDayUTC(earlier).getTime()) / DAY_MS);
}
