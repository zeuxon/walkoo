import { Badge } from '@/types';
import { loadJSON, saveJSON, StorageKeys } from './storage';
import { eventBus, Events } from './eventBus';
import { getHomeState } from './homeService';
import { getTripStats } from './tripService';
import { getPetState } from './petService';
import { unlockBadge as unlockBadgeOnChain } from '@/blockchain';
import { getSettings } from './settingsService';
import { translations } from '@/i18n/translations';

interface BadgeDefinition {
  key: string;
  id: number;
  icon: string;
  category: Badge['category'];
  condition: (stats: BadgeStats) => boolean;
}
interface BadgeStats {
  totalTrips: number;
  completedTrips: number;
  totalWalkMeters: number;
  totalTransitMeters: number;
  totalPoints: number;
  streak: number;
  petLevel: number;
  packsOpened: number;
}
const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    key: 'firstSteps',
    id: 1,
    icon: 'F',
    category: 'trips',
    condition: (s) => s.completedTrips >= 1,
  },
  {
    key: 'gettingAround',
    id: 2,
    icon: '5',
    category: 'trips',
    condition: (s) => s.completedTrips >= 5,
  },
  {
    key: 'regularCommuter',
    id: 3,
    icon: 'R',
    category: 'trips',
    condition: (s) => s.completedTrips >= 10,
  },
  {
    key: 'routeMaster',
    id: 4,
    icon: 'M',
    category: 'trips',
    condition: (s) => s.completedTrips >= 25,
  },
  {
    key: 'roadWarrior',
    id: 5,
    icon: 'W',
    category: 'trips',
    condition: (s) => s.completedTrips >= 50,
  },
  {
    key: 'shortWalk',
    id: 10,
    icon: '1',
    category: 'distance',
    condition: (s) => s.totalWalkMeters >= 1000,
  },
  {
    key: 'urbanHiker',
    id: 11,
    icon: 'H',
    category: 'distance',
    condition: (s) => s.totalWalkMeters >= 10_000,
  },
  {
    key: 'marathonWalker',
    id: 12,
    icon: 'Q',
    category: 'distance',
    condition: (s) => s.totalWalkMeters >= 42_195,
  },
  {
    key: 'centuryClub',
    id: 13,
    icon: 'C',
    category: 'distance',
    condition: (s) => s.totalWalkMeters >= 100_000,
  },
  {
    key: 'transitExplorer',
    id: 14,
    icon: 'T',
    category: 'distance',
    condition: (s) => s.totalTransitMeters >= 50_000,
  },
  {
    key: 'twoDayStreak',
    id: 20,
    icon: '2',
    category: 'streak',
    condition: (s) => s.streak >= 2,
  },
  {
    key: 'weekWarrior',
    id: 21,
    icon: '7',
    category: 'streak',
    condition: (s) => s.streak >= 7,
  },
  {
    key: 'fortnightForce',
    id: 22,
    icon: 'N',
    category: 'streak',
    condition: (s) => s.streak >= 14,
  },
  {
    key: 'monthlyDevotion',
    id: 23,
    icon: 'D',
    category: 'streak',
    condition: (s) => s.streak >= 30,
  },
  {
    key: 'pennySaver',
    id: 30,
    icon: 'P',
    category: 'points',
    condition: (s) => s.totalPoints >= 100,
  },
  {
    key: 'pointCollector',
    id: 31,
    icon: 'B',
    category: 'points',
    condition: (s) => s.totalPoints >= 500,
  },
  {
    key: 'thousandaire',
    id: 32,
    icon: 'K',
    category: 'points',
    condition: (s) => s.totalPoints >= 1000,
  },
  {
    key: 'pointMogul',
    id: 33,
    icon: 'G',
    category: 'points',
    condition: (s) => s.totalPoints >= 5000,
  },
];

let cache: Badge[] | null = null;
let cacheLanguage: string | null = null;
const getLocalizedBadgeText = (key: string, lang: string): { name: string; description: string } => {
  return translations[lang as 'en' | 'hu']?.badgeTemplates?.[key]
    ?? translations.en.badgeTemplates[key]
    ?? { name: key, description: '' };
};

export const getBadges = async (): Promise<Badge[]> => {
  const { language } = await getSettings();
  if (cache && cacheLanguage === language) return cache;
  const saved = await loadJSON<Record<number, { unlockedAt: string; txHash: string | null }>>(
    StorageKeys.BADGES,
    {},
  );
  const badges: Badge[] = BADGE_DEFINITIONS.map((def) => ({
    id: def.id,
    name: getLocalizedBadgeText(def.key, language).name,
    description: getLocalizedBadgeText(def.key, language).description,
    icon: def.icon,
    category: def.category,
    unlockedAt: saved[def.id]?.unlockedAt ?? null,
    txHash: saved[def.id]?.txHash ?? null,
  }));
  cache = badges;
  cacheLanguage = language;
  return badges;
};
export const checkAndUnlock = async (): Promise<string[]> => {
  const [badges, stats] = await Promise.all([getBadges(), gatherStats()]);
  const newlyUnlocked: string[] = [];
  for (const badge of badges) {
    if (badge.unlockedAt) continue;
    const def = BADGE_DEFINITIONS.find((d) => d.id === badge.id);
    if (!def) continue;
    if (def.condition(stats)) {
      badge.unlockedAt = new Date().toISOString();
      newlyUnlocked.push(badge.name);
      unlockBadgeOnChain(badge.id, badge.name).then((txHash) => {
        if (txHash) {
          badge.txHash = txHash;
          saveBadges(badges);
        }
      });
    }
  }
  if (newlyUnlocked.length > 0) {
    await saveBadges(badges);
    eventBus.emit(Events.BADGES_CHANGED);
  }
  return newlyUnlocked;
};
export const getUnlockedCount = async (): Promise<number> => {
  const badges = await getBadges();
  return badges.filter((b) => b.unlockedAt !== null).length;
};
export const getTotalCount = (): number => {
  return BADGE_DEFINITIONS.length;
};
export const resetBadges = async (): Promise<void> => {
  cache = null;
  cacheLanguage = null;
  await saveJSON(StorageKeys.BADGES, {});
  eventBus.emit(Events.BADGES_CHANGED);
};

const gatherStats = async (): Promise<BadgeStats> => {
  const [home, tripStats] = await Promise.all([
    getHomeState(),
    getTripStats(),
  ]);
  const pet = await getPetState();
  const packHistory = await loadJSON<unknown[]>(StorageKeys.PACK_HISTORY, []);
  return {
    totalTrips: tripStats.totalTrips,
    completedTrips: tripStats.completedTrips,
    totalWalkMeters: tripStats.walkDistanceMeters,
    totalTransitMeters: tripStats.transitDistanceMeters,
    totalPoints: home.totalPoints,
    streak: home.streak,
    petLevel: pet.level,
    packsOpened: packHistory.length,
  };
};
const saveBadges = async (badges: Badge[]): Promise<void> => {
  const data: Record<number, { unlockedAt: string; txHash: string | null }> = {};
  for (const b of badges) {
    if (b.unlockedAt) {
      data[b.id] = { unlockedAt: b.unlockedAt, txHash: b.txHash };
    }
  }
  cache = badges;
  await saveJSON(StorageKeys.BADGES, data);
};
