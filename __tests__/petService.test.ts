import {
  PET_MOOD_MULTIPLIERS,
  LEVEL_PERKS,
  TRAIN_COST_POINTS,
  PLAY_ENERGY_COST,
  getUnlockedPerks,
  getNextPerk,
  getPetState,
  getPetMoodMultiplier,
  addPetXP,
  addPetEnergy,
  feedPet,
  playWithPet,
  resetPetState,
} from '@/services/petService';
import { resetHomeState } from '@/services/homeService';

beforeEach(async () => {
  await resetPetState();
  await resetHomeState();
});

describe('petService', () => {
  describe('PET_MOOD_MULTIPLIERS', () => {
    it('happy has the highest multiplier', () => {
      expect(PET_MOOD_MULTIPLIERS.happy).toBeGreaterThan(PET_MOOD_MULTIPLIERS.content);
      expect(PET_MOOD_MULTIPLIERS.happy).toBeGreaterThan(PET_MOOD_MULTIPLIERS.neutral);
    });

    it('hungry has the lowest multiplier', () => {
      expect(PET_MOOD_MULTIPLIERS.hungry).toBeLessThan(PET_MOOD_MULTIPLIERS.sad);
      expect(PET_MOOD_MULTIPLIERS.hungry).toBeLessThan(PET_MOOD_MULTIPLIERS.neutral);
    });

    it('neutral multiplier is exactly 1.0', () => {
      expect(PET_MOOD_MULTIPLIERS.neutral).toBe(1.0);
    });
  });

  describe('getUnlockedPerks', () => {
    it('returns no perks at level 1', () => {
      expect(getUnlockedPerks(1)).toHaveLength(0);
    });

    it('unlocks Streak Shield at level 2', () => {
      const perks = getUnlockedPerks(2);
      expect(perks.some((p) => p.requiredLevel === 2)).toBe(true);
    });

    it('unlocks all perks up to current level', () => {
      const perks = getUnlockedPerks(5);
      expect(perks.length).toBe(3);
    });

    it('returns all perks at max level in LEVEL_PERKS', () => {
      const maxLevel = Math.max(...LEVEL_PERKS.map((p) => p.requiredLevel));
      const perks = getUnlockedPerks(maxLevel);
      expect(perks.length).toBe(LEVEL_PERKS.length);
    });
  });

  describe('getNextPerk', () => {
    it('returns the level-2 perk when at level 1', () => {
      const next = getNextPerk(1);
      expect(next).not.toBeNull();
      expect(next!.requiredLevel).toBe(2);
    });

    it('returns the next unearned perk', () => {
      const next = getNextPerk(2);
      expect(next!.requiredLevel).toBeGreaterThan(2);
    });

    it('returns null when all perks are unlocked', () => {
      const maxLevel = Math.max(...LEVEL_PERKS.map((p) => p.requiredLevel));
      const next = getNextPerk(maxLevel);
      expect(next).toBeNull();
    });
  });

  describe('getPetState', () => {
    it('returns level 1 pet on fresh state', async () => {
      const state = await getPetState();
      expect(state.level).toBe(1);
      expect(state.xp).toBe(0);
    });

    it('recomputes mood from hunger/energy', async () => {
      const state = await getPetState();
      expect(state.mood).toBe('happy');
    });
  });

  describe('addPetXP', () => {
    it('increases XP without levelling up when below threshold', async () => {
      const result = await addPetXP(50);
      expect(result.level).toBe(1);
      expect(result.xp).toBe(50);
    });

    it('levels up when XP reaches the threshold (100 for level 1)', async () => {
      const result = await addPetXP(100);
      expect(result.level).toBe(2);
      expect(result.xp).toBe(0);
      expect(result.xpToNextLevel).toBe(200); // level 2 threshold = 2*100
    });

    it('handles multi-level-up correctly', async () => {
      const result = await addPetXP(350);
      expect(result.level).toBe(3);
      expect(result.xp).toBe(50);
      expect(result.xpToNextLevel).toBe(300); // level 3 threshold = 3*100
    });

    it('persists the new XP across reads', async () => {
      await addPetXP(75);
      const state = await getPetState();
      expect(state.xp).toBe(75);
    });

    it('stacks across multiple calls', async () => {
      await addPetXP(40);
      await addPetXP(40);
      const state = await getPetState();
      expect(state.xp).toBe(80);
    });
  });

  describe('getPetMoodMultiplier', () => {
    it('returns the multiplier matching the pet mood', async () => {
      const mult = await getPetMoodMultiplier();
      expect(mult).toBe(PET_MOOD_MULTIPLIERS.happy);
    });
  });

  describe('feedPet', () => {
    it('restores hunger to 100 (within rounding)', async () => {
      const state = await feedPet();
      expect(state.hunger).toBe(100);
    });

    it('sets lastFedAt to a recent timestamp', async () => {
      const before = Date.now();
      const state = await feedPet();
      const after = Date.now();
      const fedAt = new Date(state.lastFedAt!).getTime();
      expect(fedAt).toBeGreaterThanOrEqual(before);
      expect(fedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('playWithPet', () => {
    it('drains energy by PLAY_ENERGY_COST', async () => {
      const before = await getPetState();
      await playWithPet();
      const after = await getPetState();
      expect(after.energy).toBe(Math.max(0, before.energy - PLAY_ENERGY_COST));
    });

    it('resets fun to 100 (via lastPlayedAt timestamp)', async () => {
      const state = await playWithPet();
      expect(state.fun).toBe(100);
    });

    it('energy does not go below 0', async () => {
      for (let i = 0; i < 5; i++) await playWithPet();
      const state = await getPetState();
      expect(state.energy).toBeGreaterThanOrEqual(0);
    });
  });

  describe('addPetEnergy', () => {
    it('increases energy by the given amount', async () => {
      await playWithPet();
      const before = await getPetState();
      await addPetEnergy(10);
      const after = await getPetState();
      expect(after.energy).toBe(Math.min(100, before.energy + 10));
    });

    it('caps energy at 100', async () => {
      await addPetEnergy(200);
      const state = await getPetState();
      expect(state.energy).toBe(100);
    });
  });

  describe('TRAIN_COST_POINTS', () => {
    it('is a positive number', () => {
      expect(TRAIN_COST_POINTS).toBeGreaterThan(0);
    });
  });
});
