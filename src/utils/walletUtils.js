import { ethers } from 'ethers';
import {
  NETWORK_CONFIG,
  SUPPORTED_CHAIN_IDS,
  DEFAULT_NETWORK,
  getCurrentRpcUrl,
  switchToNextRpc,
  RPC_CONFIG,
} from '../config';
import DiceABI from '../contracts/abi/Dice.json';
import TokenABI from '../contracts/abi/GamaToken.json';
import { MAINNET_RPC_URLS, APOTHEM_RPC_URLS } from '../constants/networks';

const _getCurrentRpcUrl = getCurrentRpcUrl;

/**
 * Get the best available wallet provider
 * @returns {Object|null} The best available provider or null if none
 */
export const getAvailableProvider = () => {
  // Check for various wallet providers in order of preference
  if (window.ethereum) {
    return window.ethereum;
  } else if (window.xdc && window.xdc.ethereum) {
    return window.xdc.ethereum;
  } else if (window.xfi && window.xfi.ethereum) {
    return window.xfi.ethereum;
  } else if (window.bitkeep && window.bitkeep.ethereum) {
    return window.bitkeep.ethereum;
  } else if (typeof window.TPJSBrigeClient !== 'undefined') {
    // Token Pocket wallet
    return window.TPJSBrigeClient;
  } else if (window.trustwallet && window.trustwallet.ethereum) {
    return window.trustwallet.ethereum;
  }

  return null;
};

export const validateNetwork = async provider => {
  if (!provider) {
    throw new Error('Provider is required');
  }

  try {
    const network = await provider.getNetwork();
    const chainId = network.chainId;

    // Create a list of supported chain IDs for easy checking
    const supportedChainIds = SUPPORTED_CHAIN_IDS;

    // Check if the connected chain is supported
    const isSupported = supportedChainIds.includes(Number(chainId));

    if (!isSupported) {
      console.warn(`Connected to unsupported network with chainId ${chainId}`);
      return {
        isValid: false,
        chainId: Number(chainId),
        name: network.name || 'Unknown Network',
      };
    }

    console.log(`Connected to supported network: ${network.name} (${chainId})`);
    return {
      isValid: true,
      chainId: Number(chainId),
      name:
        network.name ||
        (chainId === 50 ? 'XDC Mainnet' : 'XDC Apothem Testnet'),
    };
  } catch (error) {
    console.error('Error validating network:', error);
    // Instead of throwing, return an error state
    return {
      isValid: false,
      chainId: 0,
      name: 'Connection Error',
      error: error.message,
    };
  }
};

export const initializeContracts = async (
  provider,
  account,
  setContracts,
  setLoadingStates,
  handleError
) => {
  try {
    const network = await provider.getNetwork();
    // Always convert to Number for consistent comparison
    const currentChainId = Number(network.chainId);

    // Find network config
    const networkKey = Object.keys(NETWORK_CONFIG).find(
      key => NETWORK_CONFIG[key].chainId === currentChainId
    );

    const networkConfig = NETWORK_CONFIG[networkKey];

    if (!networkConfig) {
      throw new Error(
        `Unsupported network. Connected to chain ID: ${currentChainId}. Supported chain IDs: ${SUPPORTED_CHAIN_IDS.join(
          ', '
        )}`
      );
    }

    // Check if contract addresses are configured
    if (!networkConfig.contracts.token) {
      throw new Error(
        `Token contract address not configured for ${networkConfig.name}`
      );
    }

    if (!networkConfig.contracts.dice) {
      throw new Error(
        `Dice contract address not configured for ${networkConfig.name}`
      );
    }

    // Get signer for the connected account
    const signer = await provider.getSigner(account);

    try {
      // Create token contract instance
      const tokenContract = new ethers.Contract(
        networkConfig.contracts.token,
        TokenABI.abi,
        signer
      );

      // Create dice contract instance
      const diceContract = new ethers.Contract(
        networkConfig.contracts.dice,
        DiceABI.abi,
        signer
      );

      if (setContracts) {
        setContracts({
          token: tokenContract,
          dice: diceContract,
        });
      }

      if (setLoadingStates) {
        setLoadingStates(prev => ({ ...prev, contracts: false }));
      }

      return { token: tokenContract, dice: diceContract };
    } catch (contractError) {
      throw new Error(
        `Failed to create contract instances: ${contractError.message}`
      );
    }
  } catch (error) {
    if (handleError) {
      handleError(error, 'initializeContracts');
    }
    if (setContracts) {
      setContracts({ token: null, dice: null });
    }
    if (setLoadingStates) {
      setLoadingStates(prev => ({ ...prev, contracts: false }));
    }
    return null;
  }
};

