import { TripMode } from '@/types';
import { addPoints } from './homeService';
import { addLedgerEntry } from './ledgerService';
import { getTrips, updateTrip, getTripStats } from './tripService';
import { addPetXP, addPetEnergy, getPetMoodMultiplier, getPetState, getUnlockedPerks } from './petService';
import { recordTrip as recordTripOnChain } from '@/blockchain';
import { checkAndUnlock as checkBadges } from './badgeService';
import { updateProgress as updateChallengeProgress } from './challengeService';
import { getActiveSkinMultiplier } from './inventoryService';

const POINTS_PER_100M_WALK = 10;
const POINTS_PER_100M_TRANSIT = 5;
const COMPLETION_BONUS_BASE = 50;
const COMPLETION_BONUS_PER_KM = 10;
const PET_XP_PER_TRIP = 15;
const PET_XP_PER_COMPLETION = 25;
const PET_ENERGY_PER_100M = 2;
const PET_ENERGY_PER_COMPLETION = 15;

export const calculateProgressPoints = (
  distanceMeters: number,
  mode: TripMode,
): number => {
  const hundreds = Math.floor(distanceMeters / 100);
  const rate = mode === 'walk' ? POINTS_PER_100M_WALK : POINTS_PER_100M_TRANSIT;
  return hundreds * rate;
}

export const awardRouteProgress = async (
  tripId: string,
  newProgressMeters: number,
  previousProgressMeters: number,
  mode: TripMode,
): Promise<number> => {
  const deltaDistance = newProgressMeters - previousProgressMeters;
  if (deltaDistance <= 0) return 0;

  const newChunks = Math.floor(newProgressMeters / 100) - Math.floor(previousProgressMeters / 100);
  if (newChunks <= 0) return 0;

  const rate = mode === 'walk' ? POINTS_PER_100M_WALK : POINTS_PER_100M_TRANSIT;
  const rawPoints = newChunks * rate;

  const [skinMult, moodMult] = await Promise.all([getActiveSkinMultiplier(), getPetMoodMultiplier()]);
  const totalMult = skinMult * moodMult;
  const points = Math.round(rawPoints * totalMult);

  const multParts: string[] = [];
  if (skinMult !== 1) multParts.push(`×${skinMult.toFixed(2)} skin`);
  if (moodMult !== 1) multParts.push(`×${moodMult.toFixed(2)} pet`);

  await addLedgerEntry({
    deltaPoints: points,
    kind: 'route_progress',
    tripId,
    mode,
    description: `+${points} pts for ${Math.round(deltaDistance)}m ${mode}${multParts.length ? ` (${multParts.join(', ')})` : ''}`,
  });

  const existingTrip = await getExistingTrip(tripId);
  await updateTrip(tripId, {
    progressMeters: newProgressMeters,
    pointsAwarded: (existingTrip?.pointsAwarded ?? 0) + points,
    walkMeters: (existingTrip?.walkMeters ?? 0) + (mode === 'walk' ? deltaDistance : 0),
    transitMeters: (existingTrip?.transitMeters ?? 0) + (mode !== 'walk' ? deltaDistance : 0),
  });

  await addPoints(points);
  await addPetXP(PET_XP_PER_TRIP);
  await addPetEnergy(newChunks * PET_ENERGY_PER_100M);

  return points;
}


