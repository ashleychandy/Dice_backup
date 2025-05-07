import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from '../components/wallet/WalletProvider';
import { NETWORK_CONFIG, getUserPreferredNetwork } from '../config';

// Define available networks - use the same structure as NETWORK_CONFIG
export const NETWORKS = {
  MAINNET: {
    id: 'mainnet',
    name: 'XDC Mainnet',
    rpc: NETWORK_CONFIG.mainnet.rpcUrl,
    chainId: 50,
    explorer: 'https://explorer.xinfin.network',
    contracts: {
      dice: import.meta.env.VITE_DICE_ADDRESS,
      token: import.meta.env.VITE_TOKEN_ADDRESS,
    },
    // Maintain backward compatibility
    diceAddress: import.meta.env.VITE_DICE_ADDRESS,
    tokenAddress: import.meta.env.VITE_TOKEN_ADDRESS,
    icon: '🌐',
    color: '#2e7d32',
  },
  APOTHEM: {
    id: 'apothem',
    name: 'Apothem Testnet',
    rpc: NETWORK_CONFIG.apothem.rpcUrl,
    chainId: 51,
    explorer: 'https://explorer.apothem.network',
    contracts: {
      dice: import.meta.env.VITE_APOTHEM_DICE_ADDRESS,
      token: import.meta.env.VITE_APOTHEM_TOKEN_ADDRESS,
    },
    // Maintain backward compatibility
    diceAddress: import.meta.env.VITE_APOTHEM_DICE_ADDRESS,
    tokenAddress: import.meta.env.VITE_APOTHEM_TOKEN_ADDRESS,
    icon: '🧪',
    color: '#0277bd',
  },
};

// Storage keys for RPC settings
const STORAGE_KEYS = {
  LAST_RPC_UPDATE: 'xdc_dice_last_rpc_update',
};

// Create the context
const NetworkContext = createContext(null);

// Provider component
export const NetworkProvider = ({ children }) => {
  const { provider } = useWallet();
  const [currentNetwork, setCurrentNetwork] = useState(
    // Use the user's preferred network or env setting or default to Apothem
    NETWORKS[getUserPreferredNetwork().toUpperCase()] ||
      (import.meta.env.VITE_NETWORK === 'mainnet'
        ? NETWORKS.MAINNET
        : NETWORKS.APOTHEM)
  );
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);
  const [networkError, setNetworkError] = useState(null);

  // Check for RPC URL changes on component mount
  useEffect(() => {
    const checkRpcChanges = () => {
      // Update network objects with latest RPC URLs from config
      NETWORKS.MAINNET.rpc = NETWORK_CONFIG.mainnet.rpcUrl;
      NETWORKS.APOTHEM.rpc = NETWORK_CONFIG.apothem.rpcUrl;

      // Check if we need to reload the page due to RPC changes
      const lastUpdate = localStorage.getItem(STORAGE_KEYS.LAST_RPC_UPDATE);
      const currentTimestamp = Date.now().toString();

      if (lastUpdate) {
        // If storage has a different RPC URL than what's loaded, reload the page
        if (
          NETWORKS.MAINNET.rpc !== NETWORK_CONFIG.mainnet.rpcUrl ||
          NETWORKS.APOTHEM.rpc !== NETWORK_CONFIG.apothem.rpcUrl
        ) {
          localStorage.setItem(STORAGE_KEYS.LAST_RPC_UPDATE, currentTimestamp);
          window.location.reload();
        }
      } else {
        // First time tracking RPC URLs
        localStorage.setItem(STORAGE_KEYS.LAST_RPC_UPDATE, currentTimestamp);
      }
    };

    checkRpcChanges();
  }, []);

  // Detect the current network from provider when available
  useEffect(() => {
    const detectNetwork = async () => {
      if (!provider) return;

      try {
        const { chainId } = await provider.getNetwork();
        // XDC Mainnet is 50, Apothem is 51
        if (chainId === 50) {
          setCurrentNetwork(NETWORKS.MAINNET);
        } else if (chainId === 51) {
          setCurrentNetwork(NETWORKS.APOTHEM);
        }
      } catch (error) {
        console.error('Failed to detect network:', error);
      }
    };

    detectNetwork();
  }, [provider]);

  // Switch network function
  const switchNetwork = async networkId => {
    if (!provider) {
      setNetworkError('Wallet not connected');
      return false;
    }

    setIsNetworkSwitching(true);
    setNetworkError(null);

    try {
      const targetNetwork =
        networkId === 'mainnet' ? NETWORKS.MAINNET : NETWORKS.APOTHEM;

      // Request network switch via wallet
      await provider.send('wallet_switchEthereumChain', [
        { chainId: `0x${targetNetwork.chainId.toString(16)}` },
      ]);

      // Update state (the effect above will detect the change too)
      setCurrentNetwork(targetNetwork);

      // Force page reload to ensure all contracts are reinitialized
      window.location.reload();

      return true;
    } catch (error) {
      console.error('Network switch failed:', error);
      setNetworkError(error.message || 'Failed to switch network');
      return false;
    } finally {
      setIsNetworkSwitching(false);
    }
  };

  // Function to refresh network configuration when RPC URLs change
  const refreshNetworkConfig = () => {
    // Update timestamp to prevent unnecessary reloads
    localStorage.setItem(STORAGE_KEYS.LAST_RPC_UPDATE, Date.now().toString());

    // Force page reload to apply new RPC URLs
    window.location.reload();
  };

  return (
    <NetworkContext.Provider
      value={{
        currentNetwork,
        networks: NETWORKS,
        switchNetwork,
        isNetworkSwitching,
        networkError,
        refreshNetworkConfig,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

// Hook for using the network context
export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
