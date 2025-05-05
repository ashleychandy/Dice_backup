import { ethers } from 'ethers';
import {
  NETWORK_CONFIG,
  SUPPORTED_CHAIN_IDS,
  DEFAULT_NETWORK,
} from '../config';
import DiceABI from '../contracts/abi/Dice.json';
import TokenABI from '../contracts/abi/GamaToken.json';

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
        (chainId === 50n ? 'XDC Mainnet' : 'XDC Apothem Testnet'),
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

/**
 * Initialize contract instances with ethers v6
 */
export const initializeContracts = async (
  provider,
  account,
  setContracts,
  setLoadingStates,
  handleError
) => {
  try {
    // Get current network information
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
      // Create token contract instance with ethers v6
      const tokenContract = new ethers.Contract(
        networkConfig.contracts.token,
        TokenABI.abi,
        signer
      );

      // Create dice contract instance with ethers v6
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
 * Check if an RPC endpoint is healthy by making a basic eth_blockNumber request
 * @param {string} rpcUrl - The RPC URL to check
 * @returns {Promise<{ok: boolean, error?: string, blockNumber?: number}>} Health status
 */
export const checkRpcHealth = async rpcUrl => {
  try {
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
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP error: ${response.status}` };
    }

    const data = await response.json();
    return { ok: true, blockNumber: parseInt(data.result, 16) };
  } catch (error) {
    console.error('RPC health check failed:', error);
    return { ok: false, error: error.message };
  }
};

/**
 * Helper function to detect common RPC errors
 * @param {Error} error - The error to analyze
 * @returns {boolean} - Whether it's a common RPC issue
 */
export const isRpcError = error => {
  if (!error || !error.message) return false;

  const errorMessage = error.message.toLowerCase();
  return (
    errorMessage.includes('missing revert data') ||
    errorMessage.includes('failed to meet quorum') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection error') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('rate limit')
  );
};

/**
 * Format wallet address for display
 * @param {string} address - Full wallet address
 * @param {number} first - Number of characters to show at start
 * @param {number} last - Number of characters to show at end
 * @returns {string} Formatted address
 */
export const formatAddress = (address, first = 6, last = 4) => {
  if (!address) return '';
  if (address.length < first + last + 3) return address;
  return `${address.slice(0, first)}...${address.slice(-last)}`;
};
