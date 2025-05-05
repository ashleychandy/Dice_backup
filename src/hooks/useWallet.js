import { useReducer, useEffect, useCallback, useRef } from 'react';
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
export const useWallet = queryClient => {
  const { addToast } = useNotification();
  const [state, dispatch] = useReducer(walletReducer, initialWalletState);
  const handleError = useErrorHandler(addToast);
  const [isConnecting, withLoading] = useLoadingState(false);

  // Use refs for values that shouldn't trigger re-renders
  const stateRef = useRef(state);
  stateRef.current = state;

  // Add ref to queryClient for data refetching
  // const queryClientRef = useRef(null);

  // Try to get queryClient from React Query
  // useEffect(() => {
  //   try {
  //     // Dynamically import to avoid circular dependencies
  //     import('@tanstack/react-query')
  //       .then(module => {
  //         // Don't use hooks inside a regular function
  //         // Instead, assign the module to a ref and use it directly
  //         queryClientRef.current = module;

  //         // Check if we can get the existing React Query client
  //         if (
  //           typeof window !== 'undefined' &&
  //           window.__REACT_QUERY_GLOBAL_CLIENT__
  //         ) {
  //           console.log('Found React Query client from global context');
  //           return window.__REACT_QUERY_GLOBAL_CLIENT__;
  //         }

  //         console.log('No queryClient available from context');
  //       })
  //       .catch(e => console.error('Could not import react-query:', e));
  //   } catch (e) {
  //     console.error('Error accessing query client:', e);
  //   }
  // }, []);

  const handleChainChanged = useCallback(
    async newChainId => {
      try {
        const chainIdNumber = parseInt(newChainId);
        console.log(`Chain changed to: ${chainIdNumber}`);

        dispatch({
          type: walletActionTypes.SET_CHAIN_ID,
          payload: chainIdNumber,
        });

        // If we're in the middle of connecting, don't show unnecessary messages
        const isCurrentlyConnecting = stateRef.current.isConnecting;

        if (!SUPPORTED_CHAIN_IDS.includes(chainIdNumber)) {
          dispatch({
            type: walletActionTypes.SET_CONTRACTS,
            payload: { token: null, dice: null },
          });

          if (!isCurrentlyConnecting) {
            addToast(
              `Network ID ${chainIdNumber} is not supported. Please switch to XDC Mainnet or Apothem Testnet.`,
              'warning'
            );
          }

          // Don't try to reconnect provider on unsupported networks
          return;
        }

        // Only proceed with reconnection if the user's wallet is connected
        if (stateRef.current.provider && stateRef.current.account) {
          // Show "connecting" toast for better UX
          if (!isCurrentlyConnecting) {
            addToast('Connecting to new network...', 'info');
          }

          try {
            const walletProvider = getAvailableProvider();
            if (!walletProvider) {
              throw new Error('Wallet provider not found');
            }

            // Create new provider with the new chain
            const newProvider = new ethers.BrowserProvider(walletProvider);
            dispatch({
              type: walletActionTypes.SET_PROVIDER,
              payload: newProvider,
            });

            // Validate network and reinitialize contracts
            const networkValidation = await validateNetwork(newProvider);

            if (!networkValidation.isValid) {
              console.warn('Network validation failed:', networkValidation);
              if (networkValidation.error && !isCurrentlyConnecting) {
                addToast(
                  `Network connection issue: ${networkValidation.error}. Please try again.`,
                  'warning'
                );
              }
              // Don't return here, still need to reset contracts if network is invalid
              dispatch({
                type: walletActionTypes.SET_CONTRACTS,
                payload: { token: null, dice: null },
              });
              return;
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

                if (!isCurrentlyConnecting) {
                  addToast('Network changed successfully', 'success');
                }

                // Use the provided queryClient to invalidate queries
                if (queryClient && stateRef.current.account) {
                  queryClient.invalidateQueries([
                    'gameHistory',
                    stateRef.current.account,
                  ]);
                  console.log(
                    'Invalidated game history for account after chain change:',
                    stateRef.current.account
                  );
                }
              } else {
                console.warn('No contracts returned after network change');
                if (!isCurrentlyConnecting) {
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
              console.error(
                'Error initializing contracts after chain change:',
                contractError
              );
              handleError(
                contractError,
                'initializeContracts after chain change'
              );
              dispatch({
                type: walletActionTypes.SET_CONTRACTS,
                payload: { token: null, dice: null },
              });
            }
            // }, 1000); // Small delay to let network stabilize
          } catch (providerError) {
            console.error(
              'Error reconnecting after chain change:',
              providerError
            );
            handleError(providerError, 'reconnectProvider');

            // Only reset state if we failed to reconnect with a severe error
            if (
              providerError.message &&
              !providerError.message.includes('timeout')
            ) {
              dispatch({ type: walletActionTypes.RESET_STATE });
            }
          }
        }
      } catch (error) {
        console.error('Error handling chain change:', error);
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
            console.log(
              'Invalidated game history for account after connect:',
              accounts[0]
            );
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
          console.error('Network validation error:', networkError);
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
          console.log('Connected account found:', accounts[0]);
          dispatch({
            type: walletActionTypes.SET_ACCOUNT,
            payload: accounts[0],
          });

          console.log('Initializing contracts for account:', accounts[0]);
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

          console.log('Contract initialization result:', contracts);
          if (contracts && mounted) {
            dispatch({
              type: walletActionTypes.SET_CONTRACTS,
              payload: contracts,
            });
          } else {
            console.error('Failed to initialize contracts.');
          }
        } else if (mounted) {
          console.log('No connected accounts found.');
          dispatch({
            type: walletActionTypes.SET_LOADING_STATE,
            payload: { provider: false, contracts: false },
          });
        }
      } catch (error) {
        if (mounted) {
          console.error('Wallet initialization error:', error);
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
          console.log(
            'Invalidated game history for account after account change:',
            accounts[0]
          );
        }
      }
    };

    walletProvider.on('accountsChanged', handleAccountsChanged);
    walletProvider.on('chainChanged', handleChainChanged);

    // Listen for wallet disconnection event
    const handleDisconnect = error => {
      console.log('Wallet disconnected', error);
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

  return {
    ...state,
    isConnecting,
    isWalletConnected,
    isNetworkSupported,
    connectWallet,
    handleLogout,
    handleError,
    handleSwitchNetwork,
  };
};

export default useWallet;
