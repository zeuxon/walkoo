export { getWallet, getWalletAddress, hasWallet, clearWallet, importWallet, getWalletPrivateKey } from './walletService';
export { clearSmartAccountCache } from './smartAccountService';
export {
  isBlockchainConfigured,
  recordTrip,
  recordPoints,
  unlockBadge,
  completeChallenge,
  getOnChainStats,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  getSmartAccountAddress,
} from './blockchainService';
export type { OnChainStats } from './blockchainService';
export { CONTRACT_ADDRESS, EXPLORER_URL } from './config';
