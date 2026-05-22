import { getSettings, updateSettings, resetSettings } from '@/services/settingsService';
import { DEFAULT_SETTINGS } from '@/types';

beforeEach(async () => {
  await resetSettings();
});

describe('settingsService', () => {
  describe('getSettings', () => {
    it('returns default settings on first load', async () => {
      const settings = await getSettings();
      expect(settings.developerMode).toBe(DEFAULT_SETTINGS.developerMode);
      expect(settings.language).toBe(DEFAULT_SETTINGS.language);
      expect(settings.theme).toBe(DEFAULT_SETTINGS.theme);
      expect(settings.trackingEnabled).toBe(DEFAULT_SETTINGS.trackingEnabled);
    });

    it('developer mode defaults to false', async () => {
      const settings = await getSettings();
      expect(settings.developerMode).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('merges a single field without touching others', async () => {
      await updateSettings({ language: 'hu' });
      const settings = await getSettings();
      expect(settings.language).toBe('hu');
      expect(settings.theme).toBe(DEFAULT_SETTINGS.theme);
      expect(settings.developerMode).toBe(DEFAULT_SETTINGS.developerMode);
    });

    it('persists the patch across reads', async () => {
      await updateSettings({ developerMode: true });
      const settings = await getSettings();
      expect(settings.developerMode).toBe(true);
    });

    it('multiple patches accumulate correctly', async () => {
      await updateSettings({ language: 'hu' });
      await updateSettings({ theme: 'dark' });
      const settings = await getSettings();
      expect(settings.language).toBe('hu');
      expect(settings.theme).toBe('dark');
    });

    it('returns the updated settings object', async () => {
      const updated = await updateSettings({ language: 'hu' });
      expect(updated.language).toBe('hu');
    });
  });

  describe('resetSettings', () => {
    it('restores defaults after changes', async () => {
      await updateSettings({ language: 'hu', developerMode: true, theme: 'dark' });
      await resetSettings();
      const settings = await getSettings();
      expect(settings.language).toBe(DEFAULT_SETTINGS.language);
      expect(settings.developerMode).toBe(DEFAULT_SETTINGS.developerMode);
      expect(settings.theme).toBe(DEFAULT_SETTINGS.theme);
    });
  });
});
