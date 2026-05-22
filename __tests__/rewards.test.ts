import { calculateProgressPoints, calculateCompletionBonus, REWARD_CONSTANTS } from '@/services/rewardService';

describe('Reward Calculations', () => {
  describe('calculateProgressPoints', () => {
    it('awards 10 pts per 100m for walking', () => {
      expect(calculateProgressPoints(100, 'walk')).toBe(10);
      expect(calculateProgressPoints(250, 'walk')).toBe(20); // floor(250/100) = 2
      expect(calculateProgressPoints(1000, 'walk')).toBe(100);
    });

    it('awards 5 pts per 100m for transit', () => {
      expect(calculateProgressPoints(100, 'transit')).toBe(5);
      expect(calculateProgressPoints(500, 'transit')).toBe(25);
      expect(calculateProgressPoints(1000, 'transit')).toBe(50);
    });

    it('awards 0 for distances under 100m', () => {
      expect(calculateProgressPoints(50, 'walk')).toBe(0);
      expect(calculateProgressPoints(99, 'transit')).toBe(0);
    });

    it('awards 5 pts per 100m for mixed mode (same as transit)', () => {
      expect(calculateProgressPoints(300, 'mixed')).toBe(15);
    });
  });

  describe('calculateCompletionBonus', () => {
    it('awards base bonus for short routes', () => {
      expect(calculateCompletionBonus(500)).toBe(50); // base + 0 km bonus
    });

    it('awards base + per-km bonus', () => {
      expect(calculateCompletionBonus(1000)).toBe(60); // 50 + 1*10
      expect(calculateCompletionBonus(2500)).toBe(70); // 50 + 2*10
      expect(calculateCompletionBonus(5000)).toBe(100); // 50 + 5*10
    });

    it('scales linearly with distance', () => {
      const bonus10k = calculateCompletionBonus(10000);
      const bonus5k = calculateCompletionBonus(5000);
      expect(bonus10k - bonus5k).toBe(50); // 5 extra km * 10
    });
  });

  describe('Reward Constants', () => {
    it('has expected values', () => {
      expect(REWARD_CONSTANTS.POINTS_PER_100M_WALK).toBe(10);
      expect(REWARD_CONSTANTS.POINTS_PER_100M_TRANSIT).toBe(5);
      expect(REWARD_CONSTANTS.COMPLETION_BONUS_BASE).toBe(50);
      expect(REWARD_CONSTANTS.COMPLETION_BONUS_PER_KM).toBe(10);
    });
  });
});
