/**
 * Application configuration
 * Centralizes environment variables and other config
 */

// Network configuration
export const NETWORK_CONFIG = {
  mainnet: {
    rpcUrl:
      import.meta.env.VITE_XDC_MAINNET_RPC || 'https://rpc.xinfin.network',
    chainId: 50,
    name: 'XDC Mainnet',
    contracts: {
      // Use environment variables for contract addresses
      token: import.meta.env.VITE_TOKEN_ADDRESS || '',
      dice: import.meta.env.VITE_DICE_ADDRESS || '',
    },
    explorer: 'https://explorer.xinfin.network',
    dexUrl: 'https://app.weswap.io/#/swap',
  },
  apothem: {
    rpcUrl:
      import.meta.env.VITE_XDC_APOTHEM_RPC || 'https://rpc.apothem.network',
    chainId: 51,
    name: 'XDC Apothem Testnet',
    contracts: {
      // Use environment variables for contract addresses
      token: import.meta.env.VITE_APOTHEM_TOKEN_ADDRESS || '',
      dice: import.meta.env.VITE_APOTHEM_DICE_ADDRESS || '',
    },
    explorer: 'https://explorer.apothem.network',
    dexUrl: 'https://app-apothem.weswap.io/#/swap',
  },
};

// Supported networks
export const SUPPORTED_CHAIN_IDS = Object.values(NETWORK_CONFIG).map(
  network => network.chainId
);

// Default network
export const DEFAULT_NETWORK = 'apothem';

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
    telegram: 'https://t.me/',
    discord: 'https://discord.gg/',
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
