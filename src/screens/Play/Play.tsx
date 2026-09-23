import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  playBonus,
  playFound,
  playInvalid,
  playLevelComplete,
  setMusicEnabled,
  setSoundEnabled,
} from '../../audio/sounds';
import { BonusJar } from '../../components/BonusJar/BonusJar';
import { FirstSwipeGuide } from '../../components/FirstSwipeGuide/FirstSwipeGuide';
import { isFirstPlay, pickGuideWord } from '../../components/FirstSwipeGuide/firstSwipe';
import { Grid } from '../../components/Grid/Grid';
import { HelperButtons } from '../../components/HelperButtons/HelperButtons';
import { TopBar } from '../../components/TopBar/TopBar';
import { Wheel } from '../../components/Wheel/Wheel';
import { WordPreview } from '../../components/WordPreview/WordPreview';
import { HINT_COST, LEVEL_COMPLETE_COINS, REVEAL_COST } from '../../game/economy';
import { vibrateSuccess } from '../../haptics/haptics';
import { pickHintCell, revealWord } from '../../game/hints';
import { classifySubmission } from '../../game/validate';
import { loadDictionary, loadedDictionaryWords } from '../../game/dictionary';
import type { Level, SubmitResult } from '../../game/types';
import { cellKey } from '../../game/types';
import { useReducedMotionPreference } from '../../hooks/useReducedMotion';
import { LEVEL_COMPLETE_FLIP_MS } from '../../motion/timings';
import {
  dailyProgressFor,
  progressFromLevelState,
  useProfileStore,
} from '../../state/profileStore';
import { initLevelState, levelReducer } from '../../state/levelReducer';
import { fitTileSize, isLandscape, TAP_CONTROLS_HEIGHT, wheelSize } from './layout';
import styles from './Play.module.css';
import { useElementSize } from './useElementSize';

const RESULT_DISPLAY_MS = 700;

/** Text for the "HEAD found. 2 words left." live region (Section 12). */
function resultAnnouncement(result: SubmitResult | null, remaining: number): string {
  if (!result) {
    return '';
  }
  switch (result.kind) {
    case 'found':
      return `${result.word.word} found. ${remaining} word${remaining === 1 ? '' : 's'} left.`;
    case 'repeat':
      return `${result.word.word} already found.`;
    case 'bonus':
      return result.isNew ? `Bonus word ${result.word} found.` : `${result.word} already in jar.`;
    case 'invalid':
      return 'Not a word.';
    case 'tooShort':
      return '';
    default:
      return '';
  }
}

export interface PlayProps {
  level: Level;
  /** The player-facing level number: 1-based position across all chapters. */
  levelNumber: number;
  /**
   * Set (to the "YYYY-MM-DD" the daily was started on) when playing the
   * daily puzzle. Daily play saves to `dailyProgress`, pays only the daily
   * reward, and never touches `completedLevelIds` or `levelProgress`.
   */
  dailyDate?: string;
  onComplete: (coinsEarned: number, bonusWordsFoundThisLevel: number) => void;
  /** Leaves the level for Home (the top bar's Home button). */
  onExit?: () => void;
}

