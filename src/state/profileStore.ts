import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  BONUS_JAR_SIZE,
  DAILY_COMPLETE_COINS,
  LEVEL_COMPLETE_COINS,
  STARTING_COINS,
  addToBonusJar,
  applyDailyStreak,
  canAfford,
} from '../game/economy';
import { nextStreak } from '../game/daily';
import type { CellKey, LevelProgress } from '../game/types';

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  dyslexiaFont: boolean;
  tapMode: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  sound: true,
  music: false,
  haptics: true,
  reducedMotion: false,
  highContrast: false,
  dyslexiaFont: false,
  tapMode: false,
};

export interface SaveData {
  version: 1;
  coins: number;
  currentLevelId: string;
  completedLevelIds: string[];
  levelProgress: Record<string, LevelProgress>;
  bonusJarCount: number;
  bonusWordsFound: string[];
  daily: { lastCompletedDate: string | null; streak: number };
  /**
   * The daily puzzle's in-progress state, kept apart from `levelProgress` so
   * playing the daily never makes that level look "in progress" on the
   * normal path. Tagged with the date it was started, so a half-finished
   * daily from an earlier day is simply ignored. Added after v1 shipped:
   * older saves lack it and pick up the `null` default on load.
   */
  dailyProgress: DailyProgress | null;
  settings: Settings;
  /** Whether the first-launch UI tour (grid, jar, helper buttons) has been shown. */
  hasSeenUiTour: boolean;
}

export interface DailyProgress {
  date: string;
  levelId: string;
  progress: LevelProgress;
}

const INITIAL_SAVE: SaveData = {
  version: 1,
  coins: STARTING_COINS,
  currentLevelId: 'c01-l001',
  completedLevelIds: [],
  levelProgress: {},
  bonusJarCount: 0,
  bonusWordsFound: [],
  daily: { lastCompletedDate: null, streak: 0 },
  dailyProgress: null,
  settings: DEFAULT_SETTINGS,
  hasSeenUiTour: false,
};

interface ProfileActions {
  spendCoins: (cost: number) => boolean;
  setCurrentLevel: (levelId: string) => void;
  saveLevelProgress: (levelId: string, progress: LevelProgress) => void;
  completeLevel: (levelId: string) => void;
  recordBonusWord: (word: string) => { isNew: boolean; coinsEarned: number };
  saveDailyProgress: (date: string, levelId: string, progress: LevelProgress) => void;
  /** Pays the daily reward (+ streak bonus) once per date; returns the coins paid. */
  completeDailyPuzzle: (date: string) => number;
  updateSettings: (patch: Partial<Settings>) => void;
  markUiTourSeen: () => void;
  resetProgress: () => void;
}

export type ProfileStore = SaveData & ProfileActions;

/**
 * Migrates a persisted save to the current shape. Only version 1 exists so
 * far; fields added to v1 later (e.g. `dailyProgress`) are filled from the
 * defaults. (For a same-version load, persist's default shallow merge over
 * the initial state already does the same.)
 */
function migrate(persisted: unknown, version: number): SaveData {
  if (version === 1) {
    return { ...INITIAL_SAVE, ...(persisted as Partial<SaveData>) };
  }
  return INITIAL_SAVE;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_SAVE,

      spendCoins: (cost) => {
        const { coins } = get();
        if (!canAfford(coins, cost)) {
          return false;
        }
        set({ coins: coins - cost });
        return true;
      },

      setCurrentLevel: (levelId) => set({ currentLevelId: levelId }),

      saveLevelProgress: (levelId, progress) =>
        set((state) => ({
          levelProgress: { ...state.levelProgress, [levelId]: progress },
        })),

      completeLevel: (levelId) =>
        set((state) => {
          const alreadyCompleted = state.completedLevelIds.includes(levelId);
          const remainingProgress = { ...state.levelProgress };
          delete remainingProgress[levelId];
          return {
            coins: alreadyCompleted ? state.coins : state.coins + LEVEL_COMPLETE_COINS,
            completedLevelIds: alreadyCompleted
              ? state.completedLevelIds
              : [...state.completedLevelIds, levelId],
            levelProgress: remainingProgress,
          };
        }),

      recordBonusWord: (word) => {
        const state = get();
        const isNew = !state.bonusWordsFound.includes(word);
        if (!isNew) {
          return { isNew: false, coinsEarned: 0 };
        }
        const { jarCount, coinsEarned } = addToBonusJar(state.bonusJarCount);
        set({
          bonusWordsFound: [...state.bonusWordsFound, word],
          bonusJarCount: jarCount,
          coins: state.coins + coinsEarned,
        });
        return { isNew: true, coinsEarned };
      },

      saveDailyProgress: (date, levelId, progress) =>
        set({ dailyProgress: { date, levelId, progress } }),

      completeDailyPuzzle: (date) => {
        const state = get();
        if (state.daily.lastCompletedDate === date) {
          return 0;
        }
        const streak = nextStreak(state.daily, date);
        const coinsEarned = DAILY_COMPLETE_COINS + applyDailyStreak(streak);
        set({
          coins: state.coins + coinsEarned,
          daily: { lastCompletedDate: date, streak },
          dailyProgress: null,
        });
        return coinsEarned;
      },

      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

      markUiTourSeen: () => set({ hasSeenUiTour: true }),

      resetProgress: () => set(INITIAL_SAVE),
    }),
    {
      name: 'tidewords:v1',
      version: 1,
      migrate,
    },
  ),
);

/** The saved daily progress for `levelId` on `date`, if that's the daily in progress. */
export function dailyProgressFor(
  dailyProgress: DailyProgress | null,
  date: string,
  levelId: string,
): LevelProgress | undefined {
  return dailyProgress?.date === date && dailyProgress.levelId === levelId
    ? dailyProgress.progress
    : undefined;
}

export function emptyLevelProgress(): LevelProgress {
  return { foundWords: [], revealedCells: [] };
}

export function progressFromLevelState(
  foundWords: ReadonlySet<string>,
  revealedCells: ReadonlySet<CellKey>,
): LevelProgress {
  return { foundWords: [...foundWords], revealedCells: [...revealedCells] };
}

export { BONUS_JAR_SIZE };
