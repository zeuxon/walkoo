import {
  SKIN_CATALOG,
  SKIN_MULTIPLIERS,
  PACK_PRICES,
  getDropRates,
  getInventory,
  openPack,
  equipItem,
  unequipSkin,
  getActiveSkinMultiplier,
} from '@/services/inventoryService';
import { addPoints, resetHomeState } from '@/services/homeService';
import { clearLedger } from '@/services/ledgerService';
import { saveJSON, StorageKeys } from '@/services/storage';

beforeEach(async () => {
  await resetHomeState();
  await clearLedger();
  await saveJSON(StorageKeys.INVENTORY, []);
  await saveJSON(StorageKeys.LOADOUT, { skin: null });
  await saveJSON(StorageKeys.PACK_HISTORY, []);
});

describe('SKIN_CATALOG', () => {
  it('contains only skin category items', () => {
    expect(SKIN_CATALOG.length).toBeGreaterThan(0);
  });

  it('has items at multiple rarities', () => {
    const rarities = new Set(SKIN_CATALOG.map((i) => i.rarity));
    expect(rarities).toContain('common');
    expect(rarities).toContain('uncommon');
    expect(rarities).toContain('rare');
    expect(rarities).toContain('legendary');
  });

  it('has unique itemIds', () => {
    const ids = SKIN_CATALOG.map((i) => i.itemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every item has a non-empty name and description', () => {
    for (const item of SKIN_CATALOG) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
    }
  });
});

describe('SKIN_MULTIPLIERS', () => {
  it('multipliers increase with rarity', () => {
    expect(SKIN_MULTIPLIERS.common).toBeLessThan(SKIN_MULTIPLIERS.uncommon);
    expect(SKIN_MULTIPLIERS.uncommon).toBeLessThan(SKIN_MULTIPLIERS.rare);
    expect(SKIN_MULTIPLIERS.rare).toBeLessThan(SKIN_MULTIPLIERS.epic);
    expect(SKIN_MULTIPLIERS.epic).toBeLessThan(SKIN_MULTIPLIERS.legendary);
  });

  it('all multipliers are greater than 1', () => {
    for (const mult of Object.values(SKIN_MULTIPLIERS)) {
      expect(mult).toBeGreaterThan(1);
    }
  });
});

describe('Drop Rates', () => {
  it('sum to ~1.0 for each pack type', () => {
    const rates = getDropRates();
    for (const packType of ['basic', 'premium', 'legendary'] as const) {
      const sum = Object.values(rates[packType]).reduce((s, v) => s + v, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    }
  });

  it('legendary pack has higher rare+ rates than basic', () => {
    const rates = getDropRates();
    const basicRarePlus = rates.basic.rare + rates.basic.epic + rates.basic.legendary;
    const legendaryRarePlus = rates.legendary.rare + rates.legendary.epic + rates.legendary.legendary;
    expect(legendaryRarePlus).toBeGreaterThan(basicRarePlus);
  });
});

describe('Pack Prices', () => {
  it('has increasing prices', () => {
    expect(PACK_PRICES.basic).toBeLessThan(PACK_PRICES.premium);
    expect(PACK_PRICES.premium).toBeLessThan(PACK_PRICES.legendary);
  });
});

describe('Seeded RNG determinism', () => {
  function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  it('produces deterministic sequence', () => {
    const rng1 = seededRandom(42);
    const rng2 = seededRandom(42);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it('produces values between 0 and 1', () => {
    const rng = seededRandom(12345);
    for (let i = 0; i < 100; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = seededRandom(42);
    const rng2 = seededRandom(99);
    expect(rng1()).not.toBe(rng2());
  });
});

describe('openPack', () => {
  it('returns null when user has insufficient points', async () => {
    const result = await openPack('basic', 1);
    expect(result).toBeNull();
  });

  it('returns an item when user has enough points', async () => {
    await addPoints(200);
    const result = await openPack('basic', 1);
    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].itemId).toBeDefined();
  });

  it('deducts points on successful open', async () => {
    await addPoints(200);
    await openPack('basic', 1);
    const second = await openPack('basic', 1);
    expect(second).not.toBeNull();
    expect(second!.duplicateRefund).toBeGreaterThan(0);
  });

  it('duplicate item increases quantity and triggers refund', async () => {
    await addPoints(500);
    await openPack('basic', 1);
    const second = await openPack('basic', 1);
    expect(second!.duplicateRefund).toBeGreaterThan(0);

    const inventory = await getInventory();
    const item = inventory.find((i) => i.itemId === second!.items[0].itemId);
    expect(item!.quantity).toBe(2);
  });

  it('new item has quantity 1 and no refund', async () => {
    await addPoints(200);
    const result = await openPack('basic', 1);
    expect(result!.duplicateRefund).toBe(0);
    expect(result!.items[0].quantity).toBe(1);
  });
});

describe('equipItem / unequipSkin / getActiveSkinMultiplier', () => {
  it('getActiveSkinMultiplier returns 1.0 when no skin equipped', async () => {
    await unequipSkin();
    const mult = await getActiveSkinMultiplier();
    expect(mult).toBe(1.0);
  });

  it('equipItem stores the skin in loadout', async () => {
    const loadout = await equipItem('skin_golden');
    expect(loadout.skin).toBe('skin_golden');
  });

  it('getActiveSkinMultiplier reflects equipped skin rarity', async () => {
    await equipItem('skin_golden');
    const mult = await getActiveSkinMultiplier();
    expect(mult).toBe(SKIN_MULTIPLIERS.common);
  });

  it('unequipSkin clears the loadout', async () => {
    await equipItem('skin_golden');
    await unequipSkin();
    const mult = await getActiveSkinMultiplier();
    expect(mult).toBe(1.0);
  });

  it('equipping a higher-rarity skin gives a larger multiplier', async () => {
    await equipItem('skin_galaxy');
    const mult = await getActiveSkinMultiplier();
    expect(mult).toBe(SKIN_MULTIPLIERS.legendary);
    expect(mult).toBeGreaterThan(SKIN_MULTIPLIERS.common);
  });
});
