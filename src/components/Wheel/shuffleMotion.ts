/**
 * Support for the "Shuffle" motion (HANDOVER 9.5): letters rotate around
 * the wheel to their new spots, rather than just popping into place.
 *
 * The wheel's physical slot positions never move — only which letter sits
 * in which slot changes on a shuffle. To animate a letter tile gliding from
 * its old slot to its new one, each tile needs a stable identity that
 * survives the shuffle. `matchLettersToSlots` assigns that identity by
 * matching equal letters between the old and new arrangement (preferring
 * the closest old slot, for the shortest, most natural-looking glide).
 * Since duplicate letters are interchangeable, any valid matching produces
 * a correct-looking animation — this does not need to track "the real"
 * physical tile, only *a* consistent one.
 */

/** The starting identity assignment: slot `i` is instance `i`. */
export function identitySlots(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i);
}

/**
 * Given the previous letters-by-slot and which stable instance id occupied
 * each of those slots, plus the new letters-by-slot after a shuffle,
 * returns the new slot -> instance id mapping.
 *
 * `prevLetters` and `newLetters` must be permutations of the same multiset,
 * which holds for every real shuffle (it reorders a fixed set of wheel
 * letters). If a letter in `newLetters` has no remaining match in
 * `prevLetters` — which should not happen for a true shuffle — that slot
 * keeps whatever instance id it previously had, so rendering never breaks.
 */
export function matchLettersToSlots(
  prevLetters: string[],
  prevSlotToInstance: number[],
  newLetters: string[],
): number[] {
  const availableByLetter = new Map<string, number[]>();
  prevLetters.forEach((letter, slot) => {
    const slots = availableByLetter.get(letter) ?? [];
    slots.push(slot);
    availableByLetter.set(letter, slots);
  });

  return newLetters.map((letter, newSlot) => {
    const candidates = availableByLetter.get(letter);
    if (!candidates || candidates.length === 0) {
      return prevSlotToInstance[newSlot] ?? newSlot;
    }

    let bestIndex = 0;
    let bestDistance = Infinity;
    candidates.forEach((oldSlot, i) => {
      const distance = Math.abs(oldSlot - newSlot);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    });

    const [oldSlot] = candidates.splice(bestIndex, 1);
    return prevSlotToInstance[oldSlot!]!;
  });
}
