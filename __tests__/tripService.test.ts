import {
  getTrips,
  createTrip,
  updateTrip,
  getActiveTrip,
  getRecentTrips,
  getTripStats,
  clearTrips,
} from '@/services/tripService';
import { LatLng } from '@/types';

const origin: LatLng = { latitude: 47.4979, longitude: 19.0402 };
const destination: LatLng = { latitude: 47.5100, longitude: 19.0600 };

const baseParams = {
  mode: 'walk' as const,
  originLabel: 'Home',
  destinationLabel: 'Work',
  originCoords: origin,
  destinationCoords: destination,
  routeLengthMeters: 2000,
};

beforeEach(async () => {
  await clearTrips();
});

describe('tripService', () => {
  describe('getTrips', () => {
    it('returns empty array on fresh state', async () => {
      const trips = await getTrips();
      expect(trips).toHaveLength(0);
    });
  });

  describe('createTrip', () => {
    it('creates a trip with in_progress status', async () => {
      const trip = await createTrip(baseParams);
      expect(trip.status).toBe('in_progress');
    });

    it('initialises progress and points to zero', async () => {
      const trip = await createTrip(baseParams);
      expect(trip.progressMeters).toBe(0);
      expect(trip.pointsAwarded).toBe(0);
      expect(trip.completionBonusAwarded).toBe(0);
    });

    it('stores the mode and labels from params', async () => {
      const trip = await createTrip(baseParams);
      expect(trip.mode).toBe('walk');
      expect(trip.originLabel).toBe('Home');
      expect(trip.destinationLabel).toBe('Work');
    });

    it('assigns a unique id and ISO startedAt timestamp', async () => {
      const trip = await createTrip(baseParams);
      expect(trip.id).toBeDefined();
      expect(trip.id.length).toBeGreaterThan(0);
      expect(new Date(trip.startedAt).getTime()).not.toBeNaN();
      expect(trip.endedAt).toBeNull();
    });

    it('persists the trip so getTrips returns it', async () => {
      await createTrip(baseParams);
      const trips = await getTrips();
      expect(trips).toHaveLength(1);
    });

    it('multiple trips are all stored', async () => {
      await createTrip(baseParams);
      await createTrip({ ...baseParams, mode: 'transit' });
      const trips = await getTrips();
      expect(trips).toHaveLength(2);
    });
  });

  describe('getActiveTrip', () => {
    it('returns null when no trips exist', async () => {
      const active = await getActiveTrip();
      expect(active).toBeNull();
    });

    it('returns the in_progress trip', async () => {
      await createTrip(baseParams);
      const active = await getActiveTrip();
      expect(active).not.toBeNull();
      expect(active!.status).toBe('in_progress');
    });

    it('returns null after the trip is completed', async () => {
      const trip = await createTrip(baseParams);
      await updateTrip(trip.id, { status: 'completed', endedAt: new Date().toISOString() });
      const active = await getActiveTrip();
      expect(active).toBeNull();
    });
  });

  describe('updateTrip', () => {
    it('patches the progressMeters field', async () => {
      const trip = await createTrip(baseParams);
      await updateTrip(trip.id, { progressMeters: 800 });
      const trips = await getTrips();
      expect(trips.find((t) => t.id === trip.id)!.progressMeters).toBe(800);
    });

    it('patches multiple fields in one call', async () => {
      const trip = await createTrip(baseParams);
      await updateTrip(trip.id, { progressMeters: 500, pointsAwarded: 40 });
      const trips = await getTrips();
      const updated = trips.find((t) => t.id === trip.id)!;
      expect(updated.progressMeters).toBe(500);
      expect(updated.pointsAwarded).toBe(40);
    });

    it('does not affect unpatched fields', async () => {
      const trip = await createTrip(baseParams);
      await updateTrip(trip.id, { progressMeters: 200 });
      const trips = await getTrips();
      const updated = trips.find((t) => t.id === trip.id)!;
      expect(updated.mode).toBe('walk');
      expect(updated.originLabel).toBe('Home');
    });

    it('returns null for unknown tripId', async () => {
      const result = await updateTrip('nonexistent-id', { progressMeters: 100 });
      expect(result).toBeNull();
    });
  });

  describe('getRecentTrips', () => {
    it('returns at most the requested number of trips', async () => {
      for (let i = 0; i < 5; i++) {
        await createTrip({ ...baseParams, originLabel: `Origin ${i}` });
      }
      const recent = await getRecentTrips(3);
      expect(recent).toHaveLength(3);
    });

    it('returns all trips when limit exceeds count', async () => {
      await createTrip(baseParams);
      await createTrip(baseParams);
      const recent = await getRecentTrips(50);
      expect(recent).toHaveLength(2);
    });
  });

  describe('getTripStats', () => {
    it('returns all zeros on fresh state', async () => {
      const stats = await getTripStats();
      expect(stats.totalTrips).toBe(0);
      expect(stats.completedTrips).toBe(0);
      expect(stats.walkDistanceMeters).toBe(0);
      expect(stats.transitDistanceMeters).toBe(0);
    });

    it('counts total and completed trips correctly', async () => {
      const t1 = await createTrip(baseParams);
      await updateTrip(t1.id, { status: 'completed' });
      const t2 = await createTrip(baseParams);
      void t2;

      const stats = await getTripStats();
      expect(stats.totalTrips).toBe(2);
      expect(stats.completedTrips).toBe(1);
    });

    it('sums walk distance from walk-mode trips only', async () => {
      const t1 = await createTrip({ ...baseParams, mode: 'walk' });
      await updateTrip(t1.id, { progressMeters: 1500, walkMeters: 1500 });
      const t2 = await createTrip({ ...baseParams, mode: 'transit' });
      await updateTrip(t2.id, { progressMeters: 3000, transitMeters: 3000 });

      const stats = await getTripStats();
      expect(stats.walkDistanceMeters).toBe(1500);
    });

    it('sums transit+mixed distance into transitDistanceMeters', async () => {
      const t1 = await createTrip({ ...baseParams, mode: 'transit' });
      await updateTrip(t1.id, { progressMeters: 4000, transitMeters: 4000 });
      const t2 = await createTrip({ ...baseParams, mode: 'mixed' });
      await updateTrip(t2.id, { progressMeters: 2000, transitMeters: 2000 });

      const stats = await getTripStats();
      expect(stats.transitDistanceMeters).toBe(6000);
    });

    it('sums points and bonuses across trips', async () => {
      const t1 = await createTrip(baseParams);
      await updateTrip(t1.id, { pointsAwarded: 100, completionBonusAwarded: 60 });
      const t2 = await createTrip(baseParams);
      await updateTrip(t2.id, { pointsAwarded: 80, completionBonusAwarded: 50 });

      const stats = await getTripStats();
      expect(stats.totalPointsFromTrips).toBe(180);
      expect(stats.totalBonusPoints).toBe(110);
    });
  });

  describe('clearTrips', () => {
    it('empties all trips', async () => {
      await createTrip(baseParams);
      await createTrip(baseParams);
      await clearTrips();
      const trips = await getTrips();
      expect(trips).toHaveLength(0);
    });
  });
});
