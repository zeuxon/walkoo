import * as Location from 'expo-location';
import { LatLng } from '@/types';

let watchSubscription: Location.LocationSubscription | null = null;

export const requestPermissions = async (): Promise<boolean> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export const getCurrentLocation = async (): Promise<LatLng | null> => {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return null;
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  } catch (e) {
    console.warn('[Location] Failed to get current location:', e);
    return null;
  }
}

export const startWatching = async (
  callback: (location: LatLng, accuracy: number) => void,
): Promise<void> => {
  await stopWatching();
  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  watchSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 5,
      timeInterval: 1000,
    },
    (loc) => {
      callback(
        { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
        loc.coords.accuracy ?? 999,
      );
    },
  );
}

export const stopWatching = async (): Promise<void> => {
  if (watchSubscription) {
    watchSubscription.remove();
    watchSubscription = null;
  }
}

export const distanceBetween = (a: LatLng, b: LatLng): number => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLon = Math.sin(dLon / 2);
  const aCalc =
    sinHalfDLat * sinHalfDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfDLon * sinHalfDLon;
  const c = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
  return R * c;
}

export const findClosestPointOnRoute = (
  position: LatLng,
  route: LatLng[],
): { index: number; distance: number; progressMeters: number } => {
  let minDist = Infinity;
  let closestIdx = 0;

  for (let i = 0; i < route.length; i++) {
    const d = distanceBetween(position, route[i]);
    if (d < minDist) {
      minDist = d;
      closestIdx = i;
    }
  }

  let progressMeters = 0;
  for (let i = 1; i <= closestIdx; i++) {
    progressMeters += distanceBetween(route[i - 1], route[i]);
  }

  return { index: closestIdx, distance: minDist, progressMeters };
}
