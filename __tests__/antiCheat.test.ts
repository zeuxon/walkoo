import { checkLocationUpdate, resetCheatState, ANTI_CHEAT_CONFIG } from '@/services/antiCheat';
import { LatLng } from '@/types';

const routePolyline: LatLng[] = [
  { latitude: 47.4979, longitude: 19.0402 },
  { latitude: 47.498,  longitude: 19.041  },
  { latitude: 47.499,  longitude: 19.042  },
];

beforeEach(() => {
  resetCheatState();
  jest.restoreAllMocks();
});

describe('Anti-Cheat – Walk mode', () => {
  it('accepts a valid reading with good accuracy', () => {
    const result = checkLocationUpdate(
      { latitude: 47.4979, longitude: 19.0402 },
      10,
      routePolyline,
      'WALK',
    );
    expect(result.valid).toBe(true);
    expect(result.flags).toHaveLength(0);
  });

  it('hard-rejects low GPS accuracy on walk', () => {
    const result = checkLocationUpdate(
      { latitude: 47.4979, longitude: 19.0402 },
      100,
      routePolyline,
      'WALK',
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('low_gps_accuracy');
  });

  it('detects teleportation on walk', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValueOnce(now);

    checkLocationUpdate(
      { latitude: 47.4979, longitude: 19.0402 },
      10,
      routePolyline,
      'WALK',
    );

    jest.spyOn(Date, 'now').mockReturnValueOnce(now + 5000);

    const result = checkLocationUpdate(
      { latitude: 48.5, longitude: 20.0 }, // ~100 km away in 5 s
      10,
      routePolyline,
      'WALK',
    );
    expect(result.valid).toBe(false);
    expect(result.flags).toContain('teleport');
  });

  it('flags off-route positions', () => {
    const result = checkLocationUpdate(
      { latitude: 48.0, longitude: 20.0 }, // far from polyline
      10,
      routePolyline,
      'WALK',
    );
    expect(result.flags).toContain('off_route');
  });

  it('blocks after exceeding consecutive soft-fail limit', () => {
    const limit = ANTI_CHEAT_CONFIG.MAX_CONSECUTIVE_SOFT_FAILS;
    for (let i = 0; i <= limit; i++) {
      resetCheatState();
    }
    let lastResult;
    for (let i = 0; i <= limit; i++) {
      lastResult = checkLocationUpdate(
        { latitude: 48.0, longitude: 20.0 },
        10,
        routePolyline,
        'WALK',
      );
    }
    expect(lastResult!.valid).toBe(false);
  });
});

describe('Anti-Cheat – Transit mode', () => {
  it('accepts faster movement that would fail walk check', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValueOnce(now);

    checkLocationUpdate(
      { latitude: 47.4979, longitude: 19.0402 },
      10,
      routePolyline,
      'BUS',
    );

    jest.spyOn(Date, 'now').mockReturnValueOnce(now + 10000);

    // ~200 m in 10 s = 20 m/s = 72 km/h - valid for a bus
    const result = checkLocationUpdate(
      { latitude: 47.4997, longitude: 19.0402 },
      10,
      routePolyline,
      'BUS',
    );
    expect(result.valid).toBe(true);
    expect(result.flags).not.toContain('speed_violation');
  });

  it('soft-flags (but does not hard-reject) moderate GPS inaccuracy on transit', () => {
    const result = checkLocationUpdate(
      { latitude: 47.4979, longitude: 19.0402 },
      80,
      routePolyline,
      'TRAM',
    );
    expect(result.valid).toBe(true);
    expect(result.flags).not.toContain('low_accuracy');
  });

  it('still detects teleportation on transit', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValueOnce(now);

    checkLocationUpdate(
      { latitude: 47.4979, longitude: 19.0402 },
      10,
      routePolyline,
      'BUS',
    );

    jest.spyOn(Date, 'now').mockReturnValueOnce(now + 2000);

    // ~100 km in 2 s = 50 000 m/s - clearly a GPS glitch
    const result = checkLocationUpdate(
      { latitude: 48.5, longitude: 20.0 },
      10,
      routePolyline,
      'BUS',
    );
    expect(result.valid).toBe(false);
    expect(result.flags).toContain('teleport');
  });

  it('tolerates a single off-route reading (GPS noise in tunnel)', () => {
    const result = checkLocationUpdate(
      { latitude: 48.0, longitude: 20.0 },
      10,
      routePolyline,
      'BUS',
    );
    expect(result.valid).toBe(true);
    expect(result.flags).toContain('off_route');
  });
});

describe('Anti-Cheat – Config export', () => {
  it('exports walk and transit configs', () => {
    expect(ANTI_CHEAT_CONFIG.WALK_CONFIG.maxSpeedMps).toBe(4);
    expect(ANTI_CHEAT_CONFIG.TRANSIT_CONFIG.maxSpeedMps).toBe(42);
    expect(ANTI_CHEAT_CONFIG.WALK_CONFIG.maxAccuracyM).toBe(50);
    expect(ANTI_CHEAT_CONFIG.TRANSIT_CONFIG.maxAccuracyM).toBe(120);
    expect(ANTI_CHEAT_CONFIG.MAX_CONSECUTIVE_SOFT_FAILS).toBe(3);
  });
});
