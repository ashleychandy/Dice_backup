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
    const mainnetConfig = NETWORK_CONFIG.mainnet;
    if (!mainnetConfig.contracts.dice) {
      console.warn('Mainnet Dice contract address is not configured');
      if (DEFAULT_NETWORK === 'mainnet') {
        addToast(
          'Mainnet Dice contract is not configured. Some features may not work.',
          'warning'
        );
      }
    }

    // Check testnet configuration
    const testnetConfig = NETWORK_CONFIG.apothem;
    if (!testnetConfig.contracts.dice) {
      console.warn('Testnet Dice contract address is not configured');
      if (DEFAULT_NETWORK === 'apothem') {
        addToast(
          'Testnet Dice contract is not configured. Some features may not work.',
          'warning'
        );
      }
    }
  }, [addToast]);

  return (
    <WalletContext.Provider value={walletState}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
