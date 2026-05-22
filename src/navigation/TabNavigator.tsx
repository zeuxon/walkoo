import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Map, List, Store, BarChart2, User } from 'lucide-react-native';
import { FontSize } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import { useTranslation } from '@/i18n';
import HomeScreen from '@/screens/HomeScreen';
import MapScreen from '@/screens/MapScreen';
import ActivityScreen from '@/screens/ActivityScreen';
import ShopScreen from '@/screens/ShopScreen';
import AnalyticsScreen from '@/screens/AnalyticsScreen';
import ProfileScreen from '@/screens/ProfileScreen';

export type TabParamList = {
  Home: undefined;
  Map: undefined;
  Activity: undefined;
  Shop: undefined;
  Stats: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const TAB_ICONS: Record<string, LucideIcon> = {
  Home:     Home,
  Map:      Map,
  Activity: List,
  Shop:     Store,
  Stats:    BarChart2,
  Profile:  User,
};

const TabNavigator = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const tabLabels: Record<string, string> = {
    Home: t.tabs.home,
    Map: t.tabs.map,
    Activity: t.tabs.activity,
    Shop: t.tabs.shop,
    Stats: t.tabs.stats,
    Profile: t.tabs.profile,
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabel: tabLabels[route.name] ?? route.name,
        tabBarIcon: ({ size, focused, color }) => {
          const Icon = TAB_ICONS[route.name];
          return <Icon size={size} color={color} strokeWidth={focused ? 2.5 : 1.5} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: FontSize.xs,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
      <Tab.Screen name="Stats" component={AnalyticsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
