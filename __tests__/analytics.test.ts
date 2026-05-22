import { computeDailyStats, computeStreakFromDays, completionRateTrend } from '@/utils/analytics';
import { TripRecord, PointsLedgerEntry } from '@/types';

function makeTripRecord(overrides: Partial<TripRecord> = {}): TripRecord {
  return {
    id: 'trip-1',
    startedAt: '2025-03-10T10:00:00Z',
    endedAt: '2025-03-10T10:30:00Z',
    mode: 'walk',
    status: 'completed',
    originLabel: 'A',
    destinationLabel: 'B',
    originCoords: { latitude: 0, longitude: 0 },
    destinationCoords: { latitude: 0, longitude: 0 },
    routeLengthMeters: 1000,
    progressMeters: 1000,
    walkMeters: 1000,
    transitMeters: 0,
    pointsAwarded: 100,
    completionBonusAwarded: 60,
    txHash: null,
    ...overrides,
  };
}

function makeLedgerEntry(overrides: Partial<PointsLedgerEntry> = {}): PointsLedgerEntry {
  return {
    id: 'ledger-1',
    createdAt: '2025-03-10T10:00:00Z',
    deltaPoints: 50,
    kind: 'route_progress',
    ...overrides,
  };
}

describe('computeDailyStats', () => {
  it('groups trips by date', () => {
    const trips = [
      makeTripRecord({ id: 't1', startedAt: '2025-03-10T08:00:00Z' }),
      makeTripRecord({ id: 't2', startedAt: '2025-03-10T14:00:00Z' }),
      makeTripRecord({ id: 't3', startedAt: '2025-03-11T09:00:00Z', status: 'stopped' }),
    ];
    const stats = computeDailyStats(trips, []);

    expect(stats).toHaveLength(2);
    expect(stats[0].dateKey).toBe('2025-03-10');
    expect(stats[0].tripsStarted).toBe(2);
    expect(stats[0].tripsCompleted).toBe(2);
    expect(stats[1].dateKey).toBe('2025-03-11');
    expect(stats[1].tripsStarted).toBe(1);
    expect(stats[1].tripsCompleted).toBe(0);
  });

  it('separates walk and transit meters', () => {
    const trips = [
      makeTripRecord({ id: 't1', mode: 'walk', progressMeters: 500 }),
      makeTripRecord({ id: 't2', mode: 'transit', progressMeters: 2000 }),
    ];
    const stats = computeDailyStats(trips, []);
    expect(stats[0].walkMeters).toBe(500);
    expect(stats[0].transitMeters).toBe(2000);
  });

  it('accounts for ledger entries', () => {
    const ledger = [
      makeLedgerEntry({ deltaPoints: 100 }),
      makeLedgerEntry({ id: 'l2', deltaPoints: -30 }),
    ];
    const stats = computeDailyStats([], ledger);
    expect(stats[0].pointsEarned).toBe(100);
    expect(stats[0].pointsSpent).toBe(30);
  });
});

describe('computeStreakFromDays', () => {
  it('returns 0 for empty input', () => {
    expect(computeStreakFromDays([])).toBe(0);
  });

  it('returns 0 if last active day is not today', () => {
    expect(computeStreakFromDays(['2020-01-01'])).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const dayBefore = new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10);
    expect(computeStreakFromDays([today])).toBe(1);
    expect(computeStreakFromDays([dayBefore, yesterday, today])).toBe(3);
  });

  it('breaks streak on gap', () => {
    const today = new Date().toISOString().slice(0, 10);
    const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10);
    expect(computeStreakFromDays([twoDaysAgo, today])).toBe(1);
  });
});

describe('completionRateTrend', () => {
  it('computes rolling window', () => {
    const daily = [
      { dateKey: '2025-03-01', tripsStarted: 2, tripsCompleted: 2, walkMeters: 0, transitMeters: 0, pointsEarned: 0, pointsSpent: 0, activeMinutes: 0 },
      { dateKey: '2025-03-02', tripsStarted: 4, tripsCompleted: 1, walkMeters: 0, transitMeters: 0, pointsEarned: 0, pointsSpent: 0, activeMinutes: 0 },
    ];
    const trend = completionRateTrend(daily, 7);
    expect(trend[0].rate).toBe(1.0);
    expect(trend[1].rate).toBe(0.5);
  });
});
