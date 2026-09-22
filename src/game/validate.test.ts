import { describe, expect, it } from 'vitest';
import { SAMPLE_LEVEL } from './sampleLevel';
import { classifySubmission } from './validate';

describe('classifySubmission', () => {
  const noneFound = new Set<string>();
  const noBonusFound = new Set<string>();

  it('flags words under 3 letters as too short, before anything else', () => {
    expect(classifySubmission('HA', SAMPLE_LEVEL, noneFound, noBonusFound)).toEqual({
      kind: 'tooShort',
    });
  });

  it('finds a new target word', () => {
    const result = classifySubmission('HAD', SAMPLE_LEVEL, noneFound, noBonusFound);
    expect(result.kind).toBe('found');
    if (result.kind === 'found') {
      expect(result.word.word).toBe('HAD');
    }
  });

  it('is case insensitive when matching a target word', () => {
    expect(classifySubmission('had', SAMPLE_LEVEL, noneFound, noBonusFound).kind).toBe('found');
  });

  it('flags an already found target word as a repeat', () => {
    const alreadyFound = new Set(['HAD']);
    const result = classifySubmission('HAD', SAMPLE_LEVEL, alreadyFound, noBonusFound);
    expect(result.kind).toBe('repeat');
  });

  it('classifies a formable dictionary word that is not a target as bonus', () => {
    const result = classifySubmission('HAND', SAMPLE_LEVEL, noneFound, noBonusFound);
    expect(result).toEqual({ kind: 'bonus', word: 'HAND', isNew: true });
  });

  it('marks a bonus word already in the jar as not new', () => {
    const bonusFound = new Set(['HAND']);
    const result = classifySubmission('HAND', SAMPLE_LEVEL, noneFound, bonusFound);
    expect(result).toEqual({ kind: 'bonus', word: 'HAND', isNew: false });
  });

  it('rejects a word that cannot be formed from the wheel', () => {
    expect(classifySubmission('ZEBRA', SAMPLE_LEVEL, noneFound, noBonusFound)).toEqual({
      kind: 'invalid',
    });
  });

  it('rejects a real word not in this level’s bonus list', () => {
    // "ANEW" is formable-looking but is not in the sample level's bonus list.
    expect(classifySubmission('ANEW', SAMPLE_LEVEL, noneFound, noBonusFound)).toEqual({
      kind: 'invalid',
    });
  });
});
