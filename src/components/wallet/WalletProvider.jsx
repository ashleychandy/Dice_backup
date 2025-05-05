import React, { createContext, useContext, useEffect } from 'react';

// Custom hooks
import useWalletState from '../../hooks/useWallet';
import { useNotification } from '../../contexts/NotificationContext.jsx';
import { NETWORK_CONFIG, DEFAULT_NETWORK } from '../../config';

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