export const awardRemainingProgress = async (
  tripId: string,
  legs: Array<{ distanceMeters?: number; mode?: string }>,
  currentProgressMeters: number,
): Promise<number> => {
  let walkDelta = 0;
  let transitDelta = 0;
  let cumulative = 0;

  for (const leg of legs) {
    const legDist = typeof leg.distanceMeters === 'number' ? leg.distanceMeters : 0;
    const legEnd = cumulative + legDist;
    if (legEnd > currentProgressMeters) {
      const from = Math.max(currentProgressMeters, cumulative);
      const delta = legEnd - from;
      if (leg.mode === 'WALK') walkDelta += delta;
      else transitDelta += delta;
    }
    cumulative = legEnd;
  }

  const totalDelta = walkDelta + transitDelta;
  if (totalDelta <= 0) return 0;

  const rawPoints =
    calculateProgressPoints(walkDelta, 'walk') +
    calculateProgressPoints(transitDelta, 'transit');
  if (rawPoints <= 0) return 0;

  const [skinMult, moodMult] = await Promise.all([getActiveSkinMultiplier(), getPetMoodMultiplier()]);
  const points = Math.round(rawPoints * skinMult * moodMult);

  const mode: TripMode = walkDelta > 0 && transitDelta > 0 ? 'mixed'
    : walkDelta > 0 ? 'walk' : 'transit';

  await addLedgerEntry({ deltaPoints: points, kind: 'route_progress', tripId, mode });

  const existingTrip = await getExistingTrip(tripId);
  await updateTrip(tripId, {
    progressMeters: cumulative,
    pointsAwarded: (existingTrip?.pointsAwarded ?? 0) + points,
    walkMeters: (existingTrip?.walkMeters ?? 0) + walkDelta,
    transitMeters: (existingTrip?.transitMeters ?? 0) + transitDelta,
  });

  await addPoints(points);
  await addPetXP(PET_XP_PER_TRIP);
  await addPetEnergy(Math.floor(totalDelta / 100) * PET_ENERGY_PER_100M);

  return points;
};

export const calculateCompletionBonus = (routeLengthMeters: number): number => {
  const km = routeLengthMeters / 1000;
  return COMPLETION_BONUS_BASE + Math.floor(km) * COMPLETION_BONUS_PER_KM;
}

export const awardRouteCompletion = async (
  tripId: string,
  routeLengthMeters: number,
  mode: TripMode,
): Promise<{ bonus: number; totalEarned: number }> => {
  const [skinMult, moodMult, pet] = await Promise.all([
    getActiveSkinMultiplier(),
    getPetMoodMultiplier(),
    getPetState(),
  ]);
  const perks = getUnlockedPerks(pet.level);
  const hasTripBonus = perks.some((p) => p.requiredLevel === 3);

  const rawBonus = calculateCompletionBonus(routeLengthMeters) + (hasTripBonus ? 10 : 0);
  const totalMult = skinMult * moodMult;
  const bonus = Math.round(rawBonus * totalMult);

  const multParts: string[] = [];
  if (skinMult !== 1) multParts.push(`×${skinMult.toFixed(2)} skin`);
  if (moodMult !== 1) multParts.push(`×${moodMult.toFixed(2)} pet`);
  if (hasTripBonus) multParts.push('+10 pet perk');

  await addLedgerEntry({
    deltaPoints: bonus,
    kind: 'route_completion',
    tripId,
    mode,
    description: `Route completed! +${bonus} bonus pts${multParts.length ? ` (${multParts.join(', ')})` : ''}`,
  });

  await updateTrip(tripId, {
    status: 'completed',
    endedAt: new Date().toISOString(),
    progressMeters: routeLengthMeters,
    completionBonusAwarded: bonus,
  });

  await addPoints(bonus);
  await addPetXP(PET_XP_PER_COMPLETION);
  await addPetEnergy(PET_ENERGY_PER_COMPLETION);

  const tripPoints = ((await getExistingTrip(tripId))?.pointsAwarded ?? 0) + bonus;

  recordTripOnChain(tripId, routeLengthMeters, mode, tripPoints, bonus).then((txHash) => {
    if (txHash) updateTrip(tripId, { txHash });
  }).catch(() => {});

  const stats = await getTripStats();
  checkBadges().catch(() => {});
  updateChallengeProgress({
    completedTrips: stats.completedTrips,
    walkMeters: stats.walkDistanceMeters,
    transitMeters: stats.transitDistanceMeters,
    pointsEarned: stats.totalPointsFromTrips + stats.totalBonusPoints,
  }).catch(() => {});

  return { bonus, totalEarned: tripPoints };
}


const getExistingTrip = async (tripId: string) => {
  const trips = await getTrips();
  return trips.find((t) => t.id === tripId) ?? null;
}

export const REWARD_CONSTANTS = {
  POINTS_PER_100M_WALK,
  POINTS_PER_100M_TRANSIT,
  COMPLETION_BONUS_BASE,
  COMPLETION_BONUS_PER_KM,
  PET_XP_PER_TRIP,
  PET_XP_PER_COMPLETION,
};
