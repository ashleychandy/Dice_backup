import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ethers } from 'ethers';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Import utilities and hooks
import {
  checkAndApproveToken,
  parseGameResultEvent,
} from '../utils/contractUtils';
import { useLoadingState } from './useLoadingState';
import { useErrorHandler } from './useErrorHandler';
import { useDiceContract } from './useDiceContract';
import { useWallet } from '../components/wallet/WalletProvider';
import { useContractState } from './useContractState';
import { useContractStats } from './useContractStats';
import { useRequestTracking } from './useRequestTracking';

// Custom hook for bet state management
const useBetState = (initialBetAmount = '1000000000000000000') => {
  // Store betAmount as string to avoid serialization issues
  const [betAmount, setBetAmountRaw] = useState(initialBetAmount);
  const [chosenNumber, setChosenNumber] = useState(null);
  const lastBetAmountRef = useRef(initialBetAmount);

  const setBetAmount = useCallback(amount => {
    // Debug the amount being set
    console.log('setBetAmount called with:', {
      type: typeof amount,
      value: String(amount),
      isBigInt: typeof amount === 'bigint',
    });

    // Convert to string regardless of input type
    let amountStr;
    try {
      if (typeof amount === 'bigint') {
        amountStr = amount.toString();
      } else if (typeof amount === 'object' && amount.toString) {
        amountStr = amount.toString();
      } else if (amount === null || amount === undefined) {
        amountStr = '0';
      } else {
        amountStr = String(amount);
      }

      console.log('Converted to string:', amountStr);
    } catch (error) {
      console.error('Error converting amount to string:', error);
      amountStr = '0';
    }

    if (amountStr !== lastBetAmountRef.current) {
      // Immediately update the reference to ensure instant UI feedback
      lastBetAmountRef.current = amountStr;
      // Update state
      setBetAmountRaw(amountStr);
    }
  }, []);

  // Convert to BigInt when needed
  const betAmountBigInt = useMemo(() => {
    try {
      console.log('Converting betAmount to BigInt:', betAmount);
      if (!betAmount || betAmount === '') {
        return BigInt(0);
      }
      return BigInt(betAmount);
    } catch (error) {
      console.error(
        'Error converting betAmount to BigInt:',
        error,
        'Value:',
        betAmount
      );
      return BigInt(0);
    }
  }, [betAmount]);

  return {
    betAmount: betAmountBigInt,
    betAmountString: betAmount,
    setBetAmount,
    chosenNumber,
    setChosenNumber,
  };
};

// Custom hook for game state management
const useGameState = () => {
  const [gameState, setGameState] = useState({
    isProcessing: false,
    isRolling: false,
    lastResult: null,
  });

  const setProcessingState = useCallback(isProcessing => {
    setGameState(prev => ({ ...prev, isProcessing }));
  }, []);

  const setRollingState = useCallback(isRolling => {
    setGameState(prev => ({ ...prev, isRolling }));
  }, []);

  const setLastResult = useCallback(result => {
    setGameState(prev => ({ ...prev, lastResult: result }));
  }, []);

  return {
    gameState,
    setProcessingState,
    setRollingState,
    setLastResult,
  };
};

// Enhanced safety timeout handler
const setupSafetyTimeout = (timeoutRef, callback, timeoutMs = 60000) => {
  // Clear any existing timeout to prevent memory leaks
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }

  // Set new timeout
  timeoutRef.current = setTimeout(() => {
    console.warn(`Safety timeout triggered after ${timeoutMs}ms`);
    timeoutRef.current = null;
    if (typeof callback === 'function') {
      callback();
    }
  }, timeoutMs);

  // Return a function to clear the timeout
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };
};

/**
 * Custom hook for dice game logic
 * @param {Object} contracts - Contract instances
 * @param {String} account - User's account
 * @param {Function} onError - Error handler
 * @param {Function} addToast - Toast notification function
 * @returns {Object} Game state and functions
 */
