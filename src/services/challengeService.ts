import { Challenge, ChallengeStatus } from '@/types';
import { loadJSON, saveJSON, StorageKeys } from './storage';
import { eventBus, Events } from './eventBus';
import { addPoints } from './homeService';
import { addLedgerEntry } from './ledgerService';
import { completeChallenge as completeChallengeOnChain } from '@/blockchain';
import { getSettings } from '@/services/settingsService';
import { translations } from '@/i18n/translations';


interface ChallengeTemplate {
  id: string;
  target: number;
  rewardPoints: number;
  metric: 'completed_trips' 
  | 'walk_meters' 
  | 'transit_meters' 
  | 'total_meters' 
  | 'points_earned';
}

const CHALLENGE_POOL: ChallengeTemplate[] = [
  { id: 'commuter', target: 3, rewardPoints: 75, metric: 'completed_trips' },
  {
    id: 'frequentRider', target: 5, rewardPoints: 150, metric: 'completed_trips',
  },
  {
    id: 'dailyDriver', target: 7, rewardPoints: 250, metric: 'completed_trips',
  },

  { id: 'walkAKilometer', target: 1000, rewardPoints: 50, metric: 'walk_meters' },
  {
    id: 'urbanWalker', target: 5000, rewardPoints: 120, metric: 'walk_meters',
  },
  {
    id: 'longStrider', target: 10000, rewardPoints: 250, metric: 'walk_meters',
  },

  { id: 'busRider', target: 5000, rewardPoints: 80, metric: 'transit_meters' },
  {
    id: 'transitFan', target: 15000, rewardPoints: 175, metric: 'transit_meters',
  },

  { id: 'goTheDistance', target: 10000, rewardPoints: 100, metric: 'total_meters' },
  {
    id: 'explorer', target: 20000, rewardPoints: 200, metric: 'total_meters',
  },

  { id: 'pointChaser', target: 200, rewardPoints: 50, metric: 'points_earned' },
  {
    id: 'bigEarner', target: 500, rewardPoints: 125, metric: 'points_earned',
  },
];


const getWeekKey = (date: Date = new Date()): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const pickChallengesForWeek = (weekKey: string): ChallengeTemplate[] => {
  const weekNum = parseInt(weekKey.split('-W')[1], 10) || 0;
  const poolSize = CHALLENGE_POOL.length;

  const indices: number[] = [];
  for (let i = 0; i < 3; i++) {
    indices.push((weekNum * 3 + i) % poolSize);
  }

  return indices.map((i) => CHALLENGE_POOL[i]);
};


let cache: Challenge[] | null = null;
let cacheLanguage: string | null = null;


export const getChallenges = async (): Promise<Challenge[]> => {
  const settings = await getSettings();
  const lang = settings.language || 'en';
  if (cache && cacheLanguage === lang) return cache;

  const saved = await loadJSON<Challenge[]>(StorageKeys.CHALLENGES, []);
  const currentWeek = getWeekKey();

  const hasCurrentWeek = saved.some((c) => c.weekKey === currentWeek);

  if (!hasCurrentWeek) {
    const templates = pickChallengesForWeek(currentWeek);
    const baseId = parseInt(currentWeek.replace(/\D/g, ''), 10) * 10;

    const newChallenges: Challenge[] = templates.map((t, i) => {
      const localized = (translations[lang]?.challengeTemplates && translations[lang].challengeTemplates[t.id])
        || translations.en.challengeTemplates[t.id]
        || { name: t.id, description: '' };
      return {
        id: baseId + i,
        templateId: t.id,
        name: localized.name,
        description: localized.description,
        target: t.target,
        progress: 0,
        rewardPoints: t.rewardPoints,
        status: 'active' as ChallengeStatus,
        weekKey: currentWeek,
        completedAt: null,
        txHash: null,
      };
    });

    for (const c of saved) {
      if (c.status === 'active' && c.weekKey !== currentWeek) {
        c.status = 'expired';
      }
    }

    saved.push(...newChallenges);
    await saveChallenges(saved);
  }

  let changed = false;
  for (const c of saved) {
    if (c.status === 'active' && c.weekKey !== currentWeek) {
      c.status = 'expired';
      changed = true;
    }
  }
  if (changed) {
    await saveChallenges(saved);
  }

  cache = saved;
  cacheLanguage = lang;
  return saved;
};

