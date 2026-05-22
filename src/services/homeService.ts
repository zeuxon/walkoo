import { HomeState, DEFAULT_HOME_STATE, PetMood } from '@/types';
import { loadJSON, saveJSON, StorageKeys } from './storage';
import { eventBus, Events } from './eventBus';

let cached: HomeState | null = null;

const todayKey = (): string => {
  return new Date().toISOString().slice(0, 10);
}

export const getHomeState = async (): Promise<HomeState> => {
  if (cached) return cached;
  cached = await loadJSON<HomeState>(StorageKeys.HOME_STATE, DEFAULT_HOME_STATE);
  const today = todayKey();
  if (cached.lastActiveDateKey !== today) {
    const daysSinceLast = cached.lastActiveDateKey
      ? daysBetween(cached.lastActiveDateKey, today)
      : 0;
    cached = {
      ...cached,
      todayPoints: 0,
      streak: daysSinceLast === 1 ? cached.streak + 1 : daysSinceLast === 0 ? cached.streak : 0,
      lastActiveDateKey: today,
    };
    await saveJSON(StorageKeys.HOME_STATE, cached);
  }
  return cached;
}

export const addPoints = async (delta: number): Promise<HomeState> => {
  const current = await getHomeState();
  const today = todayKey();
  const isNewDay = current.lastActiveDateKey !== today;
  const updated: HomeState = {
    ...current,
    totalPoints: current.totalPoints + delta,
    todayPoints: (isNewDay ? 0 : current.todayPoints) + delta,
    streak: isNewDay
      ? daysBetween(current.lastActiveDateKey, today) === 1
        ? current.streak + 1
        : 1
      : current.streak || 1,
    lastActiveDateKey: today,
    petMood: computeMood(current.totalPoints + delta, current.streak),
  };
  await saveJSON(StorageKeys.HOME_STATE, updated);
  cached = updated;
  eventBus.emit(Events.HOME_STATE_CHANGED, updated);
  return updated;
}

export const spendPoints = async (amount: number): Promise<HomeState | null> => {
  const current = await getHomeState();
  if (current.totalPoints < amount) return null;
  const updated: HomeState = {
    ...current,
    totalPoints: current.totalPoints - amount,
  };
  await saveJSON(StorageKeys.HOME_STATE, updated);
  cached = updated;
  eventBus.emit(Events.HOME_STATE_CHANGED, updated);
  return updated;
}

export const resetHomeState = async (): Promise<void> => {
  await saveJSON(StorageKeys.HOME_STATE, DEFAULT_HOME_STATE);
  cached = DEFAULT_HOME_STATE;
  eventBus.emit(Events.HOME_STATE_CHANGED, DEFAULT_HOME_STATE);
}

const computeMood = (totalPoints: number, streak: number): PetMood => {
  if (streak >= 7 && totalPoints > 500) return 'happy';
  if (streak >= 3) return 'content';
  if (streak >= 1) return 'neutral';
  return 'sad';
}

const daysBetween = (dateKeyA: string, dateKeyB: string): number => {
  const a = new Date(dateKeyA + 'T00:00:00Z');
  const b = new Date(dateKeyB + 'T00:00:00Z');
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
