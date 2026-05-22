import { TripRecord, PointsLedgerEntry, DailyStats } from '@/types';

export const computeDailyStats = (
  trips: TripRecord[],
  ledger: PointsLedgerEntry[],
): DailyStats[] => {
  const map = new Map<string, DailyStats>();

  const getOrCreate = (dateKey: string): DailyStats => {
    if (!map.has(dateKey)) {
      map.set(dateKey, {
        dateKey,
        tripsStarted: 0,
        tripsCompleted: 0,
        walkMeters: 0,
        transitMeters: 0,
        pointsEarned: 0,
        pointsSpent: 0,
        activeMinutes: 0,
      });
    }
    return map.get(dateKey)!;
  };

  for (const trip of trips) {
    const dk = trip.startedAt.slice(0, 10);
    const stats = getOrCreate(dk);
    stats.tripsStarted++;
    if (trip.status === 'completed') stats.tripsCompleted++;
    if (trip.mode === 'walk') stats.walkMeters += trip.progressMeters;
    else stats.transitMeters += trip.progressMeters;
    if (trip.startedAt && trip.endedAt) {
      const dur = (new Date(trip.endedAt).getTime() - new Date(trip.startedAt).getTime()) / 60000;
      stats.activeMinutes += Math.max(0, dur);
    }
  }

  for (const entry of ledger) {
    const dk = entry.createdAt.slice(0, 10);
    const stats = getOrCreate(dk);
    if (entry.deltaPoints >= 0) stats.pointsEarned += entry.deltaPoints;
    else stats.pointsSpent += Math.abs(entry.deltaPoints);
  }

  return Array.from(map.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export const computeStreakFromDays = (dateKeys: string[]): number => {
  if (dateKeys.length === 0) return 0;
  const sorted = [...dateKeys].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  if (sorted[0] !== today) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00Z');
    const curr = new Date(sorted[i] + 'T00:00:00Z');
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export const completionRateTrend = (
  dailyStats: DailyStats[],
  windowDays: number = 7,
): { dateKey: string; rate: number }[] => {
  const result: { dateKey: string; rate: number }[] = [];
  for (let i = 0; i < dailyStats.length; i++) {
    const windowStart = Math.max(0, i - windowDays + 1);
    const window = dailyStats.slice(windowStart, i + 1);
    const totalStarted = window.reduce((s, d) => s + d.tripsStarted, 0);
    const totalCompleted = window.reduce((s, d) => s + d.tripsCompleted, 0);
    result.push({
      dateKey: dailyStats[i].dateKey,
      rate: totalStarted > 0 ? totalCompleted / totalStarted : 0,
    });
  }
  return result;
}
