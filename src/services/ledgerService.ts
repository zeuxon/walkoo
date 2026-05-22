import { PointsLedgerEntry, LedgerKind, TripMode } from '@/types';
import { loadJSON, saveJSON, StorageKeys } from './storage';
import { eventBus, Events } from './eventBus';
import { generateId } from '../utils/id';
import { recordPoints } from '@/blockchain';

let cached: PointsLedgerEntry[] | null = null;

export const getLedger = async (): Promise<PointsLedgerEntry[]> => {
  if (cached) return cached;
  cached = await loadJSON<PointsLedgerEntry[]>(StorageKeys.LEDGER, []);
  return cached;
}

export const addLedgerEntry = async (params: {
  deltaPoints: number;
  kind: LedgerKind;
  tripId?: string;
  mode?: TripMode;
  description?: string;
}): Promise<PointsLedgerEntry> => {
  const entries = await getLedger();
  const entry: PointsLedgerEntry = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ...params,
  };
  entries.unshift(entry);
  await saveJSON(StorageKeys.LEDGER, entries);
  cached = entries;
  eventBus.emit(Events.LEDGER_UPDATED, entry);

  if (entry.kind !== 'route_progress') {
    recordPoints(entry.deltaPoints, entry.kind, entry.tripId ?? '').catch(() => {});
  }

  return entry;
}

export const getRecentEntries = async (limit: number = 20): Promise<PointsLedgerEntry[]> => {
  const entries = await getLedger();
  return entries.slice(0, limit);
}

export const getLedgerForTrip = async (tripId: string): Promise<PointsLedgerEntry[]> => {
  const entries = await getLedger();
  return entries.filter((e) => e.tripId === tripId);
}

export const getTotalFromLedger = async (): Promise<number> => {
  const entries = await getLedger();
  return entries.reduce((sum, e) => sum + e.deltaPoints, 0);
}

export const clearLedger = async (): Promise<void> => {
  await saveJSON(StorageKeys.LEDGER, []);
  cached = [];
  eventBus.emit(Events.LEDGER_UPDATED, null);
}
