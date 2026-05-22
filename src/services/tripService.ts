import { TripRecord, TripMode, LatLng } from '@/types';
import { loadJSON, saveJSON, StorageKeys } from './storage';
import { eventBus, Events } from './eventBus';
import { generateId } from '../utils/id';

let cached: TripRecord[] | null = null;

export const getTrips = (): Promise<TripRecord[]> => {
  if (cached) return Promise.resolve(cached);
  return loadJSON<TripRecord[]>(StorageKeys.TRIPS, []);
};

export const createTrip = (params: {
  mode: TripMode;
  originLabel: string;
  destinationLabel: string;
  originCoords: LatLng;
  destinationCoords: LatLng;
  routeLengthMeters: number;
}): Promise<TripRecord> => {
  return getTrips().then(async (trips) => {
    const trip: TripRecord = {
      id: generateId(),
      startedAt: new Date().toISOString(),
      endedAt: null,
      status: 'in_progress',
      progressMeters: 0,
      walkMeters: 0,
      transitMeters: 0,
      pointsAwarded: 0,
      completionBonusAwarded: 0,
      txHash: null,
      ...params,
    };
    trips.unshift(trip);
    await saveJSON(StorageKeys.TRIPS, trips);
    cached = trips;
    eventBus.emit(Events.TRIP_SAVED, trip);
    return trip;
  });
};

export const updateTrip = (
  tripId: string,
  patch: Partial<Pick<TripRecord, 'progressMeters' | 'walkMeters' | 'transitMeters' | 'pointsAwarded' | 'completionBonusAwarded' | 'status' | 'endedAt' | 'mode' | 'txHash'>>,
): Promise<TripRecord | null> => {
  return getTrips().then(async (trips) => {
    const idx = trips.findIndex((t) => t.id === tripId);
    if (idx === -1) return null;
    trips[idx] = { ...trips[idx], ...patch };
    await saveJSON(StorageKeys.TRIPS, trips);
    cached = trips;
    eventBus.emit(Events.TRIP_SAVED, trips[idx]);
    return trips[idx];
  });
}

export const getActiveTrip = (): Promise<TripRecord | null> => {
  return getTrips().then((trips) => trips.find((t) => t.status === 'in_progress') ?? null);
};

export const getRecentTrips = (limit: number = 20): Promise<TripRecord[]> => {
  return getTrips().then((trips) => trips.slice(0, limit));
}

export const getTripStats = (): Promise<{
  totalTrips: number;
  completedTrips: number;
  totalDistanceMeters: number;
  walkDistanceMeters: number;
  transitDistanceMeters: number;
  totalPointsFromTrips: number;
  totalBonusPoints: number;
}> => {
  return getTrips().then((trips) => ({
    totalTrips: trips.length,
    completedTrips: trips.filter((t) => t.status === 'completed').length,
    totalDistanceMeters: trips.reduce((s, t) => s + t.progressMeters, 0),
    walkDistanceMeters: trips.reduce((s, t) =>
      s + (t.walkMeters ?? (t.mode === 'walk' ? t.progressMeters : 0)), 0),
    transitDistanceMeters: trips.reduce((s, t) =>
      s + (t.transitMeters ?? (t.mode === 'transit' || t.mode === 'mixed' ? t.progressMeters : 0)), 0),
    totalPointsFromTrips: trips.reduce((s, t) => s + t.pointsAwarded, 0),
    totalBonusPoints: trips.reduce((s, t) => s + t.completionBonusAwarded, 0),
  }));
};

export const clearTrips = (): Promise<void> => {
  return saveJSON(StorageKeys.TRIPS, []).then(() => {
    cached = [];
    eventBus.emit(Events.TRIP_SAVED, null);
  });
}
