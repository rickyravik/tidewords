/**
 * Deterministic daily puzzle selection and streak calendar helpers
 * (HANDOVER.md section 7.2). Pure logic only, no `Date.now()` reads here —
 * callers pass in today's date string so this stays testable and
 * reproducible.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * A small, fast, deterministic string hash (FNV-1a). The same date string
 * always hashes to the same number, on every device, which is what lets
 * every player get the same daily puzzle on the same day with no server.
 */
export function hashDateString(date: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < date.length; i++) {
    hash ^= date.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Picks today's daily level id from a pregenerated pool of level ids, by
 * hashing the date into an index. `pool` order must be stable between runs
 * (e.g. always built the same way from the chapter packs) for this to give
 * every player the same puzzle.
 */
export function pickDailyLevelId(date: string, pool: readonly string[]): string | null {
  if (pool.length === 0) return null;
  const index = hashDateString(date) % pool.length;
  return pool[index] ?? null;
}

/** Today's date as "YYYY-MM-DD" in the player's local time zone. */
export function todayDateString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: string, delta: number): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(year, month - 1, day) + delta * MS_PER_DAY);
  return shifted.toISOString().slice(0, 10);
}

export interface DailyRecord {
  lastCompletedDate: string | null;
  streak: number;
}

/**
 * The streak after completing the daily on `date`: it continues only if the
 * previous completion was the day before, otherwise it starts again at 1.
 */
export function nextStreak(daily: DailyRecord, date: string): number {
  return daily.lastCompletedDate === addDays(date, -1) ? daily.streak + 1 : 1;
}

/**
 * The streak to show on `today`. It's still alive if the last completion was
 * today or yesterday (today's puzzle can still extend it); after a missed day
 * it reads 0 even though `daily.streak` still holds the old run until the
 * next completion resets it.
 */
export function currentStreak(daily: DailyRecord, today: string): number {
  const last = daily.lastCompletedDate;
  return last === today || last === addDays(today, -1) ? daily.streak : 0;
}

export interface CalendarDay {
  date: string;
  isToday: boolean;
  completed: boolean;
}

/**
 * The last 7 days (oldest first, ending today) for the Daily screen's
 * calendar strip. A streak is a run of consecutive days ending on
 * `lastCompletedDate`, so every day in that run is known to be complete.
 * `streak` defaults to 1 (just the last completion) when not supplied.
 */
export function calendarStrip(
  today: string,
  daily: { lastCompletedDate: string | null; streak?: number },
): CalendarDay[] {
  const last = daily.lastCompletedDate;
  const firstOfRun = last === null ? null : addDays(last, -((daily.streak ?? 1) - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    // "YYYY-MM-DD" strings compare correctly as plain strings.
    const completed = last !== null && firstOfRun !== null && date >= firstOfRun && date <= last;
    return { date, isToday: date === today, completed };
  });
}
