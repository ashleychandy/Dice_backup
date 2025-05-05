import React, { createContext, useContext, useEffect, useState } from 'react';

// Custom hooks
import useWalletState from '../../hooks/useWallet';
import { useNotification } from '../../contexts/NotificationContext.jsx';
import { NETWORK_CONFIG, DEFAULT_NETWORK } from '../../config';
import { checkRpcHealth } from '../../utils/walletUtils';

// Create context
const WalletContext = createContext(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  // Use our custom hook for all wallet functionality
  const walletState = useWalletState();
  const { addToast } = useNotification();
  const [networkHealth, setNetworkHealth] = useState({
    mainnet: { checked: false, ok: false },
    apothem: { checked: false, ok: false },
  });

  // Debug logging for wallet state
  useEffect(() => {
    console.log('Wallet State:', {
      account: walletState.account || 'Not connected',
      chainId: walletState.chainId || 'Unknown',
      tokenContract: walletState.contracts?.token?.target || 'Not initialized',
      diceContract: walletState.contracts?.dice?.target || 'Not initialized',
      isWalletConnected: walletState.isWalletConnected || false,
    });
  }, [walletState]);

  // Check RPC endpoints health
  useEffect(() => {
    const checkEndpointsHealth = async () => {
      try {
        // Check mainnet
        const mainnetUrl = NETWORK_CONFIG.mainnet.rpcUrl;
        const mainnetHealth = await checkRpcHealth(mainnetUrl);

        // Check testnet
        const apothemUrl = NETWORK_CONFIG.apothem.rpcUrl;
        const apothemHealth = await checkRpcHealth(apothemUrl);

        setNetworkHealth({
          mainnet: {
            checked: true,
            ok: mainnetHealth.ok,
            error: mainnetHealth.error,
          },
          apothem: {
            checked: true,
            ok: apothemHealth.ok,
            error: apothemHealth.error,
          },
        });

        // Show warnings if RPC endpoints are down
        if (!mainnetHealth.ok && !apothemHealth.ok) {
          console.error('Both RPC endpoints are not responding:', {
            mainnet: mainnetHealth.error,
            apothem: apothemHealth.error,
          });

          if (
            mainnetHealth.error?.includes('blocked by CORS policy') ||
            apothemHealth.error?.includes('blocked by CORS policy')
          ) {
            addToast(
              'Network connection issues detected (CORS error). This is a browser security restriction. Try using a browser extension like CORS Unblock or run the app with the correct proxy settings.',
              'error'
            );
          } else {
            addToast(
              'XDC network RPC endpoints are not responding. Please try again later or check your internet connection.',
              'error'
            );
          }
        } else if (!mainnetHealth.ok) {
          console.warn(
            'Mainnet RPC endpoint is not responding:',
            mainnetHealth.error
          );
        } else if (!apothemHealth.ok) {
          console.warn(
            'Apothem RPC endpoint is not responding:',
            apothemHealth.error
          );
        }
      } catch (error) {
        console.error('Error checking RPC health:', error);
      }
    };

    checkEndpointsHealth();
  }, [addToast]);

  // Check if contract addresses are properly configured
  useEffect(() => {
    // Check mainnet configuration
    const mainnetConfig = NETWORK_CONFIG?.mainnet;
    if (!mainnetConfig?.contracts?.dice) {
      console.warn('Mainnet Dice contract address is not configured');
      if (DEFAULT_NETWORK === 'mainnet') {
        addToast(
          'Mainnet Dice contract is not configured. Some features may not work.',
          'warning'
        );
      }
    }

    // Check testnet configuration
    const testnetConfig = NETWORK_CONFIG?.apothem;
    if (!testnetConfig?.contracts?.dice) {
      console.warn('Testnet Dice contract address is not configured');
      if (DEFAULT_NETWORK === 'apothem') {
        addToast(
          'Testnet Dice contract is not configured. Some features may not work.',
          'warning'
        );
      }
    }
  }, [addToast]);

  // Create an enhanced state object with better error handling
  const enhancedWalletState = {
    ...walletState,
    // Add network health information
    networkHealth,
    // Add safe contract access methods
    getTokenContract: () => {
      if (!walletState.contracts?.token) {
        console.warn('Token contract not available');
        return null;
      }
      return walletState.contracts.token;
    },
    getDiceContract: () => {
      if (!walletState.contracts?.dice) {
        console.warn('Dice contract not available');
        return null;
      }
      return walletState.contracts.dice;
    },
    // Enhanced error handler that shows meaningful messages
    handleErrorWithToast: (error, context = '') => {
      console.error(`Wallet error in ${context}:`, error);

      // CORS-related errors
      if (error?.message && error.message.includes('CORS')) {
        addToast(
          'Network connection blocked by browser security (CORS). Please use a CORS proxy or browser extension.',
          'error'
        );
        return;
      }

      // Handle missing revert data errors (common RPC issue)
      if (error?.message && error.message.includes('missing revert data')) {
        addToast(
          'Network connection error: Unable to read blockchain data. This usually indicates an RPC endpoint issue. Try refreshing the page or switching to a different network.',
          'error'
        );
        return;
      }

      // User-denied transaction
      if (
        error?.code === 4001 ||
        (error?.message && error.message.includes('rejected'))
      ) {
        addToast('Transaction rejected by user', 'warning');
        return;
      }

      // Gas-related errors
      if (error?.message && error.message.includes('insufficient funds')) {
        addToast('Insufficient XDC for gas fees', 'error');
        return;
      }

      // Network errors
      if (
        error?.message &&
        (error.message.includes('network') ||
          error.message.includes('disconnect'))
      ) {
        addToast(
          'Network connection issue. Please check your connection and try again.',
          'error'
        );
        return;
      }

      // Contract-related errors
      if (error?.message && error.message.includes('execution reverted')) {
        addToast(
          'Transaction reverted by the contract. This may be due to game rules or contract restrictions.',
          'error'
        );
        return;
      }

      // Unknown errors
      addToast(error?.message || 'An unknown error occurred', 'error');
    },
  };

  return (
    <WalletContext.Provider value={enhancedWalletState}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
