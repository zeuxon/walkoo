import { distanceBetween, findClosestPointOnRoute } from '@/services/locationService';
import { LatLng } from '@/types';

describe('Location Utils', () => {
  describe('distanceBetween', () => {
    it('returns 0 for same point', () => {
      const p = { latitude: 47.5, longitude: 19.0 };
      expect(distanceBetween(p, p)).toBe(0);
    });

    it('returns approx correct distance for known points', () => {
      // Budapest to Szeged is ~170 km
      const budapest = { latitude: 47.4979, longitude: 19.0402 };
      const szeged = { latitude: 46.2530, longitude: 20.1414 };
      const dist = distanceBetween(budapest, szeged);
      expect(dist).toBeGreaterThan(150000);
      expect(dist).toBeLessThan(190000);
    });

    it('returns small distance for nearby points', () => {
      const a = { latitude: 47.4979, longitude: 19.0402 };
      const b = { latitude: 47.4980, longitude: 19.0403 };
      const dist = distanceBetween(a, b);
      expect(dist).toBeGreaterThan(5);
      expect(dist).toBeLessThan(50);
    });
  });

  describe('findClosestPointOnRoute', () => {
    const route: LatLng[] = [
      { latitude: 47.497, longitude: 19.040 },
      { latitude: 47.498, longitude: 19.041 },
      { latitude: 47.499, longitude: 19.042 },
      { latitude: 47.500, longitude: 19.043 },
    ];

    it('finds closest point index', () => {
      const pos = { latitude: 47.4981, longitude: 19.0411 };
      const result = findClosestPointOnRoute(pos, route);
      expect(result.index).toBe(1);
    });

    it('returns progress meters along route', () => {
      const pos = { latitude: 47.500, longitude: 19.043 };
      const result = findClosestPointOnRoute(pos, route);
      expect(result.index).toBe(3);
      expect(result.progressMeters).toBeGreaterThan(0);
    });

    it('returns 0 progress for first point', () => {
      const pos = { latitude: 47.497, longitude: 19.040 };
      const result = findClosestPointOnRoute(pos, route);
      expect(result.index).toBe(0);
      expect(result.progressMeters).toBe(0);
    });
  });
});
