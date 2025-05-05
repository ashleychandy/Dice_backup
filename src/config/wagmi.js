// eslint-disable-next-line no-unused-vars
import { http, createConfig } from 'wagmi';
import { xdc, xdcTestnet } from 'wagmi/chains';
import { createPublicClient } from 'viem';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { NETWORK_CONFIG } from './index';

// Create public clients for both chains
export const mainnetClient = createPublicClient({
  chain: xdc,
  transport: http(NETWORK_CONFIG.mainnet.rpcUrl),
});

export const testnetClient = createPublicClient({
  chain: xdcTestnet,
  transport: http(NETWORK_CONFIG.apothem.rpcUrl),
});

// Check and clear problematic WalletConnect sessions
const clearStaleSessions = () => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return; // Not in browser environment
  }

  try {
    // Clear any stale WalletConnect sessions
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('wc@2:')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          // Check if the session looks corrupted
          if (!data || !data.session || !data.session.topic) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // If can't parse JSON, remove the key
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    // Silent error handling
    console.warn('Error clearing stale sessions:', error);
  }
};

// Initialize wagmi config with safe defaults for SSR/server environments
let wagmiConfig = null;

// Try to initialize the config safely
try {
  // Only run on client-side
  if (typeof window !== 'undefined') {
    // Clear stale sessions before creating the config
    clearStaleSessions();

    // Create wagmi config with RainbowKit (v2.x compatible)
    wagmiConfig = getDefaultConfig({
      appName: 'XDC Dice Game',
      projectId: 'b62e3b9d0838b22a9ff3d84dc115d759', // WalletConnect Project ID
      chains: [xdc, xdcTestnet],
      transports: {
        [xdc.id]: http(NETWORK_CONFIG.mainnet.rpcUrl),
        [xdcTestnet.id]: http(NETWORK_CONFIG.apothem.rpcUrl),
      },
    });
  }
} catch (error) {
  console.error('Failed to initialize wagmi config:', error);
}

export { wagmiConfig };
