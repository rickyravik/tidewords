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
  settings: Settings;
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
  settings: DEFAULT_SETTINGS,
};

interface ProfileActions {
  spendCoins: (cost: number) => boolean;
  setCurrentLevel: (levelId: string) => void;
  saveLevelProgress: (levelId: string, progress: LevelProgress) => void;
  completeLevel: (levelId: string) => void;
  recordBonusWord: (word: string) => { isNew: boolean; coinsEarned: number };
  completeDailyPuzzle: (date: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetProgress: () => void;
}

export type ProfileStore = SaveData & ProfileActions;

/** Migrates a persisted save to the current shape. Only version 1 exists so far. */
function migrate(persisted: unknown, version: number): SaveData {
  if (version === 1) {
    return persisted as SaveData;
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

      completeDailyPuzzle: (date) =>
        set((state) => {
          if (state.daily.lastCompletedDate === date) {
            return state;
          }
          const streak = state.daily.streak + 1;
          return {
            coins: state.coins + DAILY_COMPLETE_COINS + applyDailyStreak(streak),
            daily: { lastCompletedDate: date, streak },
          };
        }),

      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

      resetProgress: () => set(INITIAL_SAVE),
    }),
    {
      name: 'tidewords:v1',
      version: 1,
      migrate,
    },
  ),
);

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
