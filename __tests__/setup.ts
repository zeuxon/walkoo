jest.mock('expo-secure-store', () => {
  const secureStore: Record<string, string> = {};
  return {
    getItemAsync: jest.fn((key: string) => Promise.resolve(secureStore[key] ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      secureStore[key] = value;
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key: string) => {
      delete secureStore[key];
      return Promise.resolve();
    }),
  };
});

jest.mock('../src/blockchain', () => ({
  isBlockchainConfigured: jest.fn().mockReturnValue(false),
  recordTrip: jest.fn().mockResolvedValue(null),
  recordPoints: jest.fn().mockResolvedValue(null),
  unlockBadge: jest.fn().mockResolvedValue(null),
  completeChallenge: jest.fn().mockResolvedValue(null),
  getOnChainStats: jest.fn().mockResolvedValue(null),
  getExplorerTxUrl: jest.fn((hash: string) => `https://amoy.polygonscan.com/tx/${hash}`),
  getExplorerAddressUrl: jest.fn((addr: string) => `https://amoy.polygonscan.com/address/${addr}`),
  getWallet: jest.fn().mockResolvedValue({ address: '0x0000000000000000000000000000000000000000' }),
  getWalletAddress: jest.fn().mockResolvedValue('0x0000000000000000000000000000000000000000'),
  hasWallet: jest.fn().mockResolvedValue(false),
  clearWallet: jest.fn().mockResolvedValue(undefined),
  CONTRACT_ADDRESS: '0x0000000000000000000000000000000000000000',
  EXPLORER_URL: 'https://amoy.polygonscan.com',
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 47.4979, longitude: 19.0402, accuracy: 10 },
  }),
  watchPositionAsync: jest.fn().mockResolvedValue({ remove: jest.fn() }),
  Accuracy: { High: 4 },
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      multiRemove: jest.fn((keys: string[]) => {
        for (const k of keys) delete store[k];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach((k) => delete store[k]);
        return Promise.resolve();
      }),
    },
  };
});
