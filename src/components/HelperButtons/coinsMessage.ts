import { HINT_COST, REVEAL_COST } from '../../game/economy';

export type PaidHelper = 'hint' | 'reveal';

/** How long the "not enough coins" note stays on screen. */
export const COINS_MESSAGE_MS = 3500;

export const HELPER_COSTS: Record<PaidHelper, number> = {
  hint: HINT_COST,
  reveal: REVEAL_COST,
};

/** HANDOVER 9.7 copy, e.g. "You need 25 coins for a hint. Finish a level or find bonus words to earn more." */
export function notEnoughCoinsMessage(helper: PaidHelper): string {
  return `You need ${HELPER_COSTS[helper]} coins for a ${helper}. Finish a level or find bonus words to earn more.`;
}
