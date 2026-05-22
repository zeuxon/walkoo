import {
  getLedger,
  addLedgerEntry,
  getRecentEntries,
  getLedgerForTrip,
  getTotalFromLedger,
  clearLedger,
} from '@/services/ledgerService';

beforeEach(async () => {
  await clearLedger();
});

describe('ledgerService', () => {
  describe('getLedger', () => {
    it('returns empty array on fresh state', async () => {
      const entries = await getLedger();
      expect(entries).toHaveLength(0);
    });
  });

  describe('addLedgerEntry', () => {
    it('stores entry with correct deltaPoints and kind', async () => {
      const entry = await addLedgerEntry({ deltaPoints: 50, kind: 'route_progress' });
      expect(entry.deltaPoints).toBe(50);
      expect(entry.kind).toBe('route_progress');
    });

    it('assigns a unique id and ISO timestamp', async () => {
      const entry = await addLedgerEntry({ deltaPoints: 10, kind: 'route_progress' });
      expect(entry.id).toBeDefined();
      expect(entry.id.length).toBeGreaterThan(0);
      expect(new Date(entry.createdAt).getTime()).not.toBeNaN();
    });

    it('stores optional tripId and mode fields', async () => {
      const entry = await addLedgerEntry({
        deltaPoints: 30,
        kind: 'route_progress',
        tripId: 'trip-123',
        mode: 'walk',
        description: 'test entry',
      });
      expect(entry.tripId).toBe('trip-123');
      expect(entry.mode).toBe('walk');
      expect(entry.description).toBe('test entry');
    });

    it('persists entries to storage', async () => {
      await addLedgerEntry({ deltaPoints: 10, kind: 'route_progress' });
      const entries = await getLedger();
      expect(entries).toHaveLength(1);
    });

    it('newer entries appear first (newest-first ordering)', async () => {
      await addLedgerEntry({ deltaPoints: 10, kind: 'route_progress' });
      await addLedgerEntry({ deltaPoints: 99, kind: 'route_completion' });
      const entries = await getLedger();
      expect(entries[0].deltaPoints).toBe(99);
      expect(entries[1].deltaPoints).toBe(10);
    });

    it('supports negative deltaPoints for spend entries', async () => {
      const entry = await addLedgerEntry({ deltaPoints: -100, kind: 'spend_pack' });
      expect(entry.deltaPoints).toBe(-100);
    });
  });

  describe('getRecentEntries', () => {
    it('returns at most the requested number of entries', async () => {
      for (let i = 0; i < 10; i++) {
        await addLedgerEntry({ deltaPoints: i, kind: 'route_progress' });
      }
      const recent = await getRecentEntries(3);
      expect(recent).toHaveLength(3);
    });

    it('returns all entries when limit exceeds count', async () => {
      await addLedgerEntry({ deltaPoints: 10, kind: 'route_progress' });
      await addLedgerEntry({ deltaPoints: 20, kind: 'route_progress' });
      const recent = await getRecentEntries(100);
      expect(recent).toHaveLength(2);
    });

    it('returns newest entries first', async () => {
      await addLedgerEntry({ deltaPoints: 1, kind: 'route_progress' });
      await addLedgerEntry({ deltaPoints: 2, kind: 'route_progress' });
      await addLedgerEntry({ deltaPoints: 3, kind: 'route_progress' });
      const recent = await getRecentEntries(2);
      expect(recent[0].deltaPoints).toBe(3);
      expect(recent[1].deltaPoints).toBe(2);
    });
  });

  describe('getLedgerForTrip', () => {
    it('returns only entries matching the tripId', async () => {
      await addLedgerEntry({ deltaPoints: 10, kind: 'route_progress', tripId: 'trip-A' });
      await addLedgerEntry({ deltaPoints: 20, kind: 'route_progress', tripId: 'trip-B' });
      await addLedgerEntry({ deltaPoints: 30, kind: 'route_completion', tripId: 'trip-A' });

      const entries = await getLedgerForTrip('trip-A');
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.tripId === 'trip-A')).toBe(true);
    });

    it('returns empty array when tripId not found', async () => {
      await addLedgerEntry({ deltaPoints: 10, kind: 'route_progress', tripId: 'trip-X' });
      const entries = await getLedgerForTrip('trip-Z');
      expect(entries).toHaveLength(0);
    });
  });

  describe('getTotalFromLedger', () => {
    it('returns 0 when ledger is empty', async () => {
      const total = await getTotalFromLedger();
      expect(total).toBe(0);
    });

    it('sums all positive deltas', async () => {
      await addLedgerEntry({ deltaPoints: 100, kind: 'route_progress' });
      await addLedgerEntry({ deltaPoints: 50, kind: 'route_completion' });
      const total = await getTotalFromLedger();
      expect(total).toBe(150);
    });

    it('accounts for negative deltas (spend entries)', async () => {
      await addLedgerEntry({ deltaPoints: 200, kind: 'route_progress' });
      await addLedgerEntry({ deltaPoints: -100, kind: 'spend_pack' });
      await addLedgerEntry({ deltaPoints: 30, kind: 'route_completion' });
      const total = await getTotalFromLedger();
      expect(total).toBe(130);
    });
  });

  describe('clearLedger', () => {
    it('empties all entries', async () => {
      await addLedgerEntry({ deltaPoints: 100, kind: 'route_progress' });
      await addLedgerEntry({ deltaPoints: 50, kind: 'route_completion' });
      await clearLedger();
      const entries = await getLedger();
      expect(entries).toHaveLength(0);
    });

    it('getTotalFromLedger returns 0 after clear', async () => {
      await addLedgerEntry({ deltaPoints: 500, kind: 'route_progress' });
      await clearLedger();
      const total = await getTotalFromLedger();
      expect(total).toBe(0);
    });
  });
});
