import {
  getChallenges,
  getCurrentWeekChallenges,
  updateProgress,
  resetChallenges,
} from '@/services/challengeService';
import { resetHomeState, getHomeState } from '@/services/homeService';
import { clearLedger } from '@/services/ledgerService';

beforeEach(async () => {
  await resetChallenges();
  await resetHomeState();
  await clearLedger();
});

describe('challengeService', () => {
  describe('getCurrentWeekChallenges', () => {
    it('generates exactly 3 challenges for the current week', async () => {
      const challenges = await getCurrentWeekChallenges();
      expect(challenges).toHaveLength(3);
    });

    it('all generated challenges start as active', async () => {
      const challenges = await getCurrentWeekChallenges();
      expect(challenges.every((c) => c.status === 'active')).toBe(true);
    });

    it('all challenges start at zero progress', async () => {
      const challenges = await getCurrentWeekChallenges();
      expect(challenges.every((c) => c.progress === 0)).toBe(true);
    });

    it('challenges have positive targets and reward points', async () => {
      const challenges = await getCurrentWeekChallenges();
      for (const c of challenges) {
        expect(c.target).toBeGreaterThan(0);
        expect(c.rewardPoints).toBeGreaterThan(0);
      }
    });

    it('returns the same challenges on repeated calls (deterministic)', async () => {
      const first = await getCurrentWeekChallenges();
      await resetChallenges();
      const second = await getCurrentWeekChallenges();
      const firstNames = first.map((c) => c.name).sort();
      const secondNames = second.map((c) => c.name).sort();
      expect(firstNames).toEqual(secondNames);
    });
  });

  describe('getChallenges', () => {
    it('includes current week challenges', async () => {
      await getCurrentWeekChallenges();
      const all = await getChallenges();
      expect(all.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('updateProgress', () => {
    it('returns empty array when no challenge is completed', async () => {
      await getCurrentWeekChallenges();
      const result = await updateProgress({
        completedTrips: 0,
        walkMeters: 0,
        transitMeters: 0,
        pointsEarned: 0,
      });
      expect(result).toHaveLength(0);
    });

    it('completes challenges when all metrics are maxed out', async () => {
      await getCurrentWeekChallenges();
      const result = await updateProgress({
        completedTrips: 999,
        walkMeters: 999999,
        transitMeters: 999999,
        pointsEarned: 999999,
      });
      expect(result.length).toBeGreaterThan(0);
    });

    it('marks completed challenges with status "completed"', async () => {
      await getCurrentWeekChallenges();
      await updateProgress({
        completedTrips: 999,
        walkMeters: 999999,
        transitMeters: 999999,
        pointsEarned: 999999,
      });
      const challenges = await getCurrentWeekChallenges();
      const completed = challenges.filter((c) => c.status === 'completed');
      expect(completed.length).toBeGreaterThan(0);
    });

    it('sets completedAt timestamp on completed challenges', async () => {
      await getCurrentWeekChallenges();
      await updateProgress({
        completedTrips: 999,
        walkMeters: 999999,
        transitMeters: 999999,
        pointsEarned: 999999,
      });
      const challenges = await getCurrentWeekChallenges();
      const completed = challenges.filter((c) => c.status === 'completed');
      for (const c of completed) {
        expect(c.completedAt).not.toBeNull();
        expect(new Date(c.completedAt!).getTime()).not.toBeNaN();
      }
    });

    it('awards points to the user when a challenge completes', async () => {
      await getCurrentWeekChallenges();
      const before = await getHomeState();
      await updateProgress({
        completedTrips: 999,
        walkMeters: 999999,
        transitMeters: 999999,
        pointsEarned: 999999,
      });
      const after = await getHomeState();
      expect(after.totalPoints).toBeGreaterThan(before.totalPoints);
    });

    it('does not re-complete an already completed challenge', async () => {
      await getCurrentWeekChallenges();
      await updateProgress({
        completedTrips: 999,
        walkMeters: 999999,
        transitMeters: 999999,
        pointsEarned: 999999,
      });

      const second = await updateProgress({
        completedTrips: 999,
        walkMeters: 999999,
        transitMeters: 999999,
        pointsEarned: 999999,
      });
      expect(second).toHaveLength(0);
    });

    it('caps progress at the target value', async () => {
      await getCurrentWeekChallenges();
      await updateProgress({
        completedTrips: 999,
        walkMeters: 999999,
        transitMeters: 999999,
        pointsEarned: 999999,
      });
      const challenges = await getCurrentWeekChallenges();
      for (const c of challenges) {
        expect(c.progress).toBeLessThanOrEqual(c.target);
      }
    });
  });

  describe('resetChallenges', () => {
    it('clears all challenge data', async () => {
      await getCurrentWeekChallenges();
      await resetChallenges();
      const challenges = await getCurrentWeekChallenges();
      expect(challenges.every((c) => c.status === 'active')).toBe(true);
      expect(challenges.every((c) => c.progress === 0)).toBe(true);
    });
  });
});
