import { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { ethers } from 'ethers';

// Utils and constants
import { SUPPORTED_CHAIN_IDS } from '../config';
import {
  validateNetwork,
  initializeContracts,
  switchNetwork,
  getAvailableProvider,
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
 * @param {Object} queryClient - The React Query client instance
 * @returns {Object} Wallet state and functions
 */
export const useWalletImplementation = queryClient => {
  const { addToast } = useNotification();
  const [state, dispatch] = useReducer(walletReducer, initialWalletState);
  const handleError = useErrorHandler(addToast);
  const [isConnecting, withLoading] = useLoadingState(false);
  const stateRef = useRef(state);
  const [initialLoad, setInitialLoad] = useState(true);

  stateRef.current = state;

  const handleChainChanged = useCallback(
    async newChainId => {
      try {
        // Skip excessive chain change processing if we're not connected
        if (!stateRef.current.account) {
          // Still store the new chain ID
          dispatch({
            type: walletActionTypes.SET_CHAIN_ID,
            payload: newChainId,
          });
          return;
        }

        // Parse chain ID to ensure consistent format (in case it comes as hex)
        const chainId = parseInt(
          newChainId,
          isNaN(parseInt(newChainId, 16)) ? 10 : 16
        );

        // Check if this is a supported network
        if (!SUPPORTED_CHAIN_IDS.includes(chainId)) {
          // We can't connect contracts on unsupported networks
          dispatch({
            type: walletActionTypes.SET_CONTRACTS,
            payload: { token: null, dice: null },
          });
          addToast(
            `Unsupported network detected (Chain ID: ${chainId}). Please switch to XDC Mainnet or Apothem Testnet.`,
            'warning'
          );
          return;
        }

        // Network is supported, update the chain ID
        dispatch({
          type: walletActionTypes.SET_CHAIN_ID,
          payload: chainId,
        });

        // Don't proceed if we're already connecting or there's no account
        if (isConnecting || !stateRef.current.account) {
          return;
        }

        // Check if the provider needs to be updated
        let newProvider = stateRef.current.provider;

        // If there's no provider or it might be on a different network,
        // create a fresh provider instance
        if (!newProvider) {
          const walletProvider = getAvailableProvider();
          if (!walletProvider) {
            throw new Error('No wallet provider found');
          }
          newProvider = new ethers.BrowserProvider(walletProvider);
          dispatch({
            type: walletActionTypes.SET_PROVIDER,
            payload: newProvider,
          });
        }

        // Set loading state
        dispatch({
          type: walletActionTypes.SET_LOADING_STATE,
          payload: { wallet: true },
        });

        try {
          // Validate that network is reachable
          const networkValidation = await validateNetwork(newProvider);
          if (!networkValidation.isValid) {
            throw new Error(
              networkValidation.error || 'Failed to connect to network'
            );
          }
        } catch (networkError) {
          handleError(networkError, 'validateNetwork in handleChainChanged');
          // Still keep going and attempt to initialize contracts
        }

        // Don't show success toast on initial load
        const isFirstLoad =
          sessionStorage.getItem('xdc_first_load') !== 'complete';

        if (isFirstLoad) {
          // Mark that first load is complete
          try {
            sessionStorage.setItem('xdc_first_load', 'complete');
          } catch (e) {
            // Ignore storage errors
          }
        }

        // Wrap contract initialization in a timeout to give the network time to stabilize
        // setTimeout(async () => {
        try {
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

            if (!isConnecting && !isFirstLoad) {
              addToast('Network changed successfully', 'success');
            }

            // Use the provided queryClient to invalidate queries
            if (queryClient && stateRef.current.account) {
              queryClient.invalidateQueries([
                'gameHistory',
                stateRef.current.account,
              ]);
            }
          } else {
            if (!isConnecting) {
              addToast(
                'Connected to network, but contracts are not available',
                'warning'
              );
            }
            dispatch({
              type: walletActionTypes.SET_CONTRACTS,
              payload: { token: null, dice: null },
            });
          }
        } catch (contractError) {
          handleError(contractError, 'initializeContracts after chain change');
          dispatch({
            type: walletActionTypes.SET_CONTRACTS,
            payload: { token: null, dice: null },
          });
        }
        // }, 1000); // Small delay to let network stabilize
      } catch (error) {
        handleError(error, 'handleChainChanged');

        // Don't fully reset state for non-critical errors
        if (error.message && error.message.includes('critical')) {
          dispatch({ type: walletActionTypes.RESET_STATE });
        }
      }
    },
    [addToast, handleError, dispatch, queryClient]
  );

  const connectWallet = useCallback(async () => {
    let abortController = new AbortController();

    try {
      await withLoading(async () => {
        if (abortController.signal.aborted) return;

        const walletProvider = getAvailableProvider();
        if (!walletProvider) {
          throw new Error(
            'No wallet detected. Please install MetaMask or another compatible wallet'
          );
        }

        const currentProvider = new ethers.BrowserProvider(walletProvider);
        dispatch({
          type: walletActionTypes.SET_PROVIDER,
          payload: currentProvider,
        });

        // Request wallet connection
        try {
          const accounts = await walletProvider.request({
            method: 'eth_requestAccounts',
          });

          if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found. Please unlock your wallet.');
          }

          const network = await currentProvider.getNetwork();
          const currentChainId = Number(network.chainId);

          // Check if on a supported network
          if (!SUPPORTED_CHAIN_IDS.includes(currentChainId)) {
            dispatch({ type: walletActionTypes.RESET_STATE });

            try {
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
            } catch (switchError) {
              addToast(
                'Network switch failed. Please manually switch to a supported network.',
                'error'
              );
              return;
            }
            return;
          }

          // If we're on a supported network, validate and initialize contracts
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
          dispatch({
            type: walletActionTypes.SET_ACCOUNT,
            payload: accounts[0],
          });

          // Use the provided queryClient to invalidate queries
          if (queryClient && accounts[0]) {
            queryClient.invalidateQueries(['gameHistory', accounts[0]]);
          }

          addToast('Wallet connected successfully!', 'success');
        } catch (connectionError) {
          if (connectionError.code === 4001) {
            // User rejected the connection request
            addToast('Wallet connection was rejected by user', 'warning');
          } else {
            throw connectionError;
          }
        }
      });
    } catch (err) {
      handleError(err, 'connectWallet');
      dispatch({ type: walletActionTypes.RESET_STATE });
    }

    return () => {
      abortController.abort();
    };
  }, [addToast, handleError, withLoading, queryClient]);

  const handleLogout = useCallback(() => {
    dispatch({ type: walletActionTypes.RESET_STATE });
    addToast('Logged out successfully', 'success');
  }, [addToast]);

  // Initialize wallet connection
  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();

    const init = async () => {
      const walletProvider = getAvailableProvider();
      if (!walletProvider) {
        if (mounted) {
          dispatch({
            type: walletActionTypes.SET_LOADING_STATE,
            payload: { provider: false, contracts: false },
          });
        }
        return;
      }

      try {
        const newProvider = new ethers.BrowserProvider(walletProvider);
        if (!mounted || abortController.signal.aborted) return;

        dispatch({
          type: walletActionTypes.SET_PROVIDER,
          payload: newProvider,
        });

        try {
          await validateNetwork(newProvider);
        } catch (networkError) {
          // Silent network validation error on init
          if (mounted) {
            dispatch({
              type: walletActionTypes.SET_LOADING_STATE,
              payload: { provider: false, contracts: false },
            });
          }
          return;
        }

        if (!mounted || abortController.signal.aborted) return;

        // Check if already connected
        const accounts = await walletProvider.request({
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
          } else if (mounted) {
            // If contracts failed to initialize, update loading state
            dispatch({
              type: walletActionTypes.SET_LOADING_STATE,
              payload: { provider: false, contracts: false },
            });
          }
        } else if (mounted) {
          dispatch({
            type: walletActionTypes.SET_LOADING_STATE,
            payload: { provider: false, contracts: false },
          });
        }
      } catch (error) {
        if (mounted) {
          handleError(error, 'init');
          dispatch({
            type: walletActionTypes.SET_LOADING_STATE,
            payload: { provider: false, contracts: false },
          });
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
    const walletProvider = getAvailableProvider();
    if (!walletProvider) return;

    const handleAccountsChanged = accounts => {
      if (accounts.length === 0) {
        dispatch({ type: walletActionTypes.RESET_STATE });
        addToast('Wallet disconnected', 'info');
      } else if (accounts[0] !== stateRef.current.account) {
        dispatch({ type: walletActionTypes.SET_ACCOUNT, payload: accounts[0] });
        addToast('Account changed', 'info');

        // Use the provided queryClient to invalidate queries
        if (queryClient && accounts[0]) {
          queryClient.invalidateQueries(['gameHistory', accounts[0]]);
        }
      }
    };

    walletProvider.on('accountsChanged', handleAccountsChanged);
    walletProvider.on('chainChanged', handleChainChanged);

    // Listen for wallet disconnection event
    const handleDisconnect = _error => {
      // Reset state on disconnection
      dispatch({ type: walletActionTypes.RESET_STATE });
      addToast('Wallet disconnected', 'info');
    };

    walletProvider.on('disconnect', handleDisconnect);

    return () => {
      walletProvider.removeListener('accountsChanged', handleAccountsChanged);
      walletProvider.removeListener('chainChanged', handleChainChanged);
      walletProvider.removeListener('disconnect', handleDisconnect);
    };
  }, [handleChainChanged, addToast, queryClient]);

  const handleSwitchNetwork = useCallback(
    async networkType => {
      try {
        await withLoading(async () => {
          const walletProvider = getAvailableProvider();
          if (!walletProvider) {
            throw new Error(
              'No wallet detected. Please install MetaMask or another compatible wallet'
            );
          }

          await switchNetwork(
            networkType,
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
            state.account,
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
        });
      } catch (err) {
        handleError(err, 'handleSwitchNetwork');
      }
    },
    [state.account, addToast, handleError, withLoading]
  );

  // Check if wallet is connected
  const isWalletConnected = Boolean(state.account);

  // Check if network is supported
  const isNetworkSupported = state.chainId
    ? SUPPORTED_CHAIN_IDS.includes(state.chainId)
    : false;

  // Method to reinitialize contracts when chain changes without page reload
  const reinitializeWithChainId = useCallback(
    async chainId => {
      try {
        // First update the chain ID in state
        dispatch({
          type: walletActionTypes.SET_CHAIN_ID,
          payload: chainId,
        });

        // Only proceed if we have a provider and account
        if (!state.provider || !state.account) {
          return false;
        }

        // Set loading state
        dispatch({
          type: walletActionTypes.SET_LOADING_STATE,
          payload: { wallet: true },
        });

        // Check if this is a supported network
        if (!SUPPORTED_CHAIN_IDS.includes(chainId)) {
          // Clear contracts for unsupported networks
          dispatch({
            type: walletActionTypes.SET_CONTRACTS,
            payload: { token: null, dice: null },
          });

          addToast(
            `Network ID ${chainId} is not supported. Please switch to XDC Mainnet or Apothem Testnet.`,
            'warning'
          );

          // End loading state
          dispatch({
            type: walletActionTypes.SET_LOADING_STATE,
            payload: { wallet: false },
          });

          return false;
        }

        // Get the available wallet provider
        const walletProvider = getAvailableProvider();
        if (!walletProvider) {
          throw new Error('Wallet provider not found');
        }

        // Create a new provider with the new chain ID
        const newProvider = new ethers.BrowserProvider(walletProvider);

        // Update provider in state
        dispatch({
          type: walletActionTypes.SET_PROVIDER,
          payload: newProvider,
        });

        // Validate the network
        const networkValidation = await validateNetwork(newProvider);
        if (!networkValidation.isValid) {
          addToast(
            `Network connection issue: ${networkValidation.error || 'Unknown error'}. Please try again.`,
            'warning'
          );

          // Clear contracts
          dispatch({
            type: walletActionTypes.SET_CONTRACTS,
            payload: { token: null, dice: null },
          });

          // End loading state
          dispatch({
            type: walletActionTypes.SET_LOADING_STATE,
            payload: { wallet: false },
          });

          return false;
        }

        // Initialize contracts with the new provider and account
        const contracts = await initializeContracts(
          newProvider,
          state.account,
          null,
          loadingState =>
            dispatch({
              type: walletActionTypes.SET_LOADING_STATE,
              payload: loadingState,
            }),
          handleError
        );

        if (!contracts) {
          addToast(
            'Connected to network, but contracts are not available',
            'warning'
          );

          // Clear contracts
          dispatch({
            type: walletActionTypes.SET_CONTRACTS,
            payload: { token: null, dice: null },
          });

          // End loading state
          dispatch({
            type: walletActionTypes.SET_LOADING_STATE,
            payload: { wallet: false },
          });

          return false;
        }

        // Update contracts in state
        dispatch({
          type: walletActionTypes.SET_CONTRACTS,
          payload: contracts,
        });

        // End loading state
        dispatch({
          type: walletActionTypes.SET_LOADING_STATE,
          payload: { wallet: false },
        });

        // Invalidate queries to refresh data
        if (queryClient && state.account) {
          queryClient.invalidateQueries(['balance', state.account]);
          queryClient.invalidateQueries(['gameHistory', state.account]);
        }

        // Only show success toast if this is not the initial page load
        const isInitialLoad = initialLoad;
        if (isInitialLoad) {
          setInitialLoad(false); // No longer initial load
        } else {
          addToast('Network changed successfully', 'success');
        }

        return true;
      } catch (error) {
        handleError(error, 'reinitializeWithChainId');

        // End loading state
        dispatch({
          type: walletActionTypes.SET_LOADING_STATE,
          payload: { wallet: false },
        });

        return false;
      }
    },
    [
      state.provider,
      state.account,
      handleError,
      addToast,
      queryClient,
      dispatch,
      initialLoad,
    ]
  );

  return {
    ...state,
    isConnecting,
    isWalletConnected,
    isNetworkSupported,
    connectWallet,
    handleLogout,
    handleError,
    handleSwitchNetwork,
    reinitializeWithChainId,
  };
};

export default useWalletImplementation;

// This is just a placeholder. The actual useWallet is exported from WalletProvider
export const useWallet = () => {
  throw new Error(
    'IMPORT ERROR: useWallet should be imported from "../components/wallet/WalletProvider" instead of directly from useWallet.js. Please update your import statement.'
  );
};