export function Play({ level, levelNumber, dailyDate, onComplete, onExit }: PlayProps) {
  const coins = useProfileStore((s) => s.coins);
  const bonusWordsFound = useProfileStore((s) => s.bonusWordsFound);
  const savedProgress = useProfileStore((s) =>
    dailyDate
      ? dailyProgressFor(s.dailyProgress, dailyDate, level.id)
      : s.levelProgress[level.id],
  );
  const spendCoins = useProfileStore((s) => s.spendCoins);
  const recordBonusWord = useProfileStore((s) => s.recordBonusWord);
  const saveLevelProgress = useProfileStore((s) => s.saveLevelProgress);
  const completeLevel = useProfileStore((s) => s.completeLevel);
  const saveDailyProgress = useProfileStore((s) => s.saveDailyProgress);
  const completeDailyPuzzle = useProfileStore((s) => s.completeDailyPuzzle);
  const soundOn = useProfileStore((s) => s.settings.sound);
  const musicOn = useProfileStore((s) => s.settings.music);
  const hapticsOn = useProfileStore((s) => s.settings.haptics);
  const tapMode = useProfileStore((s) => s.settings.tapMode);
  // Phase 2 motion (HANDOVER 9.5): used below to time the level-complete
  // hand-off (Grid/WordPreview read this same combined preference themselves).
  const reduceMotion = useReducedMotionPreference();

  // Keep the sound manager's enabled flags in sync with Settings. These calls don't
  // play anything by themselves (setMusicEnabled(true) does start the ambient loop,
  // but only succeeds once the AudioContext has been unlocked by a real user
  // gesture elsewhere, e.g. the first letter swipe).
  useEffect(() => {
    setSoundEnabled(soundOn);
  }, [soundOn]);
  useEffect(() => {
    setMusicEnabled(musicOn);
  }, [musicOn]);

  const [state, dispatch] = useReducer(levelReducer, level, (lvl) =>
    initLevelState(lvl, savedProgress),
  );
  const [bonusFoundThisLevel, setBonusFoundThisLevel] = useState(0);
  // Reveal is a tile-picker (Section 4 helper table): clicking Reveal only
  // arms picking mode, coins are spent once a grid tile is actually tapped
  // (see handleReveal / handleCellClick below).
  const [revealArmed, setRevealArmed] = useState(false);
  // First-launch hand (HANDOVER 10): decided once on mount from the saved
  // profile, then removed after the first correct word (see guideWord below).
  const [firstPlay] = useState(() => !dailyDate && isFirstPlay(useProfileStore.getState()));
  const wheelAreaRef = useRef<HTMLDivElement>(null);

  const bonusWordsFoundSet = useMemo(() => new Set(bonusWordsFound), [bonusWordsFound]);
  useEffect(() => void loadDictionary(), []); // fetched once, cached for every level

  // Save after every found word (and every reveal), so closing mid level loses nothing.
  // Skips the write while there's nothing to save yet: writing an empty
  // placeholder on mere mount would make every level the player has ever
  // opened look "in progress" (levelProgress[id] would exist but be empty),
  // which also throws off App.tsx's first-launch check (it treats the
  // presence of a levelProgress entry as "not a first launch").
  useEffect(() => {
    if (!state.isComplete && (state.foundWords.size > 0 || state.revealedCells.size > 0)) {
      const progress = progressFromLevelState(state.foundWords, state.revealedCells);
      if (dailyDate) {
        saveDailyProgress(dailyDate, level.id, progress);
      } else {
        saveLevelProgress(level.id, progress);
      }
    }
  }, [
    level.id,
    dailyDate,
    state.foundWords,
    state.revealedCells,
    state.isComplete,
    saveLevelProgress,
    saveDailyProgress,
  ]);

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
    let coinsEarned: number;
    if (dailyDate) {
      coinsEarned = completeDailyPuzzle(dailyDate);
    } else {
      const alreadyCompleted = useProfileStore.getState().completedLevelIds.includes(level.id);
      completeLevel(level.id);
      coinsEarned = alreadyCompleted ? 0 : LEVEL_COMPLETE_COINS;
    }
    if (useProfileStore.getState().settings.sound) {
      playLevelComplete();
    }
    // Motion (HANDOVER 9.5): let the grid's tile-flip wave play out while
    // still on screen before handing off to the Level Complete screen
    // ("tiles flip in a wave, then summary slides up" — the 900ms total is
    // split between this delay and LevelComplete.tsx's own entrance).
    // Reduced motion skips the wave, so hand off immediately.
    const handoffDelay = reduceMotion ? 0 : LEVEL_COMPLETE_FLIP_MS;
    const timer = setTimeout(() => onComplete(coinsEarned, bonusFoundThisLevel), handoffDelay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isComplete]);

  const handleSubmit = () => {
    // Classify here (not in an effect) so we can credit a bonus word to the
    // profile store synchronously, right when the swipe that found it ends.
    const word = state.selection.map((i) => state.wheelLetters[i]).join('');
    const dictionary = loadedDictionaryWords(); // undefined until loaded: falls back to level.bonusWords
    const result = classifySubmission(word, level, state.foundWords, bonusWordsFoundSet, dictionary);
    if (result.kind === 'bonus') {
      const { isNew } = recordBonusWord(result.word);
      if (isNew) {
        setBonusFoundThisLevel((count) => count + 1);
      }
    }
    // Sound/haptic feedback for the submission. This runs inside the pointerup
    // handler that led here (a genuine user gesture), so it also serves to unlock
    // audio on browsers that haven't played anything yet.
    if (result.kind === 'found') {
      if (soundOn) playFound();
      if (hapticsOn) vibrateSuccess();
    } else if (result.kind === 'bonus') {
      if (soundOn) playBonus();
      if (hapticsOn) vibrateSuccess();
    } else if (result.kind === 'invalid') {
      if (soundOn) playInvalid();
    }
    dispatch({ type: 'submit', bonusWordsFound: bonusWordsFoundSet, dictionary });
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

  // Arms/disarms tile-picking; coins are spent in handleCellClick, once the
  // player actually chooses a tile. HelperButtons only calls this when Reveal
  // is affordable (or armed); otherwise it explains the shortfall itself.
  const handleReveal = () => {
    if (revealArmed) {
      setRevealArmed(false);
      return;
    }
    if (coins < REVEAL_COST) {
      return;
    }
    setRevealArmed(true);
  };

  const handleCellClick = (row: number, col: number) => {
    if (!revealArmed) {
      return;
    }
    if (!spendCoins(REVEAL_COST)) {
      setRevealArmed(false);
      return;
    }
    dispatch({ type: 'reveal', cellKeys: revealWord(state.grid, row, col) });
    setRevealArmed(false);
  };

  const liveWord = state.selection.map((i) => state.wheelLetters[i]).join('');
  const displayWord =
    state.selection.length > 0 ? liveWord : state.lastResult ? state.lastWord : '';
  const displayResultKind = state.selection.length > 0 ? null : state.lastResult?.kind;

  // Layout (HANDOVER 9.4): the wheel is sized from the whole Play screen, then
  // the grid's tiles fit whatever area is actually left over (capped at 56px).
  // Without ResizeObserver (jsdom) fall back to the window / a width-only guess.
  const [playRef, playSize] = useElementSize<HTMLDivElement>();
  const [gridAreaRef, gridAreaSize] = useElementSize<HTMLDivElement>();
  const screenSize = playSize ?? { width: window.innerWidth, height: window.innerHeight };
  const landscape = isLandscape(screenSize);
  const wheelDiameter = wheelSize(screenSize, {
    rows: level.rows,
    cols: level.cols,
    extraChrome: tapMode ? TAP_CONTROLS_HEIGHT : 0,
  });
  const tileSize = gridAreaSize
    ? fitTileSize(gridAreaSize, level.rows, level.cols)
    : Math.min(56, Math.floor(320 / Math.max(level.rows, level.cols)));

  const wordsRemaining = level.words.length - state.foundWords.size;

  const guideWord =
    firstPlay && state.foundWords.size === 0 && !state.isComplete
      ? pickGuideWord(
          level.words.map((w) => w.word),
          state.wheelLetters,
        )
      : null;

  return (
    <div ref={playRef} className={`${styles.play} ${landscape ? styles.landscape : ''}`}>
      <TopBar
        coins={coins}
        levelLabel={dailyDate ? 'Daily puzzle' : `Level ${levelNumber}`}
        onHome={onExit}
      />
      {/* Screen-reader-only live region (Section 12): announces each result,
          e.g. "HEAD found. 2 words left.", without changing visible layout. */}
      <div aria-live="polite" className={styles.srOnly}>
        {revealArmed ? 'Reveal armed. Tap a tile to reveal its word.' : resultAnnouncement(state.lastResult, wordsRemaining)}
      </div>
      {/* Portrait: grid above the controls. Landscape/desktop: grid on the
          left, wheel column (pill, jar, wheel, helpers) on the right. */}
      <div className={styles.board}>
        <div ref={gridAreaRef} className={styles.gridArea}>
          <Grid
            level={level}
            grid={state.grid}
            foundWords={state.foundWords}
            revealedCells={state.revealedCells}
            tileSize={tileSize}
            // Additive: only meaningful while Reveal's tile-picker is armed.
            onCellClick={revealArmed ? handleCellClick : undefined}
            // Motion (HANDOVER 9.5): drives the "correct word flies in" /
            // "repeat word pulses" tile animation for just this word, and the
            // level-complete tile-flip wave.
            justResult={
              state.lastResult?.kind === 'found' || state.lastResult?.kind === 'repeat'
                ? state.lastResult
                : null
            }
            celebrateCompletion={state.isComplete}
          />
        </div>
        <div className={styles.controls}>
          {revealArmed && <p className={styles.revealHint}>Tap a tile to reveal its word.</p>}
          <div className={styles.previewArea}>
            <div className={styles.jarArea}>
              <BonusJar />
            </div>
            <WordPreview word={displayWord} resultKind={displayResultKind} />
          </div>
          <div ref={wheelAreaRef} className={styles.wheelArea}>
            <Wheel
              size={wheelDiameter}
              letters={state.wheelLetters}
              selection={state.selection}
              onSelect={(index) => dispatch({ type: 'select', index })}
              onSubmit={handleSubmit}
              tapMode={tapMode}
              onClear={() => dispatch({ type: 'clearSelection' })}
              onShuffle={handleShuffle}
            />
          </div>
          {guideWord && (
            <FirstSwipeGuide
              wheelLetters={state.wheelLetters}
              word={guideWord}
              wheelRef={wheelAreaRef}
              tapMode={tapMode}
              hidden={state.selection.length > 0}
            />
          )}
          <HelperButtons
            coins={coins}
            onShuffle={handleShuffle}
            onHint={handleHint}
            onReveal={handleReveal}
            revealArmed={revealArmed}
          />
        </div>
      </div>
    </div>
  );
}
