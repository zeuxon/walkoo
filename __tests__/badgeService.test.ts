import {
  getBadges,
  checkAndUnlock,
  getUnlockedCount,
  getTotalCount,
  resetBadges,
} from '@/services/badgeService';
import { addPoints, resetHomeState } from '@/services/homeService';
import { createTrip, updateTrip, clearTrips } from '@/services/tripService';
import { resetPetState } from '@/services/petService';

const walkTripParams = {
  mode: 'walk' as const,
  originLabel: 'A',
  destinationLabel: 'B',
  originCoords: { latitude: 47.0, longitude: 19.0 },
  destinationCoords: { latitude: 47.1, longitude: 19.1 },
  routeLengthMeters: 2000,
};

beforeEach(async () => {
  await resetBadges();
  await clearTrips();
  await resetHomeState();
  await resetPetState();
});

describe('badgeService', () => {
  describe('getBadges', () => {
    it('returns all badges locked on fresh install', async () => {
      const badges = await getBadges();
      expect(badges.length).toBeGreaterThan(0);
      expect(badges.every((b) => b.unlockedAt === null)).toBe(true);
    });

    it('returns the expected total badge count', () => {
      expect(getTotalCount()).toBeGreaterThan(0);
    });
  });

  describe('getUnlockedCount', () => {
    it('returns 0 when no badges are unlocked', async () => {
      const count = await getUnlockedCount();
      expect(count).toBe(0);
    });
  });

  describe('checkAndUnlock', () => {
    it('returns empty array when no conditions are met', async () => {
      const newly = await checkAndUnlock();
      expect(newly).toHaveLength(0);
    });

    it('unlocks "First Steps" after completing the first trip', async () => {
      const trip = await createTrip(walkTripParams);
      await updateTrip(trip.id, { status: 'completed' });

      const newly = await checkAndUnlock();
      expect(newly).toContain('First Steps');
    });

    it('unlocks "Penny Saver" after earning 100 points', async () => {
      await addPoints(100);
      const newly = await checkAndUnlock();
      expect(newly).toContain('Penny Saver');
    });

    it('unlocks "Short Walk" after walking 1 km', async () => {
      const trip = await createTrip({ ...walkTripParams, mode: 'walk' });
      await updateTrip(trip.id, { progressMeters: 1000, walkMeters: 1000, status: 'completed' });

      const newly = await checkAndUnlock();
      expect(newly).toContain('Short Walk');
    });

    it('unlocks multiple badges at once when several conditions are met', async () => {
      const trip = await createTrip(walkTripParams);
      await updateTrip(trip.id, { progressMeters: 1000, walkMeters: 1000, status: 'completed' });
      await addPoints(100);

      const newly = await checkAndUnlock();
      expect(newly).toContain('First Steps');
      expect(newly).toContain('Penny Saver');
      expect(newly).toContain('Short Walk');
    });

    it('does not re-unlock an already-unlocked badge', async () => {
      const trip = await createTrip(walkTripParams);
      await updateTrip(trip.id, { status: 'completed' });

      const first = await checkAndUnlock();
      expect(first).toContain('First Steps');

      const second = await checkAndUnlock();
      expect(second).not.toContain('First Steps');
    });

    it('increments getUnlockedCount after a badge unlocks', async () => {
      await addPoints(100);
      await checkAndUnlock();
      const count = await getUnlockedCount();
      expect(count).toBeGreaterThan(0);
    });

    it('persists the unlocked state in getBadges', async () => {
      await addPoints(100);
      await checkAndUnlock();

      const badges = await getBadges();
      const penny = badges.find((b) => b.name === 'Penny Saver');
      expect(penny!.unlockedAt).not.toBeNull();
    });

    it('unlocks "Point Collector" at 500 points', async () => {
      await addPoints(500);
      const newly = await checkAndUnlock();
      expect(newly).toContain('Point Collector');
    });
  });

  describe('resetBadges', () => {
    it('locks all previously unlocked badges', async () => {
      await addPoints(100);
      await checkAndUnlock();
      await resetBadges();

      const count = await getUnlockedCount();
      expect(count).toBe(0);
    });
  });
});