export const switchNetwork = async (
  networkType,
  setLoadingStates,
  setContracts,
  account,
  setProvider,
  validateNetwork,
  initializeContracts,
  addToast,
  handleError
) => {
  const walletProvider = getAvailableProvider();
  if (!walletProvider) {
    throw new Error('No wallet provider found');
  }

  const network = NETWORK_CONFIG[networkType || DEFAULT_NETWORK];
  const chainIdHex = `0x${network.chainId.toString(16)}`;

  try {
    if (setLoadingStates) {
      setLoadingStates({ wallet: true });
    }
    // Clear contracts during network switch
    if (setContracts) {
      setContracts({ token: null, dice: null });
    }

    // Check if already on the correct network
    const currentChainId = await walletProvider.request({
      method: 'eth_chainId',
    });
    if (parseInt(currentChainId, 16) === network.chainId) {
      if (addToast) {
        addToast(`Already connected to ${network.name}`, 'info');
      }

      if (setLoadingStates) {
        setLoadingStates({ wallet: false });
      }

      return;
    }

    // Create a promise that resolves when the network change is complete
    const networkSwitchPromise = new Promise((resolve, reject) => {
      // Set a timeout for network switch
      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            `Network switch timeout. Please manually switch to ${network.name}.`
          )
        );
      }, 15000); // 15 second timeout

      // Listen for chain change
      const chainChangeHandler = newChainId => {
        const newChainIdNumber = parseInt(newChainId);
        if (newChainIdNumber === network.chainId) {
          clearTimeout(timeoutId);
          walletProvider.removeListener('chainChanged', chainChangeHandler);
          resolve();
        }
      };

      walletProvider.on('chainChanged', chainChangeHandler);

      // First try to switch to the network
      walletProvider
        .request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        })
        .then(() => {
          // Some wallets don't trigger the chainChanged event
          // Check if we're on the right network after a brief delay
          setTimeout(async () => {
            try {
              const updatedChainId = await walletProvider.request({
                method: 'eth_chainId',
              });

              if (parseInt(updatedChainId, 16) === network.chainId) {
                clearTimeout(timeoutId);
                walletProvider.removeListener(
                  'chainChanged',
                  chainChangeHandler
                );
                resolve();
              }
            } catch (error) {
              // Ignore error and continue waiting for chainChanged event - IMPROVE LOGGING
              console.error(
                'Error checking chain ID after switch attempt:',
                error
              );
            }
          }, 1000);
        })
        .catch(async error => {
          // Handle errors
          if (error.code === 4902) {
            // Chain not added to wallet, try to add it
            try {
              await walletProvider.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: chainIdHex,
                    chainName: network.name,
                    nativeCurrency: {
                      name: 'XDC',
                      symbol: 'XDC',
                      decimals: 18,
                    },
                    rpcUrls: [network.rpcUrl],
                    blockExplorerUrls: [network.explorer],
                  },
                ],
              });

              // Check if we're on the right network after a delay
              setTimeout(async () => {
                try {
                  const updatedChainId = await walletProvider.request({
                    method: 'eth_chainId',
                  });

                  if (parseInt(updatedChainId, 16) === network.chainId) {
                    clearTimeout(timeoutId);
                    walletProvider.removeListener(
                      'chainChanged',
                      chainChangeHandler
                    );
                    resolve();
                  }
                } catch (error) {
                  // Ignore error and continue waiting for chainChanged event - IMPROVE LOGGING
                  console.error(
                    'Error checking chain ID after add attempt:',
                    error
                  );
                }
              }, 1000);
            } catch (addError) {
              reject(
                new Error(
                  `Failed to add ${network.name} to your wallet. Please add it manually.`
                )
              );
            }
          } else if (error.code === 4001) {
            // User rejected the switch
            reject(new Error('Network switch rejected by user'));
          } else {
            reject(error);
          }
        });
    });

    // Wait for the network switch to complete
    await networkSwitchPromise;

    // After successful switch, reinitialize if we have an account
    if (account) {
      const newProvider = new ethers.BrowserProvider(walletProvider);
      if (setProvider) {
        setProvider(newProvider);
      }
      await validateNetwork(newProvider);

      const contracts = await initializeContracts(
        newProvider,
        account,
        null,
        setLoadingStates,
        handleError
      );

      if (contracts && setContracts) {
        setContracts(contracts);
      }
    }

    if (addToast) {
      addToast(`Successfully switched to ${network.name}`, 'success');
    }
  } catch (error) {
    if (handleError) {
      handleError(error, 'switchNetwork');
    } else {
      // console.error('Network switch error:', error);
    }

    // Reset contracts and provider on error
    if (setContracts) {
      setContracts({ token: null, dice: null });
    }
    if (setProvider) {
      setProvider(null);
    }
    throw error;
  } finally {
    if (setLoadingStates) {
      setLoadingStates({ wallet: false });
    }
  }
};

