import { describe, expect, it } from 'vitest';
import { calendarStrip, hashDateString, pickDailyLevelId, todayDateString } from './daily';

describe('hashDateString', () => {
  it('is deterministic for the same date', () => {
    expect(hashDateString('2026-09-22')).toBe(hashDateString('2026-09-22'));
  });

  it('differs for different dates (no collision for adjacent days)', () => {
    expect(hashDateString('2026-09-22')).not.toBe(hashDateString('2026-09-23'));
  });

  it('is always a non-negative integer', () => {
    for (const date of ['2026-01-01', '2000-02-29', '2099-12-31']) {
      const hash = hashDateString(date);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('pickDailyLevelId', () => {
  const pool = ['c02-l001', 'c02-l002', 'c02-l003', 'c02-l004', 'c02-l005'];

  it('picks the same level for the same date every time', () => {
    const first = pickDailyLevelId('2026-09-22', pool);
    const second = pickDailyLevelId('2026-09-22', pool);
    expect(first).toBe(second);
    expect(pool).toContain(first);
  });

  it('picks a different level for a different date, generally', () => {
    // Not guaranteed for every pair by pigeonhole, but true across a spread
    // of dates against a 5-entry pool — proves the date actually matters.
    const picks = new Set(
      Array.from({ length: 30 }, (_, i) =>
        pickDailyLevelId(`2026-01-${String(i + 1).padStart(2, '0')}`, pool),
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it('returns null for an empty pool', () => {
    expect(pickDailyLevelId('2026-09-22', [])).toBeNull();
  });
});

describe('todayDateString', () => {
  it('formats as YYYY-MM-DD', () => {
    const formatted = todayDateString(new Date(2026, 8, 22)); // September (0-based) 22
    expect(formatted).toBe('2026-09-22');
  });

  it('zero-pads single-digit months and days', () => {
    expect(todayDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('calendarStrip', () => {
  it('returns 7 days, oldest first, ending today', () => {
    const days = calendarStrip('2026-09-22', { lastCompletedDate: null });
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.date)).toEqual([
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
    ]);
    expect(days.at(-1)?.isToday).toBe(true);
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
  });

  it('marks no day complete when nothing has ever been completed', () => {
    const days = calendarStrip('2026-09-22', { lastCompletedDate: null });
    expect(days.every((d) => !d.completed)).toBe(true);
  });

  it("marks today complete when today's puzzle is done", () => {
    const days = calendarStrip('2026-09-22', { lastCompletedDate: '2026-09-22' });
    expect(days.find((d) => d.isToday)?.completed).toBe(true);
    expect(days.filter((d) => d.completed)).toHaveLength(1);
  });

  it('marks a day inside the window complete, and leaves days outside it alone', () => {
    const days = calendarStrip('2026-09-22', { lastCompletedDate: '2026-09-19' });
    expect(days.find((d) => d.date === '2026-09-19')?.completed).toBe(true);
    expect(days.filter((d) => d.completed)).toHaveLength(1);
  });

  it('marks nothing complete when the last completion falls outside the 7-day window', () => {
    const days = calendarStrip('2026-09-22', { lastCompletedDate: '2026-09-01' });
    expect(days.every((d) => !d.completed)).toBe(true);
  });

  it('handles a month boundary correctly', () => {
    const days = calendarStrip('2026-03-02', { lastCompletedDate: null });
    expect(days.map((d) => d.date)).toEqual([
      '2026-02-24',
      '2026-02-25',
      '2026-02-26',
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
  });
});
