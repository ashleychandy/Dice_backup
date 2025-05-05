import { http } from 'wagmi';
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
  }
};

// Only initialize wagmi config in browser environment
let config = null;

if (typeof window !== 'undefined') {
  // Try to clear stale sessions before creating the config
  clearStaleSessions();

  // Create wagmi config with RainbowKit
  config = getDefaultConfig({
    appName: 'XDC Dice Game',
    projectId: 'b62e3b9d0838b22a9ff3d84dc115d759', // WalletConnect Project ID
    chains: [xdc, xdcTestnet],
    transports: {
      [xdc.id]: http(NETWORK_CONFIG.mainnet.rpcUrl),
      [xdcTestnet.id]: http(NETWORK_CONFIG.apothem.rpcUrl),
    },
    // Add these options for better WalletConnect handling
    walletConnectOptions: {
      showQrModal: true,
      // Reset on error or disconnect
      projectId: 'b62e3b9d0838b22a9ff3d84dc115d759',
      metadata: {
        name: 'XDC Dice Game',
        description: 'XDC Dice Game',
        url: window.location.origin,
        icons: ['https://avatars.githubusercontent.com/u/37784886'],
      },
      // Important: Pre-authorize all chains to prevent reconnection prompts
      requiredNamespaces: {
        eip155: {
          methods: [
            'eth_sendTransaction',
            'eth_signTransaction',
            'eth_sign',
            'personal_sign',
            'eth_signTypedData',
          ],
          chains: [`eip155:${xdc.id}`, `eip155:${xdcTestnet.id}`],
          events: ['chainChanged', 'accountsChanged'],
        },
      },
      // Improved options to handle switching
      optionalNamespaces: {
        eip155: {
          methods: [
            'eth_sendTransaction',
            'eth_signTransaction',
            'eth_sign',
            'personal_sign',
            'eth_signTypedData',
          ],
          chains: [`eip155:${xdc.id}`, `eip155:${xdcTestnet.id}`],
          events: ['chainChanged', 'accountsChanged'],
        },
      },
    },
  });
}

export const wagmiConfig = config;