/**
 * Check RPC health with detailed response
 * @param {string} rpcUrl - The RPC URL to check
 * @returns {Promise<Object>} Health check result
 */
export const checkRpcHealth = async rpcUrl => {
  if (!rpcUrl) {
    return { ok: false, error: 'No RPC URL provided' };
  }

  try {
    const startTime = Date.now();
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      // Add timeout from RPC_CONFIG
      signal: AbortSignal.timeout(RPC_CONFIG.timeout),
    });
    const endTime = Date.now();
    const latency = endTime - startTime;

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP error: ${response.status}`,
        latency,
        statusCode: response.status,
      };
    }

    const data = await response.json();

    if (data.error) {
      return {
        ok: false,
        error: data.error.message || 'RPC returned an error',
        latency,
        errorCode: data.error.code,
      };
    }

    // Check if block number is valid
    const blockNumber = parseInt(data.result, 16);
    if (isNaN(blockNumber)) {
      return {
        ok: false,
        error: 'Invalid block number received',
        latency,
      };
    }

    return {
      ok: true,
      blockNumber,
      latency,
    };
  } catch (error) {
    console.error('RPC health check failed:', error);

    // Check for timeout
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return {
        ok: false,
        error: 'Connection timeout',
        isTimeout: true,
      };
    }

    // Check for CORS errors
    const isCorsError =
      error.message &&
      (error.message.includes('CORS') ||
        error.message.includes('cross-origin') ||
        error.message.includes('Cross-Origin') ||
        error.message.includes('blocked by mode'));

    return {
      ok: false,
      error: isCorsError
        ? 'Browser security (CORS) blocked the connection'
        : error.message || 'Connection failed',
      isCorsError,
      originalError: error.message,
    };
  }
};

/**
 * Helper function to detect and recover from common RPC errors
 * @param {Error} error - The error to analyze
 * @param {Object} provider - Ethers provider instance
 * @param {string} networkType - The current network type
 * @param {Function} addToast - Function to display notifications
 * @returns {Promise<boolean>} Whether recovery was attempted
 */
export const handleRpcError = async (
  error,
  provider,
  networkType,
  addToast = null
) => {
  if (!error || !provider || !networkType) return false;

  const errorMessage = error.message?.toLowerCase() || '';
  const retryCount = provider._retryCount || 0;

  // Check for common RPC issues
  const isRpcIssue =
    errorMessage.includes('missing revert data') ||
    errorMessage.includes('failed to meet quorum') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection error') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('cors');

  if (!isRpcIssue) return false;

  try {
    // If we've exceeded max retries, try switching to next RPC
    if (retryCount >= RPC_CONFIG.maxRetries) {
      const newRpcUrl = switchToNextRpc(networkType);

      if (newRpcUrl) {
        // Check health of new RPC before switching
        const healthCheck = await checkRpcHealth(newRpcUrl);

        if (healthCheck.ok) {
          // Update provider's URL
          provider._network.anyNetwork._provider._url = newRpcUrl;

          if (addToast) {
            addToast(
              'Network connection issues detected. Switching to backup RPC...',
              'warning'
            );
          }

          // Reset retry count
          provider._retryCount = 0;

          // Test new connection
          await provider.getBlockNumber();
          return true;
        } else {
          // If health check failed, try next RPC
          console.warn('Backup RPC health check failed:', healthCheck.error);
          return await handleRpcError(error, provider, networkType, addToast);
        }
      } else {
        // If we've tried all RPCs, reset to highest priority and notify
        const resetSuccess = resetToHighestPriorityRpc(provider, networkType);
        if (resetSuccess && addToast) {
          addToast(
            'All backup RPCs failed. Resetting to primary RPC...',
            'warning'
          );
        }
      }
    }

    // Implement exponential backoff for retries
    const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
    await new Promise(resolve => setTimeout(resolve, backoffTime));

    // Increment retry count
    provider._retryCount = retryCount + 1;

    // Test connection
    await provider.getBlockNumber();
    return true;
  } catch (recoveryError) {
    console.error('Failed to recover from RPC error:', recoveryError);

    if (addToast) {
      addToast(
        'Unable to connect to network. Please check your connection or try again later.',
        'error'
      );
    }

    return false;
  }
};

/**
 * Get the current RPC URL from the connected wallet
 * @param {Object} provider - The ethers provider
 * @param {number} chainId - The current chain ID
 * @returns {Promise<string|null>} The RPC URL or null if not available
 */
export const getCurrentRpcUrlFromWallet = async (provider, chainId) => {
  if (!provider || !chainId) return null;

  try {
    // First check if we can access the provider directly
    const walletProvider = getAvailableProvider();

    if (walletProvider) {
      // For MetaMask and compatible wallets
      if (walletProvider.isMetaMask || walletProvider.isXDCPay) {
        // Try to get the RPC URL using the wallet's API
        try {
          // Convert chainId to hex format if needed
          const chainIdHex =
            typeof chainId === 'number' ? `0x${chainId.toString(16)}` : chainId;

          // MetaMask's way of getting the current RPC URL
          const networkDetails = await walletProvider
            .request({
              method: 'wallet_getProviderConfig',
              params: [{ chainId: chainIdHex }],
            })
            .catch(() => null);

          if (networkDetails && networkDetails.rpcUrl) {
            return networkDetails.rpcUrl;
          }

          // Alternative method for some wallet implementations
          if (walletProvider._state && walletProvider._state.config) {
            return walletProvider._state.config.rpcUrl || null;
          }

          // Another approach for newer MetaMask versions
          if (
            walletProvider._rpcEngine &&
            walletProvider._rpcEngine.currentProvider
          ) {
            const currentProvider = walletProvider._rpcEngine.currentProvider;
            return currentProvider.rpcUrl || currentProvider.host || null;
          }
        } catch (walletError) {
          console.log('Could not get RPC URL via wallet API:', walletError);
          // Continue to fallback methods
        }
      }
    }

    // Fallback: Try to extract from provider
    if (provider._network && provider._network.anyNetwork) {
      return provider._network.anyNetwork._provider._url || null;
    }

    // Final fallback: For ethers v6
    if (provider.connection && provider.connection.url) {
      return provider.connection.url;
    }

    return null;
  } catch (error) {
    console.error('Error getting RPC URL from wallet:', error);
    return null;
  }
};

/**
 * Reset to the highest priority RPC URL for the current network
 * @param {Object} provider - The ethers provider
 * @param {string} networkType - The network type ('mainnet' or 'apothem')
 * @returns {Promise<boolean>} Whether the reset was successful
 */
const resetToHighestPriorityRpc = async (provider, networkType) => {
  try {
    const chainId = await provider.getNetwork().then(n => n.chainId);
    const rpcUrls =
      networkType === 'mainnet' ? MAINNET_RPC_URLS : APOTHEM_RPC_URLS;

    if (rpcUrls.length === 0) return false;

    const highestPriorityRpc = rpcUrls[0];
    await provider.send('wallet_addEthereumChain', [
      {
        chainId: `0x${chainId.toString(16)}`,
        rpcUrls: [highestPriorityRpc],
        // ... other chain parameters ...
      },
    ]);

    return true;
  } catch (error) {
    console.error('Failed to reset to highest priority RPC:', error);
    return false;
  }
};

const handleAddNetwork = async (provider, networkType, _addError) => {
  try {
    // ... existing code ...
  } catch (error) {
    console.error('Error adding network:', error);
    return false;
  }
};
