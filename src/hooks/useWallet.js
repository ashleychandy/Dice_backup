import { useReducer, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';

// Utils and constants
import { SUPPORTED_CHAIN_IDS } from '../config';
import {
  validateNetwork,
  initializeContracts,
  switchNetwork,
} from '../utils/walletUtils.js';
import { useNotification } from '../contexts/NotificationContext.jsx';
import { useErrorHandler } from './useErrorHandler';
import { useLoadingState } from './useLoadingState';
import {
  walletReducer,
  initialWalletState,
  walletActionTypes,
} from '../reducers/walletReducer';

/**
 * Custom hook for wallet functionality
 * @returns {Object} Wallet state and functions
 */
export const useWalletState = () => {
  const { addToast } = useNotification();
  const [state, dispatch] = useReducer(walletReducer, initialWalletState);
  const handleError = useErrorHandler(addToast);
  const [isConnecting, withLoading] = useLoadingState(false);

  // Use refs for values that shouldn't trigger re-renders
  const stateRef = useRef(state);
  stateRef.current = state;

  const handleChainChanged = useCallback(
    async newChainId => {
      const chainIdNumber = parseInt(newChainId);
      dispatch({
        type: walletActionTypes.SET_CHAIN_ID,
        payload: chainIdNumber,
      });

      try {
        if (!SUPPORTED_CHAIN_IDS.includes(chainIdNumber)) {
          dispatch({
            type: walletActionTypes.SET_CONTRACTS,
            payload: { token: null, dice: null },
          });
          dispatch({ type: walletActionTypes.SET_PROVIDER, payload: null });
          addToast('Please switch to a supported network', 'warning');
        } else if (stateRef.current.provider && stateRef.current.account) {
          const newProvider = new ethers.BrowserProvider(window.ethereum);
          dispatch({
            type: walletActionTypes.SET_PROVIDER,
            payload: newProvider,
          });

          await validateNetwork(newProvider);
          const contracts = await initializeContracts(
            newProvider,
            stateRef.current.account,
            null,
            state =>
              dispatch({
                type: walletActionTypes.SET_LOADING_STATE,
                payload: state,
              }),
            handleError
          );

          if (contracts) {
            dispatch({
              type: walletActionTypes.SET_CONTRACTS,
              payload: contracts,
            });
          }
          addToast('Network changed successfully', 'success');
        }
      } catch (error) {
        handleError(error, 'handleChainChanged');
        dispatch({ type: walletActionTypes.RESET_STATE });
      }
    },
    [addToast, handleError] // Removed state dependencies
  );

  const connectWallet = useCallback(async () => {
    let abortController = new AbortController();

    try {
      await withLoading(async () => {
        if (abortController.signal.aborted) return;

        if (!window.ethereum) {
          throw new Error('Please install MetaMask to use this application');
        }

        const currentProvider = new ethers.BrowserProvider(window.ethereum);
        dispatch({
          type: walletActionTypes.SET_PROVIDER,
          payload: currentProvider,
        });

        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });

        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts found');
        }

        const network = await currentProvider.getNetwork();
        const currentChainId = Number(network.chainId);

        if (!SUPPORTED_CHAIN_IDS.includes(currentChainId)) {
          dispatch({ type: walletActionTypes.RESET_STATE });
          await switchNetwork(
            'mainnet',
            state =>
              dispatch({
                type: walletActionTypes.SET_LOADING_STATE,
                payload: state,
              }),
            contracts =>
              dispatch({
                type: walletActionTypes.SET_CONTRACTS,
                payload: contracts,
              }),
            accounts[0],
            provider =>
              dispatch({
                type: walletActionTypes.SET_PROVIDER,
                payload: provider,
              }),
            validateNetwork,
            initializeContracts,
            addToast,
            handleError
          );
          return;
        }

        await validateNetwork(currentProvider);
        const contracts = await initializeContracts(
          currentProvider,
          accounts[0],
          null,
          state =>
            dispatch({
              type: walletActionTypes.SET_LOADING_STATE,
              payload: state,
            }),
          handleError
        );

        if (contracts) {
          dispatch({
            type: walletActionTypes.SET_CONTRACTS,
            payload: contracts,
          });
        }
        dispatch({ type: walletActionTypes.SET_ACCOUNT, payload: accounts[0] });
        addToast('Wallet connected successfully!', 'success');
      });
    } catch (err) {
      handleError(err, 'connectWallet');
      dispatch({ type: walletActionTypes.RESET_STATE });
    }

    return () => {
      abortController.abort();
    };
  }, [addToast, handleError, withLoading]);

  const handleLogout = useCallback(() => {
    dispatch({ type: walletActionTypes.RESET_STATE });
    addToast('Logged out successfully', 'success');
  }, [addToast]);

  // Initialize wallet connection
  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();

    const init = async () => {
      if (!window.ethereum) {
        if (mounted) {
          dispatch({
            type: walletActionTypes.SET_LOADING_STATE,
            payload: { provider: false, contracts: false },
          });
        }
        return;
      }

      try {
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        if (!mounted || abortController.signal.aborted) return;

        dispatch({
          type: walletActionTypes.SET_PROVIDER,
          payload: newProvider,
        });

        await validateNetwork(newProvider);
        if (!mounted || abortController.signal.aborted) return;

        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });

        if (accounts && accounts.length > 0 && mounted) {
          dispatch({
            type: walletActionTypes.SET_ACCOUNT,
            payload: accounts[0],
          });
          const contracts = await initializeContracts(
            newProvider,
            accounts[0],
            null,
            state =>
              dispatch({
                type: walletActionTypes.SET_LOADING_STATE,
                payload: state,
              }),
            handleError
          );
          if (contracts && mounted) {
            dispatch({
              type: walletActionTypes.SET_CONTRACTS,
              payload: contracts,
            });
          }
        }
      } catch (error) {
        if (mounted) {
          handleError(error, 'init');
          dispatch({ type: walletActionTypes.RESET_STATE });
        }
      }
    };

    init();

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [handleError]);

  // Handle account and chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = accounts => {
      if (accounts.length === 0) {
        dispatch({ type: walletActionTypes.RESET_STATE });
      } else if (accounts[0] !== stateRef.current.account) {
        dispatch({ type: walletActionTypes.SET_ACCOUNT, payload: accounts[0] });
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [handleChainChanged]);

  return {
    ...state,
    isConnecting,
    connectWallet,
    handleLogout,
    handleError,
  };
};

export default useWalletState;
