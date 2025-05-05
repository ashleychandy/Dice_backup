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
  const network = await provider.getNetwork();
  const currentChainId = Number(network.chainId);

  if (!SUPPORTED_CHAIN_IDS.includes(currentChainId)) {
    throw new Error(
      `Please switch to a supported network. Connected to chain ID: ${currentChainId}`
    );
  }

  const currentNetwork = Object.values(NETWORK_CONFIG).find(
    n => n.chainId === currentChainId
  );
  if (!currentNetwork) throw new Error('Network configuration not found');

  try {
    await provider.getBlockNumber();
  } catch (rpcError) {
    throw new Error(`Failed to connect to ${currentNetwork.name}`);
  }

  return currentChainId;
};

export const initializeContracts = async (
  provider,
  account,
  setContracts,
  setLoadingStates,
  handleError
) => {
  try {
    // DEBUG LOGS - REMOVE AFTER DEBUGGING
    // console.log(
    //   'DEBUG CONTRACT INIT: Initializing contracts with account:',
    //   account
    // );

    const network = await provider.getNetwork();
    // Always convert to Number for consistent comparison
    const currentChainId = Number(network.chainId);

    // DEBUG LOGS - REMOVE AFTER DEBUGGING
    // console.log(
    //   'DEBUG CONTRACT INIT: Connected to network with chainId:',
    //   currentChainId
    // );

    // Find network config
    const networkKey = Object.keys(NETWORK_CONFIG).find(
      key => NETWORK_CONFIG[key].chainId === currentChainId
    );

    const networkConfig = NETWORK_CONFIG[networkKey];

    // DEBUG LOGS - REMOVE AFTER DEBUGGING
    // console.log('DEBUG CONTRACT INIT: Network config:', networkKey, {
    //   chainId: networkConfig?.chainId,
    //   name: networkConfig?.name,
    //   tokenAddress: networkConfig?.contracts?.token,
    //   diceAddress: networkConfig?.contracts?.dice,
    // });

    if (!networkConfig) {
      // DEBUG LOGS - REMOVE AFTER DEBUGGING
      // console.error(
      //   'DEBUG CONTRACT INIT: Network config not found for chainId:',
      //   currentChainId
      // );
      throw new Error(
        `Unsupported network. Connected to chain ID: ${currentChainId}. Supported chain IDs: ${SUPPORTED_CHAIN_IDS.join(
          ', '
        )}`
      );
    }

    // Check if contract addresses are configured
    if (!networkConfig.contracts.token) {
      // DEBUG LOGS - REMOVE AFTER DEBUGGING
      // console.error(
      //   'DEBUG CONTRACT INIT: Token contract address not configured'
      // );
      // console.error(
      //   `Token contract address not configured for ${networkConfig.name}`
      // );
      throw new Error(
        `Token contract address not configured for ${networkConfig.name}`
      );
    }

    if (!networkConfig.contracts.dice) {
      // DEBUG LOGS - REMOVE AFTER DEBUGGING
      // console.error(
      //   'DEBUG CONTRACT INIT: Dice contract address not configured'
      // );
      // console.error(
      //   `Dice contract address not configured for ${networkConfig.name}`
      // );
      throw new Error(
        `Dice contract address not configured for ${networkConfig.name}`
      );
    }

    // DEBUG LOGS - REMOVE AFTER DEBUGGING
    // console.log('DEBUG CONTRACT INIT: Contract addresses:', {
    //   token: networkConfig.contracts.token,
    //   dice: networkConfig.contracts.dice,
    // });

    // Get signer for the connected account
    const signer = await provider.getSigner(account);
    // console.log('DEBUG CONTRACT INIT: Got signer for account:', account);

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

      // DEBUG LOGS - REMOVE AFTER DEBUGGING
      // console.log('DEBUG CONTRACT INIT: Contracts initialized:', {
      //   tokenAddress: tokenContract.target,
      //   diceAddress: diceContract.target,
      //   diceAbiLength: DiceABI.abi.length,
      //   diceHasGetBetHistory: DiceABI.abi.some(
      //     item => item.name === 'getBetHistory'
      //   ),
      // });

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
      // DEBUG LOGS - REMOVE AFTER DEBUGGING
      // console.error(
      //   'DEBUG CONTRACT INIT: Error creating contract instances:',
      //   contractError
      // );
      throw new Error(
        `Failed to create contract instances: ${contractError.message}`
      );
    }
  } catch (error) {
    // DEBUG LOGS - REMOVE AFTER DEBUGGING
    // console.error('DEBUG CONTRACT INIT: Contract initialization error:', error);
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

      // Reinitialize contracts if needed
      if (account) {
        const provider = new ethers.BrowserProvider(walletProvider);
        if (setProvider) {
          setProvider(provider);
        }

        try {
          await validateNetwork(provider);
          const contracts = await initializeContracts(
            provider,
            account,
            null,
            setLoadingStates,
            handleError
          );

          if (contracts && setContracts) {
            setContracts(contracts);
          }
        } catch (error) {
          // Continue since we're already on the right network
        }
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
              // Ignore error and continue waiting for chainChanged event
              // console.warn('Error checking chain ID after switch:', error);
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
                  // Ignore error and continue waiting for chainChanged event
                  // console.warn('Error checking chain ID after add:', error);
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