export const getCurrentWeekChallenges = async (): Promise<Challenge[]> => {
  const all = await getChallenges();
  const currentWeek = getWeekKey();
  return all.filter((c) => c.weekKey === currentWeek);
};

export const updateProgress = async (params: {
  completedTrips: number;
  walkMeters: number;
  transitMeters: number;
  pointsEarned: number;
}): Promise<string[]> => {
  const challenges = await getCurrentWeekChallenges();
  const newlyCompleted: string[] = [];

  for (const challenge of challenges) {
    if (challenge.status !== 'active') continue;

    let template: ChallengeTemplate | null = CHALLENGE_POOL.find((t) => t.id === challenge.templateId) ?? null;
    if (!template) {
      const langSettings = await getSettings();
      const lang = langSettings.language || 'en';
      template = CHALLENGE_POOL.find((t) => {
        const localized = translations[lang]?.challengeTemplates?.[t.id] || translations.en.challengeTemplates[t.id];
        return localized && localized.name === challenge.name;
      }) ?? null;
    }
    if (!template) continue;

    switch (template.metric) {
      case 'completed_trips':
        challenge.progress = params.completedTrips;
        break;
      case 'walk_meters':
        challenge.progress = params.walkMeters;
        break;
      case 'transit_meters':
        challenge.progress = params.transitMeters;
        break;
      case 'total_meters':
        challenge.progress = params.walkMeters + params.transitMeters;
        break;
      case 'points_earned':
        challenge.progress = params.pointsEarned;
        break;
    }

    if (challenge.progress >= challenge.target) {
      challenge.progress = challenge.target;
      challenge.status = 'completed';
      challenge.completedAt = new Date().toISOString();
      newlyCompleted.push(challenge.name);

      await addLedgerEntry({
        deltaPoints: challenge.rewardPoints,
        kind: 'challenge_reward',
        description: `Challenge completed: ${challenge.name} (+${challenge.rewardPoints} pts)`,
      });
      await addPoints(challenge.rewardPoints);

      completeChallengeOnChain(challenge.id, challenge.name).then((txHash) => {
        if (txHash) {
          challenge.txHash = txHash;
          saveChallenges(cache ?? []);
        }
      });
    }
  }

  if (newlyCompleted.length > 0 || challenges.some((c) => c.status === 'active')) {
    const all = await getChallenges();
    await saveChallenges(all);
    eventBus.emit(Events.CHALLENGES_CHANGED);
  }

  return newlyCompleted;
};

export const resetChallenges = async (): Promise<void> => {
  cache = null;
  cacheLanguage = null;
  await saveJSON(StorageKeys.CHALLENGES, []);
  eventBus.emit(Events.CHALLENGES_CHANGED);
};


const saveChallenges = async (challenges: Challenge[]): Promise<void> => {
  cache = challenges;
  await saveJSON(StorageKeys.CHALLENGES, challenges);
};

export const regenerateCurrentWeekChallenges = async (): Promise<void> => {
  try {
    const saved = await loadJSON<Challenge[]>(StorageKeys.CHALLENGES, []);
    const currentWeek = getWeekKey();
    const settings = await getSettings();
    const lang = settings.language || 'en';

    const current = saved.filter((c) => c.weekKey === currentWeek);
    const needsRegen = current.some((c) => !c.templateId || (
      c.templateId && ((translations[lang]?.challengeTemplates?.[c.templateId]?.name ?? '') !== c.name)
    ));

    if (!needsRegen) return;

    const backupKey = `${StorageKeys.CHALLENGES}_bak_${Date.now()}`;
    await saveJSON(backupKey, saved);

    const remaining = saved.filter((c) => c.weekKey !== currentWeek);
    await saveJSON(StorageKeys.CHALLENGES, remaining);

    cache = null;
    await getChallenges();
    eventBus.emit(Events.CHALLENGES_CHANGED);
  } catch (e) {
    console.warn('[Challenges] Failed to regenerate current week:', e);
  }
};


(async () => {
  await regenerateCurrentWeekChallenges();
})();

eventBus.on(Events.SETTINGS_CHANGED, async () => {
  cache = null;
  cacheLanguage = null;
  await regenerateCurrentWeekChallenges();
});
