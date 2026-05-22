import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useColorScheme } from 'react-native';
import { LightColors, DarkColors, ColorPalette } from './index';
import { ThemeMode } from '@/types';
import { getSettings } from '@/services/settingsService';
import { eventBus, Events } from '@/services/eventBus';

interface ThemeContextValue {
  colors: ColorPalette;
  isDark: boolean;
  themeMode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: LightColors,
  isDark: false,
  themeMode: 'system',
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  const loadTheme = useCallback(async () => {
    const settings = await getSettings();
    setThemeMode(settings.theme ?? 'system');
  }, []);

  useEffect(() => {
    loadTheme();
    const unsub = eventBus.on(Events.SETTINGS_CHANGED, loadTheme);
    return unsub;
  }, [loadTheme]);

  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && systemScheme === 'dark');

  const colors: ColorPalette = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark, themeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextValue => {
  return useContext(ThemeContext);
};
