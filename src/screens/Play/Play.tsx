import { useEffect, useMemo, useReducer, useState } from 'react';
import { Grid } from '../../components/Grid/Grid';
import { HelperButtons } from '../../components/HelperButtons/HelperButtons';
import { TopBar } from '../../components/TopBar/TopBar';
import { Wheel } from '../../components/Wheel/Wheel';
import { WordPreview } from '../../components/WordPreview/WordPreview';
import { HINT_COST, LEVEL_COMPLETE_COINS, REVEAL_COST } from '../../game/economy';
import { pickHintCell, revealWord } from '../../game/hints';
import { classifySubmission } from '../../game/validate';
import type { Level } from '../../game/types';
import { cellKey } from '../../game/types';
import { progressFromLevelState, useProfileStore } from '../../state/profileStore';
import { initLevelState, levelReducer } from '../../state/levelReducer';
import styles from './Play.module.css';

const RESULT_DISPLAY_MS = 700;

export interface PlayProps {
  level: Level;
  onComplete: (coinsEarned: number, bonusWordsFoundThisLevel: number) => void;
}

export function Play({ level, onComplete }: PlayProps) {
  const coins = useProfileStore((s) => s.coins);
  const bonusWordsFound = useProfileStore((s) => s.bonusWordsFound);
  const savedProgress = useProfileStore((s) => s.levelProgress[level.id]);
  const spendCoins = useProfileStore((s) => s.spendCoins);
  const recordBonusWord = useProfileStore((s) => s.recordBonusWord);
  const saveLevelProgress = useProfileStore((s) => s.saveLevelProgress);
  const completeLevel = useProfileStore((s) => s.completeLevel);

  const [state, dispatch] = useReducer(levelReducer, level, (lvl) =>
    initLevelState(lvl, savedProgress),
  );
  const [bonusFoundThisLevel, setBonusFoundThisLevel] = useState(0);

  const bonusWordsFoundSet = useMemo(() => new Set(bonusWordsFound), [bonusWordsFound]);

  // Save after every found word (and every reveal), so closing mid level loses nothing.
  useEffect(() => {
    if (!state.isComplete) {
      saveLevelProgress(level.id, progressFromLevelState(state.foundWords, state.revealedCells));
    }
  }, [level.id, state.foundWords, state.revealedCells, state.isComplete, saveLevelProgress]);

  useEffect(() => {
    if (!state.lastResult) {
      return;
    }
    const timer = setTimeout(() => dispatch({ type: 'clearResult' }), RESULT_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [state.lastResult]);

  useEffect(() => {
    if (!state.isComplete) {
      return;
    }
    const alreadyCompleted = useProfileStore.getState().completedLevelIds.includes(level.id);
    completeLevel(level.id);
    onComplete(alreadyCompleted ? 0 : LEVEL_COMPLETE_COINS, bonusFoundThisLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isComplete]);

  const handleSubmit = () => {
    // Classify here (not in an effect) so we can credit a bonus word to the
    // profile store synchronously, right when the swipe that found it ends.
    const word = state.selection.map((i) => state.wheelLetters[i]).join('');
    const result = classifySubmission(word, level, state.foundWords, bonusWordsFoundSet);
    if (result.kind === 'bonus') {
      const { isNew } = recordBonusWord(result.word);
      if (isNew) {
        setBonusFoundThisLevel((count) => count + 1);
      }
    }
    dispatch({ type: 'submit', bonusWordsFound: bonusWordsFoundSet });
  };

  const handleShuffle = () => dispatch({ type: 'shuffle' });

  const handleHint = () => {
    if (!spendCoins(HINT_COST)) {
      return;
    }
    const cell = pickHintCell(state.grid, state.revealedCells);
    if (cell) {
      dispatch({ type: 'reveal', cellKeys: [cellKey(cell.row, cell.col)] });
    }
  };

  const handleReveal = () => {
    if (!spendCoins(REVEAL_COST)) {
      return;
    }
    const cell = pickHintCell(state.grid, state.revealedCells);
    if (!cell) {
      return;
    }
    dispatch({ type: 'reveal', cellKeys: revealWord(state.grid, cell.row, cell.col) });
  };

  const liveWord = state.selection.map((i) => state.wheelLetters[i]).join('');
  const displayWord =
    state.selection.length > 0 ? liveWord : state.lastResult ? state.lastWord : '';
  const displayResultKind = state.selection.length > 0 ? null : state.lastResult?.kind;

  // Grid tile size is calculated to fit the available area, capped at 56px:
  // the taller or wider a level's grid, the smaller its tiles need to be.
  const tileSize = Math.min(56, Math.floor(320 / Math.max(level.rows, level.cols)));

  return (
    <div className={styles.play}>
      <TopBar coins={coins} levelLabel={`Level ${level.index}`} />
      <div className={styles.gridArea}>
        <Grid
          level={level}
          grid={state.grid}
          foundWords={state.foundWords}
          revealedCells={state.revealedCells}
          tileSize={tileSize}
        />
      </div>
      <div className={styles.previewArea}>
        <WordPreview word={displayWord} resultKind={displayResultKind} />
      </div>
      <div className={styles.wheelArea}>
        <Wheel
          letters={state.wheelLetters}
          selection={state.selection}
          onSelect={(index) => dispatch({ type: 'select', index })}
          onSubmit={handleSubmit}
        />
      </div>
      <HelperButtons
        coins={coins}
        onShuffle={handleShuffle}
        onHint={handleHint}
        onReveal={handleReveal}
      />
    </div>
  );
}
