export interface TourStep {
  /** Queried with `container.querySelector`, scoped to the Play screen's root. */
  selector: string;
  title: string;
  body: string;
}

/**
 * First-launch UI tour: one spotlight per screen element a new player
 * wouldn't otherwise guess the purpose of. The wheel itself is taught
 * separately by FirstSwipeGuide's hand animation, so it's left out here.
 */
export const UI_TOUR_STEPS: readonly TourStep[] = [
  {
    selector: '[data-tour="grid"]',
    title: 'The grid',
    body: 'Spell the words hidden in the wheel to fill these tiles in.',
  },
  {
    selector: '[data-tour="jar"]',
    title: 'Bonus jar',
    body: "Spell any other real word and it isn't a target — it drops a bonus coin in here instead.",
  },
  {
    selector: '[data-tour="shuffle"]',
    title: 'Shuffle',
    body: 'Mixes up the wheel’s letters. Always free, use it as often as you like.',
  },
  {
    selector: '[data-tour="hint"]',
    title: 'Hint',
    body: 'Reveals one letter on the grid for 25 coins.',
  },
  {
    selector: '[data-tour="reveal"]',
    title: 'Reveal',
    body: 'Reveals a whole word for 75 coins.',
  },
];
