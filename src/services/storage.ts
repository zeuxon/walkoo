import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  HOME_STATE: '@walkoo/home_state',
  TRIPS: '@walkoo/trips',
  LEDGER: '@walkoo/ledger',
  PET_STATE: '@walkoo/pet_state',
  INVENTORY: '@walkoo/inventory',
  LOADOUT: '@walkoo/loadout',
  PACK_HISTORY: '@walkoo/pack_history',
  SETTINGS: '@walkoo/settings',
  DAILY_STATS: '@walkoo/daily_stats',
  ONBOARDING_DONE: '@walkoo/onboarding_done',
  BADGES: '@walkoo/badges',
  CHALLENGES: '@walkoo/challenges',
} as const;

export { KEYS as StorageKeys };

export const loadJSON = async <T>(key: string, fallback: T): Promise<T> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[Storage] Failed to load ${key}:`, e);
    return fallback;
  }
};

export const saveJSON = async <T>(key: string, value: T): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[Storage] Failed to save ${key}:`, e);
  }
};

export const clearAll = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch (e) {
    console.warn('[Storage] Failed to clear:', e);
  }
};

export const resetProgress = async (): Promise<void> => {
  const progressKeys = [
    KEYS.HOME_STATE,
    KEYS.TRIPS,
    KEYS.LEDGER,
    KEYS.PET_STATE,
    KEYS.INVENTORY,
    KEYS.LOADOUT,
    KEYS.PACK_HISTORY,
    KEYS.DAILY_STATS,
    KEYS.BADGES,
    KEYS.CHALLENGES,
  ];
  try {
    await AsyncStorage.multiRemove(progressKeys);
  } catch (e) {
    console.warn('[Storage] Failed to reset progress:', e);
  }
};
