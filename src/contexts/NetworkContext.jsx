import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from '../components/wallet/WalletProvider';

// Define available networks
export const NETWORKS = {
  MAINNET: {
    id: 'mainnet',
    name: 'XDC Mainnet',
    rpc: import.meta.env.VITE_XDC_MAINNET_RPC,
    chainId: 50,
    explorer: 'https://explorer.xinfin.network',
    diceAddress: import.meta.env.VITE_DICE_ADDRESS,
    tokenAddress: import.meta.env.VITE_TOKEN_ADDRESS,
    icon: '🌐',
    color: '#2e7d32',
  },
  APOTHEM: {
    id: 'apothem',
    name: 'Apothem Testnet',
    rpc: import.meta.env.VITE_XDC_APOTHEM_RPC,
    chainId: 51,
    explorer: 'https://explorer.apothem.network',
    diceAddress: import.meta.env.VITE_APOTHEM_DICE_ADDRESS,
    tokenAddress: import.meta.env.VITE_APOTHEM_TOKEN_ADDRESS,
    icon: '🧪',
    color: '#0277bd',
  },
};

// Create the context
const NetworkContext = createContext(null);

// Provider component
export const NetworkProvider = ({ children }) => {
  const { provider } = useWallet();
  const [currentNetwork, setCurrentNetwork] = useState(
    // Default to env setting or Apothem
    import.meta.env.VITE_NETWORK === 'mainnet'
      ? NETWORKS.MAINNET
      : NETWORKS.APOTHEM
  );
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);
  const [networkError, setNetworkError] = useState(null);

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

  return (
    <NetworkContext.Provider
      value={{
        currentNetwork,
        networks: NETWORKS,
        switchNetwork,
        isNetworkSwitching,
        networkError,
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
