import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, RPC_URL, EXPLORER_URL } from './config';
import { WALKOO_LEDGER_ABI } from './abi';
import { sendSponsoredTx, isPimlicoConfigured as isGaslessConfigured, getSmartAccountAddress } from './smartAccountService';

const iface = new ethers.Interface(WALKOO_LEDGER_ABI);

let provider: ethers.JsonRpcProvider | null = null;
const getProvider = (): ethers.JsonRpcProvider => {
  if (!provider) provider = new ethers.JsonRpcProvider(RPC_URL);
  return provider;
};

const getReadContract = (): ethers.Contract =>
  new ethers.Contract(CONTRACT_ADDRESS, WALKOO_LEDGER_ABI, getProvider());

export const isBlockchainConfigured = (): boolean =>
  CONTRACT_ADDRESS.length === 42 &&
  isGaslessConfigured();

const sendTx = async (fn: string, args: unknown[]): Promise<string | null> => {
  if (!isBlockchainConfigured()) return null;
  try {
    const data = iface.encodeFunctionData(fn, args);
    const txHash = await sendSponsoredTx(CONTRACT_ADDRESS, data);
    console.log(`[Blockchain] ${fn} tx:`, txHash);
    return txHash;
  } catch (error) {
    console.warn(`[Blockchain] ${fn} failed (non-blocking):`, error);
    return null;
  }
};

export const recordTrip = (
  tripId: string,
  distanceMeters: number,
  mode: string,
  pointsEarned: number,
  completionBonus: number,
): Promise<string | null> =>
  sendTx('recordTrip', [tripId, Math.round(distanceMeters), mode, Math.round(pointsEarned), Math.round(completionBonus)]);

export const recordPoints = (
  delta: number,
  kind: string,
  tripId = '',
): Promise<string | null> =>
  sendTx('recordPoints', [delta, kind, tripId]);

export const unlockBadge = (
  badgeId: number,
  badgeName: string,
): Promise<string | null> =>
  sendTx('unlockBadge', [badgeId, badgeName]);

export const completeChallenge = (
  challengeId: number,
  challengeName: string,
): Promise<string | null> =>
  sendTx('completeChallenge', [challengeId, challengeName]);

export interface OnChainStats {
  totalTrips: number;
  totalDistanceMeters: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
  totalBadges: number;
  totalChallenges: number;
  firstTripTimestamp: number;
  lastTripTimestamp: number;
}

export const getOnChainStats = async (userAddress: string): Promise<OnChainStats | null> => {
  if (!isBlockchainConfigured()) return null;
  try {
    const stats = await getReadContract().getStats(userAddress);
    return {
      totalTrips: Number(stats.totalTrips),
      totalDistanceMeters: Number(stats.totalDistanceMeters),
      totalPointsEarned: Number(stats.totalPointsEarned),
      totalPointsSpent: Number(stats.totalPointsSpent),
      totalBadges: Number(stats.totalBadges),
      totalChallenges: Number(stats.totalChallenges),
      firstTripTimestamp: Number(stats.firstTripTimestamp),
      lastTripTimestamp: Number(stats.lastTripTimestamp),
    };
  } catch (error) {
    console.warn('[Blockchain] Failed to read stats:', error);
    return null;
  }
};

export const getExplorerTxUrl = (txHash: string): string => `${EXPLORER_URL}/tx/${txHash}`;
export const getExplorerAddressUrl = (address: string): string => `${EXPLORER_URL}/address/${address}`;

export { getSmartAccountAddress };
