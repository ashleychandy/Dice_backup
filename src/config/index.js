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
      token:
        import.meta.env.VITE_TOKEN_ADDRESS ||
        '0x678adf7955d8f6dcaa9e2fcc1c5ba70bccc464e6',
      dice:
        import.meta.env.VITE_DICE_ADDRESS ||
        '0x1234567890123456789012345678901234567890',
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
      token:
        import.meta.env.VITE_APOTHEM_TOKEN_ADDRESS ||
        '0x0ea258D9A0D2C515e33aA26b860B6A8907Bf283C',
      dice:
        import.meta.env.VITE_APOTHEM_DICE_ADDRESS ||
        '0x197425beDa4EcF114ED5eAec4C362bDA2F70B605',
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
export const DEFAULT_NETWORK = 'mainnet';

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
