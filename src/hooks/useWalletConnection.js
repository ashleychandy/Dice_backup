import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useNotification } from '../contexts/NotificationContext';
import { SUPPORTED_CHAIN_IDS } from '../config';

// Add error types
const WALLET_ERRORS = {
  NO_PROVIDER: 'NO_PROVIDER',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  NO_ACCOUNTS: 'NO_ACCOUNTS',
  USER_REJECTED: 'USER_REJECTED',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
};

/**
 * Hook for managing wallet connection state and operations
 * Separates wallet connection logic from other concerns
 */
export const useWalletConnection = () => {
  const [state, setState] = useState({
    provider: null,
    account: null,
    chainId: null,
    isConnecting: false,
    error: null,
    errorType: null,
  });

  const { addToast } = useNotification();
  const stateRef = useRef(state);
  stateRef.current = state;

  // Get available provider (MetaMask, etc.)
  const getAvailableProvider = useCallback(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return window.ethereum;
    }
    return null;
  }, []);

  // Initialize provider with error handling
  const initializeProvider = useCallback(async walletProvider => {
    try {
      const provider = new ethers.BrowserProvider(walletProvider);
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      return { provider, chainId };
    } catch (error) {
      console.error('Provider initialization error:', error);
      throw new Error('Failed to initialize provider');
    }
  }, []);

  // Connect wallet with comprehensive error handling
  const connectWallet = useCallback(async () => {
    if (state.isConnecting) return;

    try {
      setState(prev => ({
        ...prev,
        isConnecting: true,
        error: null,
        errorType: null,
      }));

      const walletProvider = getAvailableProvider();
      if (!walletProvider) {
        throw {
          type: WALLET_ERRORS.NO_PROVIDER,
          message:
            'No wallet detected. Please install MetaMask or another compatible wallet',
        };
      }

      // Request accounts with timeout
      const accountsPromise = walletProvider.request({
        method: 'eth_requestAccounts',
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject({
              type: WALLET_ERRORS.CONNECTION_TIMEOUT,
              message: 'Connection request timed out',
            }),
          30000
        )
      );

      const accounts = await Promise.race([accountsPromise, timeoutPromise]);

      if (!accounts || accounts.length === 0) {
        throw {
          type: WALLET_ERRORS.NO_ACCOUNTS,
          message: 'No accounts found. Please unlock your wallet.',
        };
      }

      const { provider, chainId } = await initializeProvider(walletProvider);

      setState(prev => ({
        ...prev,
        provider,
        account: accounts[0],
        chainId,
        isConnecting: false,
        error: null,
        errorType: null,
      }));

      addToast('Wallet connected successfully!', 'success');
      return { provider, account: accounts[0], chainId };
    } catch (error) {
      console.error('Wallet connection error:', error);

      let errorType = WALLET_ERRORS.PROVIDER_ERROR;
      let errorMessage = 'Failed to connect wallet';

      if (error.code === 4001) {
        errorType = WALLET_ERRORS.USER_REJECTED;
        errorMessage = 'Connection rejected by user';
      } else if (error.type) {
        errorType = error.type;
        errorMessage = error.message;
      }

      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
        errorType,
      }));

      addToast(errorMessage, 'error');
      throw { type: errorType, message: errorMessage };
    }
  }, [state.isConnecting, getAvailableProvider, initializeProvider, addToast]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setState({
      provider: null,
      account: null,
      chainId: null,
      isConnecting: false,
      error: null,
      errorType: null,
    });
    addToast('Wallet disconnected', 'info');
  }, [addToast]);

  // Handle account changes
  const handleAccountsChanged = useCallback(
    accounts => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== stateRef.current.account) {
        setState(prev => ({
          ...prev,
          account: accounts[0],
        }));
        addToast('Account changed', 'info');
      }
    },
    [disconnectWallet, addToast]
  );

  // Handle chain changes with enhanced error handling
  const handleChainChanged = useCallback(
    async newChainId => {
      try {
        const chainIdNumber = parseInt(newChainId);
        console.log(`Chain changed to: ${chainIdNumber}`);

        if (!SUPPORTED_CHAIN_IDS.includes(chainIdNumber)) {
          const error = {
            type: WALLET_ERRORS.NETWORK_ERROR,
            message: `Network ID ${chainIdNumber} is not supported. Please switch to a supported network.`,
          };
          setState(prev => ({
            ...prev,
            error: error.message,
            errorType: error.type,
          }));
          addToast(error.message, 'warning');
        }

        const walletProvider = getAvailableProvider();
        if (walletProvider) {
          const { provider } = await initializeProvider(walletProvider);
          setState(prev => ({
            ...prev,
            provider,
            chainId: chainIdNumber,
            error: null,
            errorType: null,
          }));
        }
      } catch (error) {
        console.error('Chain change handling error:', error);
        setState(prev => ({
          ...prev,
          error: 'Error handling network change',
          errorType: WALLET_ERRORS.NETWORK_ERROR,
        }));
        addToast('Error handling network change', 'error');
      }
    },
    [getAvailableProvider, initializeProvider, addToast]
  );

  // Set up event listeners
  useEffect(() => {
    const walletProvider = getAvailableProvider();
    if (!walletProvider) return;

    walletProvider.on('accountsChanged', handleAccountsChanged);
    walletProvider.on('chainChanged', handleChainChanged);
    walletProvider.on('disconnect', disconnectWallet);

    return () => {
      walletProvider.removeListener('accountsChanged', handleAccountsChanged);
      walletProvider.removeListener('chainChanged', handleChainChanged);
      walletProvider.removeListener('disconnect', disconnectWallet);
    };
  }, [
    handleAccountsChanged,
    handleChainChanged,
    disconnectWallet,
    getAvailableProvider,
  ]);

  // Auto-connect if previously connected
  useEffect(() => {
    const attemptAutoConnect = async () => {
      try {
        const walletProvider = getAvailableProvider();
        if (!walletProvider) return;

        const accounts = await walletProvider.request({
          method: 'eth_accounts',
        });
        if (accounts && accounts.length > 0) {
          const { provider, chainId } =
            await initializeProvider(walletProvider);
          setState(prev => ({
            ...prev,
            provider,
            account: accounts[0],
            chainId,
          }));
        }
      } catch (error) {
        console.error('Auto-connect error:', error);
      }
    };

    attemptAutoConnect();
  }, [getAvailableProvider, initializeProvider]);

  return {
    ...state,
    connectWallet,
    disconnectWallet,
    isConnected: !!state.account,
    isSupported: state.chainId
      ? SUPPORTED_CHAIN_IDS.includes(state.chainId)
      : false,
    errorType: state.errorType,
  };
};
