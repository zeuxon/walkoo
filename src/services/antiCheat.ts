import { LatLng } from '@/types';
import { distanceBetween } from './locationService';


interface ModeConfig {
  maxSpeedMps: number;
  maxAccuracyM: number;
  maxOffRouteM: number;
  teleportSpeedMps: number;
}

const WALK_CONFIG: ModeConfig = {
  maxSpeedMps: 4,
  maxAccuracyM: 50,
  maxOffRouteM: 200,
  teleportSpeedMps: 12,
};

const TRANSIT_CONFIG: ModeConfig = {
  maxSpeedMps: 42,
  maxAccuracyM: 120,
  maxOffRouteM: 350,
  teleportSpeedMps: 150,
};

const MIN_UPDATE_INTERVAL_MS = 1000;

const MAX_CONSECUTIVE_SOFT_FAILS = 3;

export interface CheatCheckResult {
  valid: boolean;
  reason?: string;
  flags: string[];
}

let lastPosition: LatLng | null = null;
let lastTimestamp: number = 0;
let consecutiveSoftFails = 0;

export const resetCheatState = (): void => {
  lastPosition = null;
  lastTimestamp = 0;
  consecutiveSoftFails = 0;
};

const getConfig = (legMode: string): ModeConfig =>
  legMode.toUpperCase() === 'WALK' ? WALK_CONFIG : TRANSIT_CONFIG;

export const checkLocationUpdate = (
  position: LatLng,
  accuracy: number,
  routePolyline: LatLng[] | null | undefined,
  legMode: string,
): CheatCheckResult => {
  const flags: string[] = [];
  const now = Date.now();
  const cfg = getConfig(legMode);
  const isWalk = legMode.toUpperCase() === 'WALK';

  if (accuracy > cfg.maxAccuracyM) {
    if (isWalk) {
      return { valid: false, reason: 'low_gps_accuracy', flags: ['low_accuracy'] };
    }
    flags.push('low_accuracy');
  }

  if (lastTimestamp > 0 && now - lastTimestamp < MIN_UPDATE_INTERVAL_MS) {
    flags.push('too_frequent');
  }

  if (lastPosition && lastTimestamp > 0) {
    const dist = distanceBetween(lastPosition, position);
    const timeSec = (now - lastTimestamp) / 1000;

    if (timeSec > 0) {
      const speed = dist / timeSec;

      if (speed > cfg.teleportSpeedMps) {
        consecutiveSoftFails++;
        return { valid: false, reason: 'teleport_detected', flags: [...flags, 'teleport'] };
      }

      if (speed > cfg.maxSpeedMps) {
        flags.push('speed_violation');
      }
    }
  }

  if (Array.isArray(routePolyline) && routePolyline.length > 0) {
    let minDist = Infinity;
    for (const pt of routePolyline) {
      const d = distanceBetween(position, pt);
      if (d < minDist) minDist = d;
      if (d < cfg.maxOffRouteM) break;
    }
    if (minDist > cfg.maxOffRouteM) {
      flags.push('off_route');
    }
  }

  if (flags.length > 0) {
    consecutiveSoftFails++;
    lastPosition = position;
    lastTimestamp = now;

    if (consecutiveSoftFails <= MAX_CONSECUTIVE_SOFT_FAILS) {
      return { valid: true, flags };
    }

    return { valid: false, reason: flags.join(', '), flags };
  }

  consecutiveSoftFails = 0;
  lastPosition = position;
  lastTimestamp = now;

  return { valid: true, flags: [] };
};

export const ANTI_CHEAT_CONFIG = {
  WALK_CONFIG,
  TRANSIT_CONFIG,
  MIN_UPDATE_INTERVAL_MS,
  MAX_CONSECUTIVE_SOFT_FAILS,
};
