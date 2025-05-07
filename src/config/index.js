/**
 * Application configuration
 * Centralizes environment variables and other config
 */

// Storage keys for user settings
const STORAGE_KEYS = {
  mainnetRpc: 'xdc_dice_mainnet_rpc',
  apothemRpc: 'xdc_dice_apothem_rpc',
  preferredNetwork: 'xdc_dice_preferred_network',
};

// RPC Configuration
export const RPC_CONFIG = {
  timeout: parseInt(import.meta.env.VITE_RPC_TIMEOUT) || 10000,
  maxRetries: parseInt(import.meta.env.VITE_MAX_RPC_RETRIES) || 3,
};

// Helper to get RPC URLs from environment variables
const getEnvRpcUrls = networkType => {
  const envPrefix =
    networkType === 'mainnet' ? 'VITE_XDC_MAINNET' : 'VITE_XDC_APOTHEM';

  // Get all RPC URLs (primary and fallbacks) from environment
  const rpcUrls = [
    import.meta.env[`${envPrefix}_PRIMARY_RPC`],
    import.meta.env[`${envPrefix}_FALLBACK_RPC_1`],
    import.meta.env[`${envPrefix}_FALLBACK_RPC_2`],
    import.meta.env[`${envPrefix}_FALLBACK_RPC_3`],
  ].filter(url => url && url.trim() !== ''); // Filter out empty URLs

  if (rpcUrls.length === 0) {
    console.warn(
      `No RPC URLs configured for ${networkType} in environment variables`
    );
  }

  return rpcUrls;
};

// Helper to get user-defined RPC URL from localStorage
const getUserRpcUrls = networkType => {
  if (typeof window === 'undefined') return [];

  const storageKey =
    networkType === 'mainnet'
      ? STORAGE_KEYS.mainnetRpc
      : STORAGE_KEYS.apothemRpc;
  const userRpcUrl = localStorage.getItem(storageKey);

  return userRpcUrl ? [userRpcUrl] : [];
};

// Helper to get all RPC URLs in priority order
const getAllRpcUrls = networkType => {
  // 1. Get user-defined RPC URLs (highest priority)
  const userRpcUrls = getUserRpcUrls(networkType);

  // 2. Get environment-configured RPCs (fallbacks)
  const envRpcUrls = getEnvRpcUrls(networkType);

  // Combine URLs, removing duplicates while maintaining priority
  const allUrls = [...userRpcUrls, ...envRpcUrls];
  const uniqueUrls = [...new Set(allUrls)]; // Remove duplicates while preserving order

  if (uniqueUrls.length === 0) {
    throw new Error(
      `No RPC URLs configured for ${networkType}. Please check your environment variables.`
    );
  }

  return uniqueUrls;
};

// Helper to save user-defined RPC URL to localStorage
export const saveUserRpcUrl = (networkType, url) => {
  if (typeof window === 'undefined' || !url) return false;

  const storageKey =
    networkType === 'mainnet'
      ? STORAGE_KEYS.mainnetRpc
      : STORAGE_KEYS.apothemRpc;
  localStorage.setItem(storageKey, url);

  // Update the network configuration immediately
  const network = NETWORK_CONFIG[networkType];
  if (network) {
    network.rpcUrls = getAllRpcUrls(networkType);
    network.currentRpcIndex = 0; // Reset to first (highest priority) RPC
  }

  return true;
};

// Helper to get user's preferred network
export const getUserPreferredNetwork = () => {
  if (typeof window === 'undefined') return DEFAULT_NETWORK;
  return localStorage.getItem(STORAGE_KEYS.preferredNetwork) || DEFAULT_NETWORK;
};

// Helper to save user's preferred network
export const saveUserPreferredNetwork = network => {
  if (typeof window === 'undefined') return false;
  localStorage.setItem(STORAGE_KEYS.preferredNetwork, network);
  return true;
};

// Network configuration
export const NETWORK_CONFIG = {
  mainnet: {
    rpcUrls: getAllRpcUrls('mainnet'),
    currentRpcIndex: 0,
    chainId: 50,
    name: 'XDC Mainnet',
    contracts: {
      token: import.meta.env.VITE_TOKEN_ADDRESS || '',
      dice: import.meta.env.VITE_DICE_ADDRESS || '',
    },
    explorer: 'https://explorer.xinfin.network',
    dexUrl: 'https://app.weswap.io/#/swap',
  },
  apothem: {
    rpcUrls: getAllRpcUrls('apothem'),
    currentRpcIndex: 0,
    chainId: 51,
    name: 'XDC Apothem Testnet',
    contracts: {
      token: import.meta.env.VITE_APOTHEM_TOKEN_ADDRESS || '',
      dice: import.meta.env.VITE_APOTHEM_DICE_ADDRESS || '',
    },
    explorer: 'https://explorer.apothem.network',
    dexUrl: 'https://app-apothem.weswap.io/#/swap',
  },
};

// Helper to get the current active RPC URL for a network
export const getCurrentRpcUrl = networkType => {
  const network = NETWORK_CONFIG[networkType];
  return network.rpcUrls[network.currentRpcIndex];
};

// Helper to switch to next fallback RPC
export const switchToNextRpc = networkType => {
  const network = NETWORK_CONFIG[networkType];
  if (!network || network.rpcUrls.length <= 1) return null;

  const nextIndex = (network.currentRpcIndex + 1) % network.rpcUrls.length;
  network.currentRpcIndex = nextIndex;
  return network.rpcUrls[nextIndex];
};

// Helper to reset to highest priority RPC
export const resetToHighestPriorityRpc = networkType => {
  const network = NETWORK_CONFIG[networkType];
  if (!network) return false;

  network.rpcUrls = getAllRpcUrls(networkType); // Refresh the RPC list
  network.currentRpcIndex = 0; // Reset to highest priority
  return true;
};

// Default network
export const DEFAULT_NETWORK = 'apothem';

// Supported chain IDs
export const SUPPORTED_CHAIN_IDS = [50, 51];

// API configuration
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
};

// App configuration
export const APP_CONFIG = {
  appName: 'XDC Dice Game',
  appVersion: '1.0.0',
  contactEmail: 'support@xdcdice.com',
  social: {
    twitter: 'https://twitter.com/',
  },
  // Toast notification duration in ms
  toastDuration: 5000,
  // Game constants
  game: {
    minBet: BigInt('1000000000000000000'), // 1 GAMA
    maxBet: BigInt('1000000000000000000000'), // 1000 GAMA
    // Game odds (1/6 chance of winning)
    multiplier: 6,
  },
};

export default {
  networks: NETWORK_CONFIG,
  supportedChainIds: SUPPORTED_CHAIN_IDS,
  defaultNetwork: DEFAULT_NETWORK,
  api: API_CONFIG,
  app: APP_CONFIG,
};
