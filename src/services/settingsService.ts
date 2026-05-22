import { UserSettings, DEFAULT_SETTINGS } from '@/types';
import { loadJSON, saveJSON, StorageKeys } from './storage';
import { eventBus, Events } from './eventBus';

let cached: UserSettings | null = null;

export const getSettings = (): Promise<UserSettings> => {
  if (cached) return Promise.resolve(cached);
  return loadJSON<UserSettings>(StorageKeys.SETTINGS, DEFAULT_SETTINGS).then((settings) => {
    cached = settings;
    return settings;
  });
}

export const updateSettings = (
  patch: Partial<UserSettings>,
): Promise<UserSettings> => {
  return getSettings().then(async (current) => {
    const updated = { ...current, ...patch };
    await saveJSON(StorageKeys.SETTINGS, updated);
    cached = updated;
    eventBus.emit(Events.SETTINGS_CHANGED, updated);
    return updated;
  });
};

export const resetSettings = (): Promise<void> => {
  return saveJSON(StorageKeys.SETTINGS, DEFAULT_SETTINGS).then(() => {
    cached = DEFAULT_SETTINGS;
    eventBus.emit(Events.SETTINGS_CHANGED, DEFAULT_SETTINGS);
  });
}
