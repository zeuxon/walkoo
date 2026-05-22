import { getHomeState, addPoints, spendPoints, resetHomeState } from '@/services/homeService';

beforeEach(async () => {
  await resetHomeState();
});

describe('homeService', () => {
  describe('getHomeState', () => {
    it('returns zero points on fresh state', async () => {
      const state = await getHomeState();
      expect(state.totalPoints).toBe(0);
      expect(state.todayPoints).toBe(0);
    });

    it('returns zero streak on fresh state', async () => {
      const state = await getHomeState();
      expect(state.streak).toBe(0);
    });
  });

  describe('addPoints', () => {
    it('increases totalPoints by the given delta', async () => {
      await addPoints(100);
      const state = await getHomeState();
      expect(state.totalPoints).toBe(100);
    });

    it('accumulates across multiple calls', async () => {
      await addPoints(100);
      await addPoints(50);
      await addPoints(25);
      const state = await getHomeState();
      expect(state.totalPoints).toBe(175);
    });

    it('tracks todayPoints', async () => {
      await addPoints(80);
      const state = await getHomeState();
      expect(state.todayPoints).toBe(80);
    });

    it('todayPoints accumulates within the same day', async () => {
      await addPoints(40);
      await addPoints(60);
      const state = await getHomeState();
      expect(state.todayPoints).toBe(100);
    });

    it('returns the updated state', async () => {
      const updated = await addPoints(200);
      expect(updated.totalPoints).toBe(200);
    });
  });

  describe('spendPoints', () => {
    it('reduces totalPoints by the given amount', async () => {
      await addPoints(200);
      await spendPoints(50);
      const state = await getHomeState();
      expect(state.totalPoints).toBe(150);
    });

    it('returns null when user has insufficient points', async () => {
      await addPoints(30);
      const result = await spendPoints(100);
      expect(result).toBeNull();
    });

    it('does not modify state when insufficient', async () => {
      await addPoints(30);
      await spendPoints(100);
      const state = await getHomeState();
      expect(state.totalPoints).toBe(30);
    });

    it('returns null when balance is exactly zero', async () => {
      const result = await spendPoints(1);
      expect(result).toBeNull();
    });

    it('allows spending the exact balance', async () => {
      await addPoints(100);
      const result = await spendPoints(100);
      expect(result).not.toBeNull();
      expect(result!.totalPoints).toBe(0);
    });

    it('multiple spends accumulate correctly', async () => {
      await addPoints(300);
      await spendPoints(100);
      await spendPoints(50);
      const state = await getHomeState();
      expect(state.totalPoints).toBe(150);
    });
  });

  describe('resetHomeState', () => {
    it('restores zero totalPoints after accumulation', async () => {
      await addPoints(500);
      await resetHomeState();
      const state = await getHomeState();
      expect(state.totalPoints).toBe(0);
    });

    it('restores zero todayPoints', async () => {
      await addPoints(200);
      await resetHomeState();
      const state = await getHomeState();
      expect(state.todayPoints).toBe(0);
    });
  });
});
