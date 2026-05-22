export type PetMood = 'happy' | 'content' | 'neutral' | 'sad' | 'hungry';
export type TripStatus = 'in_progress' | 'completed' | 'stopped';
export type TripMode = 'walk' | 'transit' | 'mixed';
export type LedgerKind =
  | 'route_progress'
  | 'route_completion'
  | 'challenge_reward'
  | 'daily_streak'
  | 'spend_pack'
  | 'duplicate_refund';

export type ItemCategory = 'skin';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type PackType = 'basic' | 'premium' | 'legendary';

export interface HomeState {
  totalPoints: number;
  todayPoints: number;
  streak: number;
  lastActiveDateKey: string;
  petMood: PetMood;
}

export const DEFAULT_HOME_STATE: HomeState = {
  totalPoints: 0,
  todayPoints: 0,
  streak: 0,
  lastActiveDateKey: '',
  petMood: 'neutral',
};

export interface TripRecord {
  id: string;
  startedAt: string;
  endedAt: string | null;
  mode: TripMode;
  status: TripStatus;
  originLabel: string;
  destinationLabel: string;
  originCoords: LatLng;
  destinationCoords: LatLng;
  routeLengthMeters: number;
  progressMeters: number;
  walkMeters: number;
  transitMeters: number;
  pointsAwarded: number;
  completionBonusAwarded: number;
  txHash: string | null;
}

export interface PointsLedgerEntry {
  id: string;
  createdAt: string;
  deltaPoints: number;
  kind: LedgerKind;
  tripId?: string;
  mode?: TripMode;
  description?: string;
}

export interface PetState {
  petId: string;
  name: string;
  type: 'fox' | 'cat' | 'dog' | 'bird';
  level: number;
  xp: number;
  xpToNextLevel: number;
  mood: PetMood;
  hunger: number;
  energy: number;
  fun: number;
  lastFedAt: string | null;
  lastPlayedAt: string | null;
}

export const DEFAULT_PET_STATE: PetState = {
  petId: 'default',
  name: 'Foxy',
  type: 'fox',
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  mood: 'content',
  hunger: 80,
  energy: 80,
  fun: 80,
  lastFedAt: null,
  lastPlayedAt: null,
};

export interface InventoryItem {
  itemId: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  description: string;
  iconKey: string;
  quantity: number;
  ownedAt: string;
}

export interface EquippedLoadout {
  skin: string | null;
}

export const DEFAULT_LOADOUT: EquippedLoadout = {
  skin: null,
};

export interface PackOpeningRecord {
  id: string;
  openedAt: string;
  packType: PackType;
  cost: number;
  itemsGranted: string[]; // itemIds
}


export type ThemeMode = 'system' | 'light' | 'dark';
export type Language = 'en' | 'hu';

export interface UserSettings {
  otpUrl: string;
  developerMode: boolean;
  trackingEnabled: boolean;
  notificationsEnabled: boolean;
  theme: ThemeMode;
  language: Language;
}

export const DEFAULT_SETTINGS: UserSettings = {
  otpUrl: 'http://100.118.239.129:9000',
  developerMode: false,
  trackingEnabled: true,
  notificationsEnabled: false,
  theme: 'system',
  language: 'en',
};


export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RouteLegStep {
  distance: number;
  streetName?: string;
  absoluteDirection?: string;
  relativeDirection?: string;
  lat?: number;
  lon?: number;
}

export interface RouteLeg {
  mode: 'WALK' | 'BUS' | 'TRAM' | 'RAIL' | 'SUBWAY' | 'FERRY' | 'TRANSIT' | string;
  from: { name?: string; lat: number; lon: number };
  to: { name?: string; lat: number; lon: number };
  distanceMeters: number;
  durationSeconds: number;
  polyline: LatLng[];
  steps: RouteLegStep[];
  routeShortName?: string; // e.g. bus line number
  headsign?: string;
  startTimeMs?: number;
  endTimeMs?: number;
}

export interface PlannedRoute {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  legs: RouteLeg[];
  polyline: LatLng[]; // flattened from all legs
}


export interface NavigationState {
  isNavigating: boolean;
  route: PlannedRoute | null;
  currentLegIndex: number;
  progressMeters: number;
  startedAt: string | null;
  tripId: string | null;
}

export const DEFAULT_NAV_STATE: NavigationState = {
  isNavigating: false,
  route: null,
  currentLegIndex: 0,
  progressMeters: 0,
  startedAt: null,
  tripId: null,
};


export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: 'trips' | 'distance' | 'streak' | 'points' | 'social' | 'special';
  unlockedAt: string | null;
  txHash: string | null;
}


export type ChallengeStatus = 'active' | 'completed' | 'expired';

export interface Challenge {
  id: number;
  name: string;
  description: string;
  templateId?: string;
  target: number;
  progress: number;
  rewardPoints: number;
  status: ChallengeStatus;
  weekKey: string;
  completedAt: string | null;
  txHash: string | null;
}


export interface DailyStats {
  dateKey: string; // YYYY-MM-DD
  tripsStarted: number;
  tripsCompleted: number;
  walkMeters: number;
  transitMeters: number;
  pointsEarned: number;
  pointsSpent: number;
  activeMinutes: number;
}
