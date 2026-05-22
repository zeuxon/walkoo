import {
  InventoryItem,
  EquippedLoadout,
  PackOpeningRecord,
  PackType,
  ItemRarity,
  DEFAULT_LOADOUT,
} from '@/types';
import { loadJSON, saveJSON, StorageKeys } from './storage';
import { eventBus, Events } from './eventBus';
import { spendPoints, addPoints } from './homeService';
import { addLedgerEntry } from './ledgerService';
import { generateId } from '../utils/id';


export const PACK_PRICES: Record<PackType, number> = {
  basic: 100,
  premium: 250,
  legendary: 500,
};


const DROP_RATES: Record<PackType, Record<ItemRarity, number>> = {
  basic:     { common: 0.60, uncommon: 0.25, rare: 0.12, epic: 0.025, legendary: 0.005 },
  premium:   { common: 0.30, uncommon: 0.35, rare: 0.22, epic: 0.10,  legendary: 0.03  },
  legendary: { common: 0.10, uncommon: 0.20, rare: 0.35, epic: 0.25,  legendary: 0.10  },
};

const ITEMS_PER_PACK: Record<PackType, number> = {
  basic: 1,
  premium: 1,
  legendary: 1,
};


export const SKIN_MULTIPLIERS: Record<ItemRarity, number> = {
  common:    1.05,
  uncommon:  1.12,
  rare:      1.20,
  epic:      1.35,
  legendary: 1.50,
};


interface CatalogItem {
  itemId: string;
  name: string;
  rarity: ItemRarity;
  description: string;
}

export const SKIN_CATALOG: CatalogItem[] = [
  { itemId: 'skin_golden',   name: 'Golden Wolf',   rarity: 'common',    description: 'Warm gold fur. +5% points on every trip.' },
  { itemId: 'skin_arctic',   name: 'Arctic Wolf',   rarity: 'common',    description: 'Pure white ice fur. +5% points on every trip.' },
  { itemId: 'skin_forest',   name: 'Forest Wolf',   rarity: 'uncommon',  description: 'Deep green woodland coat. +12% points on every trip.' },
  { itemId: 'skin_cherry',   name: 'Cherry Wolf',   rarity: 'uncommon',  description: 'Soft cherry red fur. +12% points on every trip.' },
  { itemId: 'skin_midnight', name: 'Midnight Wolf',  rarity: 'rare',      description: 'Dark navy with silver eyes. +20% points on every trip.' },
  { itemId: 'skin_sunset',   name: 'Sunset Wolf',   rarity: 'rare',      description: 'Orange to pink gradient fur. +20% points on every trip.' },
  { itemId: 'skin_shadow',   name: 'Shadow Wolf',   rarity: 'epic',      description: 'Jet black with glowing purple. +35% points on every trip.' },
  { itemId: 'skin_galaxy',   name: 'Galaxy Wolf',   rarity: 'legendary', description: 'Cosmic fur with stars and nebula. +50% points on every trip.' },
];


export const getInventory = async (): Promise<InventoryItem[]> => {
  return loadJSON<InventoryItem[]>(StorageKeys.INVENTORY, []);
};

export const getLoadout = async (): Promise<EquippedLoadout> => {
  return loadJSON<EquippedLoadout>(StorageKeys.LOADOUT, DEFAULT_LOADOUT);
};

export const equipItem = async (itemId: string): Promise<EquippedLoadout> => {
  const updated: EquippedLoadout = { skin: itemId };
  await saveJSON(StorageKeys.LOADOUT, updated);
  eventBus.emit(Events.INVENTORY_CHANGED);
  return updated;
};

export const unequipSkin = async (): Promise<EquippedLoadout> => {
  const updated: EquippedLoadout = { skin: null };
  await saveJSON(StorageKeys.LOADOUT, updated);
  eventBus.emit(Events.INVENTORY_CHANGED);
  return updated;
};

export const getActiveSkinMultiplier = async (): Promise<number> => {
  const loadout = await getLoadout();
  if (!loadout.skin) return 1.0;
  const skin = SKIN_CATALOG.find((s) => s.itemId === loadout.skin);
  if (!skin) return 1.0;
  return SKIN_MULTIPLIERS[skin.rarity];
};

export const getEquippedSkinRarity = async (): Promise<ItemRarity | null> => {
  const loadout = await getLoadout();
  if (!loadout.skin) return null;
  const skin = SKIN_CATALOG.find((s) => s.itemId === loadout.skin);
  return skin?.rarity ?? null;
};


const DUPLICATE_REFUND_RATES: Record<ItemRarity, number> = {
  common:    5,
  uncommon:  15,
  rare:      30,
  epic:      60,
  legendary: 150,
};

export const openPack = async (
  packType: PackType,
  rngSeed?: number,
): Promise<{ items: InventoryItem[]; duplicateRefund: number } | null> => {
  const price = PACK_PRICES[packType];
  const homeState = await spendPoints(price);
  if (!homeState) return null;

  await addLedgerEntry({
    deltaPoints: -price,
    kind: 'spend_pack',
    description: `Opened ${packType} pack (-${price} pts)`,
  });

  const count = ITEMS_PER_PACK[packType];
  const rates = DROP_RATES[packType];
  const rng = rngSeed !== undefined ? seededRandom(rngSeed) : Math.random;

  const droppedItems: CatalogItem[] = [];
  for (let i = 0; i < count; i++) {
    const rarity = rollRarity(rates, rng);
    const pool = SKIN_CATALOG.filter((it) => it.rarity === rarity);
    const picked = pool[Math.floor(rng() * pool.length)];
    droppedItems.push(picked);
  }

  const inventory = await getInventory();
  let duplicateRefund = 0;
  const grantedItems: InventoryItem[] = [];

  for (const catalogItem of droppedItems) {
    const existing = inventory.find((i) => i.itemId === catalogItem.itemId);
    if (existing) {
      existing.quantity += 1;
      duplicateRefund += DUPLICATE_REFUND_RATES[catalogItem.rarity];
      grantedItems.push(existing);
    } else {
      const newItem: InventoryItem = {
        ...catalogItem,
        category: 'skin',
        iconKey: catalogItem.itemId,
        quantity: 1,
        ownedAt: new Date().toISOString(),
      };
      inventory.push(newItem);
      grantedItems.push(newItem);
    }
  }

  await saveJSON(StorageKeys.INVENTORY, inventory);

  if (duplicateRefund > 0) {
    await addPoints(duplicateRefund);
    await addLedgerEntry({
      deltaPoints: duplicateRefund,
      kind: 'duplicate_refund',
      description: `Duplicate skin refund (+${duplicateRefund} pts)`,
    });
  }

  const record: PackOpeningRecord = {
    id: generateId(),
    openedAt: new Date().toISOString(),
    packType,
    cost: price,
    itemsGranted: droppedItems.map((d) => d.itemId),
  };
  const history = await loadJSON<PackOpeningRecord[]>(StorageKeys.PACK_HISTORY, []);
  history.unshift(record);
  await saveJSON(StorageKeys.PACK_HISTORY, history);

  eventBus.emit(Events.INVENTORY_CHANGED);
  return { items: grantedItems, duplicateRefund };
};


const rollRarity = (rates: Record<ItemRarity, number>, rng: () => number): ItemRarity => {
  const roll = rng();
  let cumulative = 0;
  for (const [rarity, rate] of Object.entries(rates)) {
    cumulative += rate;
    if (roll < cumulative) return rarity as ItemRarity;
  }
  return 'common';
};

const seededRandom = (seed: number): (() => number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

export const getDropRates = (): typeof DROP_RATES => ({ ...DROP_RATES });
