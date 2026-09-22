import { describe, expect, it } from 'vitest';
import { identitySlots, matchLettersToSlots } from './shuffleMotion';

describe('identitySlots', () => {
  it('assigns instance id = slot index', () => {
    expect(identitySlots(4)).toEqual([0, 1, 2, 3]);
  });
});

describe('matchLettersToSlots', () => {
  it('keeps the same mapping when nothing moved', () => {
    const letters = ['D', 'N', 'H', 'D', 'A', 'E'];
    const slots = identitySlots(letters.length);
    expect(matchLettersToSlots(letters, slots, letters)).toEqual(slots);
  });

  it('produces a full bijection: every previous instance id appears exactly once', () => {
    const prevLetters = ['D', 'N', 'H', 'D', 'A', 'E'];
    const prevSlots = identitySlots(prevLetters.length);
    const newLetters = ['A', 'D', 'D', 'E', 'H', 'N'];

    const mapping = matchLettersToSlots(prevLetters, prevSlots, newLetters);

    expect([...mapping].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('only maps a slot to an instance that held the same letter', () => {
    const prevLetters = ['D', 'N', 'H', 'D', 'A', 'E'];
    const prevSlots = identitySlots(prevLetters.length);
    const newLetters = ['A', 'D', 'D', 'E', 'H', 'N'];

    const mapping = matchLettersToSlots(prevLetters, prevSlots, newLetters);

    mapping.forEach((instanceId, newSlot) => {
      // The instance id equals its original slot index (identity start),
      // so the letter it originally held is prevLetters[instanceId].
      expect(prevLetters[instanceId]).toBe(newLetters[newSlot]);
    });
  });

  it('prefers the closest old slot when several instances share a letter', () => {
    const prevLetters = ['D', 'X', 'X', 'D'];
    const prevSlots = identitySlots(prevLetters.length);
    // Slot 0 wants a 'D': slot 0 itself is the closest 'D' (distance 0).
    const newLetters = ['D', 'X', 'X', 'D'];

    const mapping = matchLettersToSlots(prevLetters, prevSlots, newLetters);

    expect(mapping[0]).toBe(0);
  });

  it('is stable across repeated shuffles (chained mappings stay a bijection)', () => {
    let letters = ['D', 'N', 'H', 'D', 'A', 'E'];
    let slots = identitySlots(letters.length);

    const shuffles = [
      ['H', 'A', 'D', 'E', 'N', 'D'],
      ['N', 'D', 'A', 'D', 'H', 'E'],
    ];

    for (const next of shuffles) {
      slots = matchLettersToSlots(letters, slots, next);
      letters = next;
      expect([...slots].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });
});
