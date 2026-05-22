import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider } from './src/i18n';
import { StorageKeys } from './src/services/storage';
import { eventBus, Events } from './src/services/eventBus';
import TabNavigator from './src/navigation/TabNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';

const AppContent = () => {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      const done = await AsyncStorage.getItem(StorageKeys.ONBOARDING_DONE);
      setShowOnboarding(done !== 'true');
      setLoading(false);
    })();

    const unsub = eventBus.on(Events.REPLAY_ONBOARDING, () => {
      setShowOnboarding(true);
    });
    return unsub;
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    await AsyncStorage.setItem(StorageKeys.ONBOARDING_DONE, 'true');
    setShowOnboarding(false);
  }, []);

  if (loading) return null;

  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      <TabNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
};

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <NavigationContainer>
              <AppContent />
            </NavigationContainer>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
