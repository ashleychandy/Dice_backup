import React, { createContext, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useWalletConnection } from '../../hooks/useWalletConnection';
import { useNetworkValidation } from '../../hooks/useNetworkValidation';
import { useContractInitialization } from '../../hooks/useContractInitialization';
import { useNotification } from '../../contexts/NotificationContext';
import { SUPPORTED_CHAIN_IDS } from '../../config';

// Create context
const WalletContext = createContext(null);

/**
 * Custom hook to use wallet context
 */
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

/**
 * Wallet Provider Component
 */
export const WalletProvider = ({ children, contractConfigs }) => {
  // Initialize hooks
  const {
    provider,
    account,
    chainId,
    isConnecting,
    error: walletError,
    connectWallet,
    disconnectWallet,
    isConnected,
    isSupported,
  } = useWalletConnection();

  const {
    validateNetwork,
    switchNetwork,
    getNetworkInfo,
    isValidating,
    error: networkError,
  } = useNetworkValidation();

  const {
    initializeContract,
    initializeContracts,
    clearCache,
    status: contractStatus,
    error: contractError,
    isInitializing,
    isInitialized,
  } = useContractInitialization();

  const { addToast } = useNotification();

  // Handle initial setup and network validation
  useEffect(() => {
    const setupWallet = async () => {
      if (!provider || !chainId) return;

      try {
        // Validate current network
        const validation = await validateNetwork(provider, chainId);

        if (!validation.isValid) {
          if (SUPPORTED_CHAIN_IDS[0]) {
            // Try to switch to the first supported network
            await switchNetwork(provider, SUPPORTED_CHAIN_IDS[0]);
          } else {
            addToast('Please switch to a supported network', 'warning');
          }
          return;
        }

        // Initialize contracts if we have configs and are on a valid network
        if (contractConfigs && account) {
          await initializeContracts(contractConfigs, provider);
        }
      } catch (error) {
        console.error('Wallet setup error:', error);
        addToast(error.message, 'error');
      }
    };

    setupWallet();
  }, [
    provider,
    chainId,
    account,
    validateNetwork,
    switchNetwork,
    initializeContracts,
    contractConfigs,
    addToast,
  ]);

  // Handle contract cleanup on network change
  useEffect(() => {
    if (chainId) {
      clearCache();
    }
  }, [chainId, clearCache]);

  // Combine all errors
  const errors = [walletError, networkError, contractError].filter(Boolean);

  // Prepare context value
  const value = {
    // Wallet state
    provider,
    account,
    chainId,
    isConnected,
    isSupported,

    // Network state and functions
    isValidating,
    validateNetwork,
    switchNetwork,
    getNetworkInfo,

    // Contract state and functions
    contractStatus,
    isInitializing,
    isInitialized,
    initializeContract,
    initializeContracts,
    clearContractCache: clearCache,

    // Loading states
    isLoading: isConnecting || isValidating || isInitializing,

    // Error states
    errors,
    hasErrors: errors.length > 0,

    // Actions
    connect: connectWallet,
    disconnect: disconnectWallet,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

// PropTypes
WalletProvider.propTypes = {
  children: PropTypes.node.isRequired,
  contractConfigs: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      address: PropTypes.string.isRequired,
      abi: PropTypes.array.isRequired,
    })
  ),
};

export default WalletProvider;
