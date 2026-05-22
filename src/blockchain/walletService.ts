import * as SecureStore from 'expo-secure-store';
import { ethers } from 'ethers';
import { WALLET_STORAGE_KEY } from './config';

type AnyWallet = ethers.Wallet | ethers.HDNodeWallet;

let cachedWallet: AnyWallet | null = null;

export const getWallet = async (): Promise<AnyWallet> => {
  if (cachedWallet) return cachedWallet;

  try {
    const existingKey = await SecureStore.getItemAsync(WALLET_STORAGE_KEY);

    if (existingKey) {
      cachedWallet = new ethers.Wallet(existingKey);
      return cachedWallet;
    }

    const newWallet = ethers.Wallet.createRandom();
    await SecureStore.setItemAsync(WALLET_STORAGE_KEY, newWallet.privateKey);
    cachedWallet = newWallet;
    console.log('[Wallet] New wallet created:', newWallet.address);
    return newWallet;
  } catch (error) {
    console.warn('[Wallet] SecureStore unavailable, using ephemeral wallet:', error);
    return (cachedWallet = ethers.Wallet.createRandom());
  }
};

export const getWalletAddress = async (): Promise<string> => {
  const wallet = await getWallet();
  return wallet.address;
};

export const hasWallet = async (): Promise<boolean> => {
  try {
    const key = await SecureStore.getItemAsync(WALLET_STORAGE_KEY);
    return key !== null;
  } catch {
    return false;
  }
};

export const clearWallet = async (): Promise<void> => {
  cachedWallet = null;
  try {
    await SecureStore.deleteItemAsync(WALLET_STORAGE_KEY);
  } catch {}
};

export const importWallet = async (privateKey: string): Promise<string | null> => {
  try {
    const key = privateKey.trim().startsWith('0x') ? privateKey.trim() : `0x${privateKey.trim()}`;
    const wallet = new ethers.Wallet(key);
    await SecureStore.setItemAsync(WALLET_STORAGE_KEY, wallet.privateKey);
    cachedWallet = wallet;
    console.log('[Wallet] Imported wallet:', wallet.address);
    return wallet.address;
  } catch {
    return null;
  }
};

export const getWalletPrivateKey = async (): Promise<string | null> => {
  try {
    const wallet = await getWallet();
    return wallet.privateKey;
  } catch {
    return null;
  }
};
