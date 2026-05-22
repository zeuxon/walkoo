import { PetState, DEFAULT_PET_STATE, PetMood } from '@/types';
import { loadJSON, saveJSON, StorageKeys } from './storage';
import { eventBus, Events } from './eventBus';
import { spendPoints } from './homeService';


const HUNGER_DECAY_PER_HOUR = 8;
const FUN_DECAY_PER_HOUR    = 5;


export const PLAY_ENERGY_COST = 25;


export const PET_MOOD_MULTIPLIERS: Record<PetMood, number> = {
  happy:   1.10,
  content: 1.05,
  neutral: 1.00,
  sad:     0.80,
  hungry:  0.60,
};


export const TRAIN_COST_POINTS = 25;
const TRAIN_XP_BASE = 50;


export interface LevelPerk {
  requiredLevel: number;
  id: string;
}

export const LEVEL_PERKS: LevelPerk[] = [
  { requiredLevel: 2, id: 'streakShield' },
  { requiredLevel: 3, id: 'tripBonus' },
  { requiredLevel: 5, id: 'powerTraining' },
  { requiredLevel: 8, id: 'pointSurge' },
];

export const getUnlockedPerks = (level: number): LevelPerk[] =>
  LEVEL_PERKS.filter((p) => level >= p.requiredLevel);

export const getNextPerk = (level: number): LevelPerk | null =>
  LEVEL_PERKS.find((p) => p.requiredLevel > level) ?? null;


const xpForLevel = (level: number): number => level * 100;


let cached: PetState | null = null;


const hoursElapsed = (isoTimestamp: string): number =>
  (Date.now() - new Date(isoTimestamp).getTime()) / (1000 * 60 * 60);

const recalculateFromTimestamps = (pet: PetState): PetState => {
  const hunger = pet.lastFedAt
    ? Math.max(0, Math.round(100 - hoursElapsed(pet.lastFedAt) * HUNGER_DECAY_PER_HOUR))
    : pet.hunger;

  const fun = pet.lastPlayedAt
    ? Math.max(0, Math.round(100 - hoursElapsed(pet.lastPlayedAt) * FUN_DECAY_PER_HOUR))
    : (pet.fun ?? 80);

  const mood = computePetMood(hunger, pet.energy, fun);
  return { ...pet, hunger, fun, mood };
};


const computePetMood = (hunger: number, energy: number, fun: number): PetMood => {
  if (hunger < 10)                                 return 'hungry';
  if (hunger < 30 || energy < 20 || fun < 20)      return 'sad';
  if (hunger >= 75 && energy >= 60 && fun >= 60)   return 'happy';
  if (hunger >= 50 && energy >= 40 && fun >= 40)   return 'content';
  return 'neutral';
};


export const getPetState = async (): Promise<PetState> => {
  if (!cached) {
    cached = await loadJSON<PetState>(StorageKeys.PET_STATE, DEFAULT_PET_STATE);
  }
  return recalculateFromTimestamps(cached);
};

export const getPetMoodMultiplier = async (): Promise<number> => {
  const pet = await getPetState();
  return PET_MOOD_MULTIPLIERS[pet.mood];
};

export const addPetXP = async (xp: number): Promise<PetState> => {
  const pet = await getPetState();
  let newXP = pet.xp + xp;
  let newLevel = pet.level;
  let threshold = pet.xpToNextLevel;

  while (newXP >= threshold) {
    newXP -= threshold;
    newLevel++;
    threshold = xpForLevel(newLevel);
  }

  const updated: PetState = { ...pet, xp: newXP, level: newLevel, xpToNextLevel: threshold };
  await savePet(updated);
  return recalculateFromTimestamps(updated);
};

export const feedPet = async (): Promise<PetState> => {
  const pet = await getPetState();
  const updated: PetState = { ...pet, lastFedAt: new Date().toISOString() };
  await savePet(updated);
  return recalculateFromTimestamps(updated);
};

export const playWithPet = async (): Promise<PetState> => {
  const pet = await getPetState();
  const newEnergy = Math.max(0, pet.energy - PLAY_ENERGY_COST);
  const updated: PetState = { ...pet, energy: newEnergy, lastPlayedAt: new Date().toISOString() };
  await savePet(updated);
  const withXP = await addPetXP(10);
  return withXP;
};

export const addPetEnergy = async (amount: number): Promise<void> => {
  const pet = await getPetState();
  const newEnergy = Math.min(100, pet.energy + amount);
  const updated: PetState = { ...pet, energy: newEnergy };
  await savePet(updated);
};

export const trainPet = async (): Promise<{ pet: PetState; xpGained: number } | null> => {
  const spent = await spendPoints(TRAIN_COST_POINTS);
  if (!spent) return null;

  const pet = await getPetState();
  const xpGained = pet.level >= 5 ? TRAIN_XP_BASE * 2 : TRAIN_XP_BASE;
  const updated = await addPetXP(xpGained);
  return { pet: updated, xpGained };
};

export const updatePetName = async (name: string): Promise<PetState> => {
  const pet = await getPetState();
  const updated = { ...pet, name };
  await savePet(updated);
  return updated;
};

export const resetPetState = async (): Promise<void> => {
  await savePet(DEFAULT_PET_STATE);
};

const savePet = async (pet: PetState): Promise<void> => {
  await saveJSON(StorageKeys.PET_STATE, pet);
  cached = pet;
  eventBus.emit(Events.PET_STATE_CHANGED, pet);
};
