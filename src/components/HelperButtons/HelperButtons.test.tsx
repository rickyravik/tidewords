import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelperButtons } from './HelperButtons';
import { COINS_MESSAGE_MS, notEnoughCoinsMessage } from './coinsMessage';

const HINT_COPY = 'You need 25 coins for a hint. Finish a level or find bonus words to earn more.';
const REVEAL_COPY =
  'You need 75 coins for a reveal. Finish a level or find bonus words to earn more.';

function renderButtons(coins: number, revealArmed?: boolean) {
  const handlers = { onShuffle: vi.fn(), onHint: vi.fn(), onReveal: vi.fn() };
  render(<HelperButtons coins={coins} revealArmed={revealArmed} {...handlers} />);
  return handlers;
}

const hintButton = () => screen.getByRole('button', { name: /hint/i });
const revealButton = () => screen.getByRole('button', { name: /reveal/i });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('notEnoughCoinsMessage', () => {
  it('matches the HANDOVER 9.7 copy for each paid helper', () => {
    expect(notEnoughCoinsMessage('hint')).toBe(HINT_COPY);
    expect(notEnoughCoinsMessage('reveal')).toBe(REVEAL_COPY);
  });
});

describe('HelperButtons', () => {
  it('runs affordable helpers and shows no message', () => {
    const handlers = renderButtons(200);
    fireEvent.click(hintButton());
    fireEvent.click(revealButton());
    expect(handlers.onHint).toHaveBeenCalledTimes(1);
    expect(handlers.onReveal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(hintButton()).not.toHaveAttribute('aria-disabled');
  });

  it('keeps unaffordable helpers tappable but aria-disabled, with their cost shown', () => {
    renderButtons(10);
    for (const button of [hintButton(), revealButton()]) {
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    }
    expect(hintButton()).toHaveTextContent('25 coins');
    expect(revealButton()).toHaveTextContent('75 coins');
  });

  it('explains a hint shortfall in the live region instead of spending coins', () => {
    const handlers = renderButtons(24);
    fireEvent.click(hintButton());
    expect(handlers.onHint).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(HINT_COPY);
  });

  it('explains a reveal shortfall when a hint is still affordable', () => {
    const handlers = renderButtons(50);
    fireEvent.click(revealButton());
    expect(handlers.onReveal).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(REVEAL_COPY);
    expect(hintButton()).not.toHaveAttribute('aria-disabled');
  });

  it('clears the message after a short while', async () => {
    renderButtons(0);
    fireEvent.click(hintButton());
    expect(screen.getByRole('status')).toHaveTextContent(HINT_COPY);
    act(() => {
      vi.advanceTimersByTime(COINS_MESSAGE_MS - 100);
    });
    expect(screen.getByRole('status')).toHaveTextContent(HINT_COPY);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // The fade-out itself runs on animation frames, so let real time pass.
    vi.useRealTimers();
    await waitFor(() => expect(screen.getByRole('status')).toBeEmptyDOMElement());
  });

  it('dismisses the message on the next touch anywhere', () => {
    renderButtons(0);
    fireEvent.click(revealButton());
    expect(screen.getByRole('status')).toHaveTextContent(REVEAL_COPY);
    fireEvent.pointerDown(window);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('lets an armed Reveal be cancelled even after the balance drops', () => {
    const handlers = renderButtons(50, true);
    expect(revealButton()).not.toHaveAttribute('aria-disabled');
    expect(revealButton()).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(revealButton());
    expect(handlers.onReveal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
