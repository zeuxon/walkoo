const brand = {
  primary: '#4CAF50',
  primaryDark: '#388E3C',
  primaryLight: '#C8E6C9',
  accent: '#FF9800',
  accentDark: '#F57C00',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  walkRoute: '#4CAF50',
  transitRoute: '#2196F3',
  routeProgress: '#FF9800',
  rarityCommon: '#9E9E9E',
  rarityUncommon: '#4CAF50',
  rarityRare: '#2196F3',
  rarityEpic: '#9C27B0',
  rarityLegendary: '#FF9800',
  textOnPrimary: '#FFFFFF',
};

export const LightColors = {
  ...brand,
  background: '#F5F5F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  textLight: '#9E9E9E',
  border: '#E0E0E0',
  divider: '#EEEEEE',
};

export const DarkColors = {
  ...brand,
  background: '#0F0F0F',
  surface: '#1A1A1A',
  card: '#222222',
  text: '#EFEFEF',
  textSecondary: '#AAAAAA',
  textLight: '#888888',
  border: '#333333',
  divider: '#2A2A2A',
};

export type ColorPalette = typeof LightColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 32,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
};

