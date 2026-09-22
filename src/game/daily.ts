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

export interface CalendarDay {
  date: string;
  isToday: boolean;
  completed: boolean;
}

/**
 * The last 7 days (oldest first, ending today) for the Daily screen's
 * calendar strip. `SaveData.daily` only remembers the single most recent
 * completion date, not full day-by-day history, so only that one date (when
 * it falls inside this 7-day window) can honestly be marked complete here —
 * the running `streak` count is the reliable total and is shown alongside
 * this strip, not spread across it.
 */
export function calendarStrip(
  today: string,
  daily: { lastCompletedDate: string | null },
): CalendarDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, isToday: date === today, completed: daily.lastCompletedDate === date };
  });
}
