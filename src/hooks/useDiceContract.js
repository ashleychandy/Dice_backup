import { useEffect, useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { ethers } from 'ethers';
import DiceABI from '../contracts/abi/Dice.json';
import TokenABI from '../contracts/abi/GamaToken.json';
import {
  DICE_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ADDRESS,
} from '../constants/contracts';
import { safeContractCall } from '../utils/contractUtils';

export const useDiceContract = () => {
  const { account, chainId, provider, signer } = useWallet();
  const [contract, setContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initContracts = async () => {
      try {
        if (!account || !provider) {
          setContract(null);
          setTokenContract(null);
          setError(null);
          setIsLoading(false);
          return;
        }

        if (!DICE_CONTRACT_ADDRESS) {
          console.warn('Dice contract address not configured for this network');
          setError(
            new Error(
              `Dice contract address not configured for chainId: ${chainId}`
            )
          );
          setContract(null);
          setIsLoading(false);
          return;
        }

        if (!TokenABI?.abi) {
          console.warn('Token ABI not found');
          setError(new Error('Token ABI not available'));
          setIsLoading(false);
          return;
        }

        // Initialize dice contract
        try {
          // Create ethers contract instances
          const ethersReadContract = new ethers.Contract(
            DICE_CONTRACT_ADDRESS,
            DiceABI.abi,
            provider
          );

          // If we have a signer, create a write contract instance
          let ethersWriteContract = null;
          if (signer) {
            ethersWriteContract = new ethers.Contract(
              DICE_CONTRACT_ADDRESS,
              DiceABI.abi,
              signer
            );
          }

          // Create a wrapper for safer contract calls
          const safeDiceContractCall = async (
            method,
            args = [],
            defaultValue
          ) => {
            return safeContractCall(
              async () => {
                const result = await ethersReadContract[method](...args);
                if (result === undefined || result === null) {
                  throw new Error('Empty data response');
                }
                return result;
              },
              defaultValue,
              method,
              true
            );
          };

          // Create a contract interface that mimics the older API
          const diceContract = {
            // Read methods using ethers provider
            read: async (functionName, args = []) => {
              return safeDiceContractCall(functionName, args, null);
            },

            // Write methods using ethers signer
            write: async (functionName, args = [], options = {}) => {
              if (!ethersWriteContract) {
                throw new Error('Signer not available for transaction');
              }
              const tx = await ethersWriteContract[functionName](
                ...args,
                options
              );
              return tx.wait();
            },

            address: DICE_CONTRACT_ADDRESS,
            abi: DiceABI.abi,

            // Add methods needed by the existing code
            totalGamesPlayed: async () => {
              return safeDiceContractCall('totalGamesPlayed', [], '0');
            },

            totalPayoutAmount: async () => {
              return safeDiceContractCall('totalPayoutAmount', [], '0');
            },

            totalWageredAmount: async () => {
              return safeDiceContractCall('totalWageredAmount', [], '0');
            },

            MAX_BET_AMOUNT: async () => {
              return safeDiceContractCall(
                'MAX_BET_AMOUNT',
                [],
                '1000000000000000000000'
              );
            },

            MAX_HISTORY_SIZE: async () => {
              return safeDiceContractCall('MAX_HISTORY_SIZE', [], 20);
            },

            paused: async () => {
              return safeDiceContractCall('paused', [], false);
            },

            owner: async () => {
              return safeDiceContractCall('owner', [], null);
            },

            getGameStatus: async playerAddress => {
              return safeDiceContractCall(
                'getGameStatus',
                [playerAddress],
                null
              );
            },

            getBetHistory: async playerAddress => {
              return safeDiceContractCall('getBetHistory', [playerAddress], []);
            },

            getPlayerForRequest: async requestId => {
              return safeDiceContractCall(
                'getPlayerForRequest',
                [requestId],
                null
              );
            },

            hasPendingRequest: async playerAddress => {
              return safeDiceContractCall(
                'hasPendingRequest',
                [playerAddress],
                false
              );
            },

            placeBet: async (number, amount, options = {}) => {
              if (!ethersWriteContract) {
                throw new Error('Signer not available for transaction');
              }
              const tx = await ethersWriteContract.placeBet(
                number,
                amount,
                options
              );
              return tx.wait();
            },

            recoverOwnStuckGame: async (options = {}) => {
              if (!ethersWriteContract) {
                throw new Error('Signer not available for transaction');
              }
              const tx = await ethersWriteContract.recoverOwnStuckGame(options);
              return tx.wait();
            },

            forceStopGame: async (playerAddress, options = {}) => {
              if (!ethersWriteContract) {
                throw new Error('Signer not available for transaction');
              }
              const tx = await ethersWriteContract.forceStopGame(
                playerAddress,
                options
              );
              return tx.wait();
            },

            pause: async (options = {}) => {
              if (!ethersWriteContract) {
                throw new Error('Signer not available for transaction');
              }
              const tx = await ethersWriteContract.pause(options);
              return tx.wait();
            },

            unpause: async (options = {}) => {
              if (!ethersWriteContract) {
                throw new Error('Signer not available for transaction');
              }
              const tx = await ethersWriteContract.unpause(options);
              return tx.wait();
            },

            // Simple log parsing interface for compatibility
            interface: {
              parseLog: log => {
                try {
                  const iface = new ethers.Interface(DiceABI.abi);
                  return iface.parseLog(log);
                } catch (e) {
                  console.error('Failed to parse log:', e);
                  return { args: {} };
                }
              },
            },
          };

          setContract(diceContract);
        } catch (diceError) {
          console.error('Error initializing dice contract:', diceError);
          setError(
            new Error(
              `Dice contract initialization failed: ${diceError.message}`
            )
          );
          setContract(null);
        }

        // Initialize token contract if address is available
        if (TOKEN_CONTRACT_ADDRESS) {
          try {
            // Create ethers contract instances for token
            const tokenReadContract = new ethers.Contract(
              TOKEN_CONTRACT_ADDRESS,
              TokenABI.abi,
              provider
            );

            // If we have a signer, create a write contract instance
            let tokenWriteContract = null;
            if (signer) {
              tokenWriteContract = new ethers.Contract(
                TOKEN_CONTRACT_ADDRESS,
                TokenABI.abi,
                signer
              );
            }

            // Create a wrapper for safer token contract calls
            const safeTokenContractCall = async (
              method,
              args = [],
              defaultValue
            ) => {
              return safeContractCall(
                async () => {
                  const result = await tokenReadContract[method](...args);
                  if (result === undefined || result === null) {
                    throw new Error('Empty data response');
                  }
                  return result;
                },
                defaultValue,
                method,
                true
              );
            };

            // Create token contract interface
            const token = {
              read: async (functionName, args = []) => {
                return safeTokenContractCall(functionName, args, null);
              },

              write: async (functionName, args = [], options = {}) => {
                if (!tokenWriteContract) {
                  throw new Error('Signer not available for transaction');
                }
                const tx = await tokenWriteContract[functionName](
                  ...args,
                  options
                );
                return tx.wait();
              },

              address: TOKEN_CONTRACT_ADDRESS,
              abi: TokenABI.abi,

              // Add specific methods needed
              balanceOf: async address => {
                return safeTokenContractCall('balanceOf', [address], '0');
              },

              allowance: async (owner, spender) => {
                return safeTokenContractCall(
                  'allowance',
                  [owner, spender],
                  '0'
                );
              },

              approve: async (spender, amount, options = {}) => {
                if (!tokenWriteContract) {
                  throw new Error('Signer not available for transaction');
                }
                const tx = await tokenWriteContract.approve(
                  spender,
                  amount,
                  options
                );
                return tx.wait();
              },
            };

            setTokenContract(token);
          } catch (tokenError) {
            console.error('Error initializing token contract:', tokenError);
            setTokenContract(null);
          }
        }
      } catch (err) {
        console.error('Contract initialization error:', err);
        setError(err);
        setContract(null);
        setTokenContract(null);
      } finally {
        setIsLoading(false);
      }
    };

    initContracts();
  }, [provider, signer, account, chainId]);

  // Debug logging on state changes
  useEffect(() => {
    console.log('Contract state updated:', {
      hasDiceContract: !!contract,
      hasTokenContract: !!tokenContract,
      isLoading,
      hasError: !!error,
      errorMessage: error?.message,
    });
  }, [contract, tokenContract, isLoading, error]);

  return {
    contract,
    tokenContract,
    isLoading,
    error,
  };
};
