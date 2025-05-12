import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useWallet } from '../components/wallet/WalletProvider';
import { NETWORK_CONFIG } from '../config';

// Define available networks - use the same structure as NETWORK_CONFIG
export const NETWORKS = {
  MAINNET: {
    id: 'mainnet',
    name: 'XDC Mainnet',
    rpc: import.meta.env.VITE_XDC_MAINNET_RPC,
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
    rpc: import.meta.env.VITE_XDC_APOTHEM_RPC,
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

// Create the context
const NetworkContext = createContext(null);

// Provider component
export const NetworkProvider = ({ children }) => {
  const { provider, chainId } = useWallet();
  const [currentNetwork, setCurrentNetwork] = useState(NETWORKS.APOTHEM);
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  const [lastChainId, setLastChainId] = useState(null);

  // A function to set the current network based on a chain ID
  const updateNetworkFromChainId = useCallback(chainId => {
    if (chainId === 50) {
      console.log('Setting current network to MAINNET from chain ID 50');
      setCurrentNetwork(NETWORKS.MAINNET);
    } else if (chainId === 51) {
      console.log('Setting current network to APOTHEM from chain ID 51');
      setCurrentNetwork(NETWORKS.APOTHEM);
    } else {
      console.warn(`Unrecognized chain ID: ${chainId}, defaulting to APOTHEM`);
    }
    setLastChainId(chainId);
  }, []);

  // Set the initial network based on the wallet's chainId
  useEffect(() => {
    if (chainId && chainId !== lastChainId) {
      console.log(`Chain ID updated from wallet: ${chainId}`);
      updateNetworkFromChainId(chainId);
    }
  }, [chainId, lastChainId, updateNetworkFromChainId]);

  // Detect the current network from provider when available
  useEffect(() => {
    const detectNetwork = async () => {
      if (!provider) return;

      // Check if we're in a potential reload loop
      try {
        const recentReload = sessionStorage.getItem('xdc_recent_reload');
        const reloadTimestamp = parseInt(recentReload || '0');
        const now = Date.now();

        // If we've reloaded very recently, delay network detection
        if (recentReload && now - reloadTimestamp < 3000) {
          console.log('Delaying network detection after recent reload');
          // Set a small timeout to check later
          setTimeout(() => detectNetwork(), 3000);
          return;
        }
      } catch (e) {
        console.warn('Error checking session storage:', e);
      }

      try {
        const network = await provider.getNetwork();
        const detectedChainId = network.chainId;

        // Only update if different from the current
        if (detectedChainId !== lastChainId) {
          console.log(`Detected network with chain ID: ${detectedChainId}`);
          updateNetworkFromChainId(detectedChainId);
        }
      } catch (error) {
        console.error('Failed to detect network:', error);
      }
    };

    detectNetwork();
  }, [provider, lastChainId, updateNetworkFromChainId]);

  // Listen for chain changes directly from window.ethereum
  useEffect(() => {
    if (!window.ethereum) return;

    const handleEthChainChanged = hexChainId => {
      const newChainId = parseInt(hexChainId, 16);
      console.log(
        `Ethereum chain changed event: ${hexChainId} (${newChainId})`
      );

      if (newChainId !== lastChainId) {
        updateNetworkFromChainId(newChainId);

        // Reset network switching state if we were in the middle of switching
        if (isNetworkSwitching) {
          console.log('Completing network switch due to chain changed event');
          setIsNetworkSwitching(false);
        }
      }
    };

    window.ethereum.on('chainChanged', handleEthChainChanged);
    return () => {
      window.ethereum.removeListener('chainChanged', handleEthChainChanged);
    };
  }, [lastChainId, isNetworkSwitching, updateNetworkFromChainId]);

  // Switch network function with improved reliability
  const switchNetwork = async targetNetworkId => {
    try {
      // Start by setting state and clearing errors
      setIsNetworkSwitching(true);
      setNetworkError(null);

      // Log the attempt for debugging
      console.log(`Attempting to switch to network ID: ${targetNetworkId}`);

      // Check if wallet is connected
      if (!window.ethereum) {
        throw new Error(
          'No wallet detected. Please install MetaMask or XDCPay extension.'
        );
      }

      // Determine target network
      const targetNetwork =
        targetNetworkId === 'mainnet' ? NETWORKS.MAINNET : NETWORKS.APOTHEM;

      // Validate the target network
      if (!targetNetwork) {
        throw new Error(`Invalid network ID: ${targetNetworkId}`);
      }

      // Prepare chain ID in both formats
      const chainIdHex = `0x${targetNetwork.chainId.toString(16)}`;
      const chainIdDecimal = targetNetwork.chainId;

      // Step 1: First try to directly check if we're already on this network
      let currentChainId;
      try {
        currentChainId = await window.ethereum.request({
          method: 'eth_chainId',
        });
        const currentDecimalChainId = parseInt(currentChainId, 16);

        if (currentDecimalChainId === chainIdDecimal) {
          console.log(
            `Already on network ${targetNetwork.name}, no switch needed`
          );

          // Make sure our state is correct
          updateNetworkFromChainId(chainIdDecimal);
          setNetworkError(null);
          setIsNetworkSwitching(false);
          return true;
        }
      } catch (checkError) {
        console.warn(
          'Error checking current chain, will proceed with switch attempt',
          checkError
        );
      }

      // Step 2: Try switching with the standard method
      try {
        console.log(
          `Switching to ${targetNetwork.name} using wallet_switchEthereumChain`
        );
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });

        // Success! Store preference but DON'T update the network state yet
        // The chainChanged event will handle that to ensure it's in sync
        console.log(
          `Switch request to ${targetNetwork.name} sent successfully`
        );
        localStorage.setItem('preferredNetwork', targetNetworkId);

        // Set a timeout to prevent the UI from being stuck if the chain change event doesn't fire
        setTimeout(() => {
          if (isNetworkSwitching) {
            console.log('Network switch timeout reached, forcing state update');
            updateNetworkFromChainId(chainIdDecimal);
            setIsNetworkSwitching(false);
          }
        }, 3000);

        return true;
      } catch (switchError) {
        // Chain not in wallet, need to add it first
        if (
          switchError.code === 4902 ||
          switchError.message.includes('Unrecognized chain')
        ) {
          console.log('Network not found in wallet, attempting to add it...');

          try {
            console.log(`Adding ${targetNetwork.name} to wallet`);
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: chainIdHex,
                  chainName: targetNetwork.name,
                  nativeCurrency: {
                    name: 'XDC',
                    symbol: 'XDC',
                    decimals: 18,
                  },
                  rpcUrls: [targetNetwork.rpc],
                  blockExplorerUrls: [targetNetwork.explorer],
                },
              ],
            });

            // After adding, try switching again (once)
            try {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chainIdHex }],
              });

              // Success after adding network
              console.log(
                `Successfully switched to ${targetNetwork.name} after adding it`
              );
              localStorage.setItem('preferredNetwork', targetNetworkId);

              // Again, let the chain changed event handle the state update
              setTimeout(() => {
                if (isNetworkSwitching) {
                  console.log(
                    'Network switch timeout reached after adding chain, forcing state update'
                  );
                  updateNetworkFromChainId(chainIdDecimal);
                  setIsNetworkSwitching(false);
                }
              }, 3000);

              return true;
            } catch (secondSwitchError) {
              // User may have rejected the second request
              if (secondSwitchError.code === 4001) {
                throw new Error(
                  'Network switch was rejected. Please try again.'
                );
              }

              // Other error after adding network
              throw new Error(
                `Error switching after adding network: ${secondSwitchError.message}`
              );
            }
          } catch (addError) {
            // User rejected adding the network
            if (addError.code === 4001) {
              throw new Error('Adding network was rejected. Please try again.');
            }

            // Other error adding network
            throw new Error(`Error adding network: ${addError.message}`);
          }
        }

        // User rejected the switch request
        if (
          switchError.code === 4001 ||
          switchError.message.includes('User rejected')
        ) {
          throw new Error('Network switch was rejected. Please try again.');
        }

        // Other switch errors
        throw new Error(`Error switching network: ${switchError.message}`);
      }
    } catch (error) {
      console.error('Network switch error:', error);

      // Format user-friendly error message
      let errorMessage = 'Failed to switch network.';

      if (error.message) {
        if (error.message.includes('rejected')) {
          errorMessage =
            'Network switch was rejected. Please approve the request in your wallet.';
        } else if (error.message.includes('Unrecognized chain')) {
          errorMessage = `The network is not configured in your wallet. Please add ${targetNetworkId === 'mainnet' ? 'XDC Mainnet' : 'Apothem Testnet'} manually.`;
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      setNetworkError(errorMessage);
      setIsNetworkSwitching(false);
      return false;
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