export const useGameLogic = (contracts, account, onError, addToast) => {
  const queryClient = useQueryClient();
  const operationInProgress = useRef(false);
  const safetyTimeoutRef = useRef(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isBetting, withBetting] = useLoadingState(false);
  const handleError = useErrorHandler(onError, addToast);
  const { contract: _contract } = useDiceContract();
  const { account: walletAccount } = useWallet();
  const [isProcessing, _setIsProcessing] = useState(false);
  const [error, _setError] = useState(null);
  const pendingTxRef = useRef(null);

  // Add new hooks
  const { contractState: _contractState } = useContractState();
  const { stats } = useContractStats();
  const { userPendingRequest: _userPendingRequest } = useRequestTracking();

  // Helper to batch multiple query invalidations
  const invalidateQueries = useCallback(
    (types = ['balance']) => {
      if (!walletAccount) return;

      const timestamp = Date.now(); // Add timestamp to ensure cache busting

      types.forEach(type => {
        queryClient.invalidateQueries([type, walletAccount, timestamp]);
      });
    },
    [queryClient, walletAccount]
  );

  // Always invalidate balance data when component mounts or account/contracts change
  useEffect(() => {
    // Invalidate balance data when account or contracts change
    if (walletAccount && contracts?.token) {
      invalidateQueries(['balance']);
    }

    // Register global function to refresh balance data
    window.refreshBalanceData = accountAddress => {
      // If no account is provided, use the current one
      const targetAccount = accountAddress || walletAccount;
      if (targetAccount) {
        queryClient.invalidateQueries(['balance', targetAccount]);
      }
    };

    return () => {
      delete window.refreshBalanceData;

      // Clean up safety timeout when component unmounts
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    };
  }, [contracts, walletAccount, queryClient, invalidateQueries]);

  // Initialize state management hooks
  const {
    betAmount,
    betAmountString,
    setBetAmount,
    chosenNumber,
    setChosenNumber,
  } = useBetState();

  const { gameState, setProcessingState, setRollingState, setLastResult } =
    useGameState();

  // Balance Query with optimized settings
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['balance', walletAccount, contracts?.token ? true : false],
    queryFn: async () => {
      if (!contracts?.token || !walletAccount) {
        return {
          balance: BigInt(0),
          allowance: BigInt(0),
        };
      }

      try {
        const [balance, tokenAllowance] = await Promise.all([
          contracts.token.balanceOf(walletAccount).catch(err => {
            console.error('Error fetching balance:', err);
            return BigInt(0);
          }),
          contracts.token
            .allowance(
              walletAccount,
              contracts.dice?.address ||
                contracts.dice?.target ||
                ethers.ZeroAddress
            )
            .catch(err => {
              console.error('Error fetching allowance:', err);
              return BigInt(0);
            }),
        ]);

        // Force conversion to BigInt to ensure consistency
        const balanceBigInt = balance ? BigInt(balance.toString()) : BigInt(0);
        const allowanceBigInt = tokenAllowance
          ? BigInt(tokenAllowance.toString())
          : BigInt(0);

        return {
          balance: balanceBigInt,
          allowance: allowanceBigInt,
        };
      } catch (error) {
        console.error('Balance query error:', error);
        return {
          balance: BigInt(0),
          allowance: BigInt(0),
        };
      }
    },
    enabled: !!contracts?.token && !!walletAccount,
    staleTime: 30000, // Keep data fresh for 30 seconds
    cacheTime: 60000, // Cache for 1 minute
    retry: 1, // Only retry once on failure
    refetchInterval: 60000, // Reduce polling to once per minute
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    onError: error => {
      console.error('Balance query failed:', error);
    },
  });

  // Handle approving tokens with optimistic updates
  const handleApproveToken = useCallback(async () => {
    if (!contracts?.token || !contracts?.dice || !walletAccount) {
      addToast(
        'Cannot approve tokens: wallet or contract connection issue',
        'error'
      );
      return;
    }

    // Prevent multiple approval attempts
    if (operationInProgress.current || isApproving) {
      addToast('An operation is already in progress', 'warning');
      return;
    }

    operationInProgress.current = true;
    setIsApproving(true);

    // Set local state immediately for better UI feedback
    setProcessingState(true);

    // Setup safety timeout to reset state if the operation takes too long
    const clearTimeout = setupSafetyTimeout(safetyTimeoutRef, () => {
      operationInProgress.current = false;
      setIsApproving(false);
      setProcessingState(false);
      addToast('The approval operation timed out. Please try again.', 'error');
    });

    try {
      // Get the dice contract address (target for v6 ethers, address for v5)
      const diceContractAddress =
        contracts.dice.target || contracts.dice.address;

      // Show initial toast
      addToast('Starting token approval process...', 'info');

      // Call the enhanced token approval function with correct parameters
      // Use maxRetries=2 for up to 3 total attempts (initial + 2 retries)
      const success = await checkAndApproveToken(
        contracts.token,
        diceContractAddress,
        walletAccount,
        isProcessing => setProcessingState(isProcessing),
        addToast,
        2 // max retries
      );

      if (success) {
        // Force immediate refresh of all data - no caching
        try {
          // Create a small delay to let blockchain state settle
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Refresh balance data
          invalidateQueries(['balance']);
        } catch (refetchError) {
          console.error('Error refreshing data after approval:', refetchError);
          // Continue despite refetch error, since approval was successful
        }
      } else {
        // If approval failed, show a detailed error message
        addToast(
          'Token approval failed. Please check your wallet and try again.',
          'error'
        );
      }
    } catch (error) {
      console.error('Token approval error:', error);
      handleError(error, 'handleApproveToken');
    } finally {
      // Clean up resources and reset state
      clearTimeout();
      operationInProgress.current = false;
      setIsApproving(false);
      setProcessingState(false);
    }
  }, [
    contracts,
    walletAccount,
    handleError,
    addToast,
    queryClient,
    isApproving,
    setProcessingState,
    checkAndApproveToken,
    invalidateQueries,
  ]);

  // Validate bet amount against contract limits
  const _validateBetAmount = useCallback(
    amount => {
      if (!stats?.maxBetAmount) return false;

      try {
        const maxBet = BigInt(stats.maxBetAmount);
        return amount <= maxBet;
      } catch (error) {
        return false;
      }
    },
    [stats]
  );

  // Handle placing a bet with improved error handling and race condition prevention
  const handlePlaceBet = useCallback(async () => {
    if (!contracts?.dice || !walletAccount) {
      addToast(
        'Cannot place bet: wallet or contract connection issue',
        'error'
      );
      return;
    }

    // Validate that a number is chosen
    if (chosenNumber === null || chosenNumber === undefined) {
      addToast('Please select a number first', 'warning');
      return;
    }

    // Ensure chosenNumber is between 1-6
    if (chosenNumber < 1 || chosenNumber > 6) {
      addToast('Please select a valid number between 1 and 6', 'warning');
      return;
    }

    if (betAmount <= BigInt(0)) {
      addToast('Please enter a valid bet amount', 'warning');
      return;
    }

    // Prevent multiple betting attempts
    if (operationInProgress.current || isBetting) {
      addToast('A game is already in progress', 'warning');
      return;
    }

    operationInProgress.current = true;

    try {
      await withBetting(async () => {
        // Update UI state immediately
        setProcessingState(true);

        // Setup safety timeout to reset state if the bet takes too long
        const clearTimeout = setupSafetyTimeout(
          safetyTimeoutRef,
          () => {
            operationInProgress.current = false;
            setProcessingState(false);
            setRollingState(false);
            addToast('The bet operation timed out. Please try again.', 'error');
          },
          90000
        ); // 90 seconds timeout

        try {
          // Check contract availability again before calling
          if (
            !contracts.dice ||
            typeof contracts.dice.placeBet !== 'function'
          ) {
            throw new Error('Dice contract is not properly initialized');
          }

          // Use cached balance data first to avoid redundant blockchain calls
          if (balanceData?.balance) {
            try {
              // Log the raw values for debugging
              console.log('[placeBet] Raw balance check values:', {
                balance:
                  typeof balanceData.balance === 'bigint'
                    ? balanceData.balance.toString()
                    : balanceData.balance,
                balanceType: typeof balanceData.balance,
                betAmount:
                  typeof betAmount === 'bigint'
                    ? betAmount.toString()
                    : betAmount,
                betAmountType: typeof betAmount,
              });

              // Ensure both are proper BigInt for comparison
              const balanceBigInt = BigInt(balanceData.balance.toString());
              const betAmountBigInt = BigInt(betAmount.toString());

              // Log the converted values and comparison result
              console.log('[placeBet] Balance check:', {
                balanceWei: String(balanceBigInt),
                betAmountWei: String(betAmountBigInt),
                balanceEther: ethers.formatEther(balanceBigInt),
                betAmountEther: ethers.formatEther(betAmountBigInt),
                insufficientBalance: balanceBigInt < betAmountBigInt,
              });

              if (balanceBigInt < betAmountBigInt) {
                throw new Error(
                  "You don't have enough tokens for this bet amount."
                );
              }
            } catch (error) {
              // If there's an error in comparison, do a fresh balance check
              console.error('[placeBet] Error comparing balance:', error);
            }
          }

          // Only if balance check is close to bet amount, verify with fresh data
          if (
            !balanceData?.balance ||
            balanceData.balance < betAmount * BigInt(2)
          ) {
            try {
              const currentBalance =
                await contracts.token.balanceOf(walletAccount);
              const currentBalanceBigInt = BigInt(currentBalance.toString());
              const betAmountBigInt = BigInt(betAmount.toString());

              if (currentBalanceBigInt < betAmountBigInt) {
                throw new Error(
                  "You don't have enough tokens for this bet amount."
                );
              }
            } catch (balanceError) {
              console.error('Error checking up-to-date balance:', balanceError);
              // If it's a specific balance check error, throw it
              if (
                balanceError.message &&
                !balanceError.message.includes('checking up-to-date balance')
              ) {
                throw balanceError;
              }
              // Otherwise continue with the cached balance
            }
          }

          // Show notification
          addToast('Placing your bet...', 'info');

          // Convert chosen number to proper format for the contract call
          // Ensure it's a valid BigInt
          let chosenNumberBigInt;
          try {
            chosenNumberBigInt = BigInt(chosenNumber);

            // Validate again after conversion
            if (
              chosenNumberBigInt < BigInt(1) ||
              chosenNumberBigInt > BigInt(6)
            ) {
              throw new Error('Invalid dice number after conversion');
            }
          } catch (conversionError) {
            console.error('Error converting chosen number:', conversionError);
            throw new Error(
              'Invalid dice number. Please select a number between 1 and 6.'
            );
          }

          // Add transaction options with proper gas settings
          const txOptions = {
            gasLimit: ethers.parseUnits('500000', 'wei'),
          };

          // Store transaction reference for tracking
          let tx;
          try {
            tx = await contracts.dice.placeBet(
              chosenNumberBigInt,
              betAmount,
              txOptions
            );
            pendingTxRef.current = tx;
          } catch (txError) {
            // Handle specific transaction errors
            console.error('Transaction creation error:', txError);

            // Check for common errors
            if (txError.message && txError.message.includes('user rejected')) {
              throw new Error('Transaction rejected in wallet.');
            } else if (
              txError.message &&
              txError.message.includes('insufficient funds')
            ) {
              throw new Error('Insufficient XDC for transaction fees.');
            } else {
              // Rethrow with original error
              throw txError;
            }
          }

          // Show pending notification
          addToast('Bet placed! Waiting for confirmation...', 'info');

          // Wait for transaction confirmation with a timeout
          setRollingState(true);
          let receipt;
          try {
            receipt = await Promise.race([
              tx.wait(1),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error('Transaction confirmation timeout')),
                  60000
                )
              ),
            ]);
          } catch (waitError) {
            console.error('Transaction wait error:', waitError);

            // Clean up references but don't reset rolling state yet
            // The transaction might still confirm later
            addToast(
              'Transaction confirmation is taking longer than expected. Check your wallet for updates.',
              'warning'
            );

            // Don't throw here, let the function continue to cleanup phase
            receipt = null;
          }

          if (receipt && receipt.status === 1) {
            // Clear pending transaction reference
            pendingTxRef.current = null;

            try {
              // Process transaction result
              const gameResult = parseGameResultEvent(
                receipt,
                contracts.dice.interface
              );

              if (gameResult) {
                // Show result notification
                if (gameResult.isWin) {
                  addToast(
                    `🎉 You won ${ethers.formatEther(gameResult.payout)} tokens!`,
                    'success'
                  );
                } else {
                  addToast(`Better luck next time!`, 'info');
                }

                // Update game state with result
                setLastResult(gameResult);

                // Batch refresh all data with a single timestamp to reduce calls
                invalidateQueries(['balance', 'gameHistory', 'gameStats']);
              } else {
                // If we couldn't parse the result, try to find the transaction in the latest events
                addToast(
                  'Processing your result. Check your transaction history.',
                  'info'
                );

                // Fallback result with default values
                setLastResult({
                  rolledNumber: 0,
                  payout: BigInt(0),
                  isWin: false,
                  isSpecialResult: false,
                  isPending: true,
                  txHash: receipt.transactionHash,
                });

                // Refresh data anyway
                invalidateQueries(['balance', 'gameHistory']);
              }
            } catch (parseError) {
              console.error('Error parsing game result:', parseError);
              addToast('Error processing game result', 'warning');
            }
          } else if (receipt) {
            // Receipt exists but status is not 1 (success)
            addToast('Transaction failed or was reverted', 'error');
          }
        } catch (error) {
          console.error('Place bet error:', error);

          // Handle specific error types for better user feedback
          if (
            error.code === 4001 ||
            (error.message && error.message.includes('rejected'))
          ) {
            addToast('Transaction rejected in wallet', 'warning');
          } else if (
            error.message &&
            error.message.includes('insufficient funds')
          ) {
            addToast('Insufficient XDC for transaction fees', 'error');
          } else if (error.message && error.message.includes('timeout')) {
            addToast(
              'Transaction confirmation timed out. Network may be congested.',
              'warning'
            );
          } else {
            handleError(error, 'handlePlaceBet');
          }
        } finally {
          // Clean up resources and reset state regardless of outcome
          clearTimeout();
          pendingTxRef.current = null;
          operationInProgress.current = false;
          setProcessingState(false);
          setRollingState(false);
        }
      });
    } catch (error) {
      console.error('Error in withBetting wrapper:', error);
      operationInProgress.current = false;
      setProcessingState(false);
      setRollingState(false);
      handleError(error, 'handlePlaceBet wrapper');
    }
  }, [
    contracts,
    walletAccount,
    chosenNumber,
    betAmount,
    balanceData,
    handleError,
    addToast,
    queryClient,
    isBetting,
    withBetting,
    setProcessingState,
    setRollingState,
    setLastResult,
    invalidateQueries,
  ]);

  // Derived state from balance data
  const hasNoTokens = useMemo(() => {
    try {
      // User has no tokens if balance exists and is zero
      return (
        balanceData?.balance !== undefined &&
        BigInt(balanceData.balance.toString()) <= BigInt(0)
      );
    } catch (error) {
      console.error('Error in hasNoTokens calculation:', error);
      return true; // Assume no tokens on error
    }
  }, [balanceData]);

  const needsApproval = useMemo(() => {
    try {
      // User needs to approve if they have tokens but insufficient allowance
      if (!balanceData?.balance || !balanceData?.allowance) return false;

      const balanceBigInt = BigInt(balanceData.balance.toString());
      const allowanceBigInt = BigInt(balanceData.allowance.toString());
      const betAmountBigInt = BigInt(betAmount.toString());

      return balanceBigInt > BigInt(0) && allowanceBigInt < betAmountBigInt;
    } catch (error) {
      console.error('Error in needsApproval calculation:', error);
      return false; // Assume no approval needed on error
    }
  }, [balanceData, betAmount]);

  // Cancel any pending operation when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      if (pendingTxRef.current) {
        console.log('Cleaning up pending transaction references');
        pendingTxRef.current = null;
      }

      if (operationInProgress.current) {
        console.log('Resetting operation in progress flag');
        operationInProgress.current = false;
      }

      // Clean up safety timeout
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    };
  }, []);

  // When bet is placed, immediately update UI with the result
  useEffect(() => {
    if (gameState.lastResult && window.addNewGameResult) {
      try {
        // Add this game to history for instant display
        window.addNewGameResult({
          timestamp: Math.floor(Date.now() / 1000).toString(),
          chosenNumber: chosenNumber?.toString() || '0',
          rolledNumber: gameState.lastResult.rolledNumber?.toString() || '0',
          amount: betAmount.toString(),
          payout: gameState.lastResult.payout?.toString() || '0',
          isWin: gameState.lastResult.isWin,
          isRecovered: false,
          isForceStopped: false,
          isSpecialResult: false,
        });

        // After result is known, immediately refresh all data
        invalidateQueries(['balance', 'gameHistory', 'gameStats']);
      } catch (error) {
        console.error('Error updating game result in UI:', error);
      }
    }
  }, [
    gameState.lastResult,
    chosenNumber,
    betAmount,
    queryClient,
    walletAccount,
  ]);

  // Return all the necessary state and functions
  return {
    chosenNumber,
    betAmount,
    betAmountString,
    gameState,
    balanceData: {
      balance: balanceData?.balance || BigInt(0),
      allowance: balanceData?.allowance || BigInt(0),
    },
    balanceLoading,
    hasNoTokens,
    needsApproval,
    isApproving,
    isBetting,
    isProcessing,
    error,
    setChosenNumber,
    setBetAmount,
    handleApproveToken,
    handlePlaceBet,
    invalidateQueries,
  };
};

export default useGameLogic;
