import { describe, expect, it } from 'vitest';
import { canForm, letterCounts } from './letters';

describe('letterCounts', () => {
  it('counts duplicate letters', () => {
    expect(letterCounts(['D', 'N', 'H', 'D', 'A', 'E'])).toEqual({
      D: 2,
      N: 1,
      H: 1,
      A: 1,
      E: 1,
    });
  });
});

describe('canForm', () => {
  const wheel = ['D', 'N', 'H', 'D', 'A', 'E']; // two Ds only

  it('allows a word that uses each duplicate letter within the wheel count', () => {
    expect(canForm('HANDED', wheel)).toBe(true); // needs exactly two Ds
  });

  it('rejects a word that needs more of a letter than the wheel has', () => {
    expect(canForm('ADDED', wheel)).toBe(false); // needs three Ds, wheel has two
  });

  it('is case insensitive', () => {
    expect(canForm('head', wheel)).toBe(true);
  });

  it('rejects a word containing a letter absent from the wheel', () => {
    expect(canForm('HANDS', wheel)).toBe(false);
  });
});
