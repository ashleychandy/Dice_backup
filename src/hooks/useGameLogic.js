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
import { useWallet } from './useWallet';
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
    // Only update if value has actually changed - stripped debug logs for performance
    const amountStr = typeof amount === 'bigint' ? amount.toString() : amount;

    if (amountStr !== lastBetAmountRef.current) {
      // Immediately update the reference to ensure instant UI feedback
      lastBetAmountRef.current = amountStr;
      // Update state
      setBetAmountRaw(amountStr);
    }
  }, []);

  // Convert to BigInt when needed - optimized with immediate execution
  const betAmountBigInt = useMemo(() => {
    try {
      return BigInt(betAmount);
    } catch (error) {
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
  const lastFetchedBalance = useRef(null);
  const safetyTimeoutRef = useRef(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isBetting, withBetting] = useLoadingState(false);
  const handleError = useErrorHandler(onError, addToast);
  const { contract } = useDiceContract();
  const { account: walletAccount } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const pendingTxRef = useRef(null);

  // Add new hooks
  const { contractState } = useContractState();
  const { stats } = useContractStats();
  const { userPendingRequest } = useRequestTracking();

  // Reset last fetched balance when account or token contract changes
  // to ensure fresh data is always fetched
  useEffect(() => {
    lastFetchedBalance.current = null;

    // Invalidate balance data when account or contracts change
    if (walletAccount && contracts?.token) {
      queryClient.invalidateQueries(['balance', walletAccount]);
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
  }, [contracts, walletAccount, queryClient]);

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

  // Optimized Balance Query with instant loading
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['balance', walletAccount, contracts?.token ? true : false],
    queryFn: async () => {
      if (!contracts?.token || !walletAccount) {
        return null;
      }

      try {
        // First, immediately return the cached balance data if available
        // This makes the UI feel instant even before the fetch completes
        if (lastFetchedBalance.current) {
          // Schedule a background refresh without blocking the UI
          setTimeout(() => {
            queryClient.invalidateQueries(['balance', walletAccount], {
              exact: false,
            });
          }, 0);
          return lastFetchedBalance.current;
        }

        const [balance, tokenAllowance] = await Promise.all([
          contracts.token.balanceOf(walletAccount),
          contracts.token.allowance(
            walletAccount,
            contracts.dice.address || contracts.dice.target
          ),
        ]);

        // Store the fetched data for future instant access
        const result = {
          balance,
          allowance: tokenAllowance,
        };
        lastFetchedBalance.current = result;
        return result;
      } catch (error) {
        return {
          balance: BigInt(0),
          allowance: BigInt(0),
        };
      }
    },
    enabled: !!contracts?.token && !!walletAccount,
    staleTime: 0, // Always consider data stale to get fresh data
    cacheTime: 5 * 60 * 1000, // Keep cached data for 5 minutes
    retry: 1, // Reduce retries to make fail-fast when there's an issue
    onError: error => {},
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
        // Force immediate refetch of all balance data
        try {
          // Create a small delay to let blockchain state settle
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Get fresh data for both balance and allowance
          const [newBalance, newAllowance] = await Promise.all([
            contracts.token.balanceOf(walletAccount),
            contracts.token.allowance(walletAccount, diceContractAddress),
          ]);

          // Update the cache directly with new data
          queryClient.setQueryData(['balance', walletAccount], {
            balance: newBalance,
            allowance: newAllowance,
          });

          // Also invalidate the query to ensure subsequent fetches get fresh data
          queryClient.invalidateQueries(['balance', walletAccount], {
            exact: true,
          });
        } catch (refetchError) {
          console.error('Error refetching data after approval:', refetchError);
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
  ]);

  // Validate bet amount against contract limits
  const validateBetAmount = useCallback(
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

    if (!chosenNumber) {
      addToast('Please select a number first', 'warning');
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
        const clearTimeout = setupSafetyTimeout(safetyTimeoutRef, () => {
          operationInProgress.current = false;
          setProcessingState(false);
          setRollingState(false);
          addToast('The bet operation timed out. Please try again.', 'error');
        });

        try {
          // Show notification
          addToast('Placing your bet...', 'info');

          // Convert chosen number to BigInt format for the contract call
          const chosenNumberBigInt = BigInt(chosenNumber);

          // Store transaction reference for tracking
          const tx = await contracts.dice.placeBet(
            chosenNumberBigInt,
            betAmount
          );
          pendingTxRef.current = tx;

          // Show pending notification
          addToast('Bet placed! Waiting for confirmation...', 'info');

          // Wait for transaction confirmation
          setRollingState(true);
          const receipt = await tx.wait();

          if (receipt && receipt.status === 1) {
            // Clear pending transaction reference
            pendingTxRef.current = null;

            // Process transaction result
            const gameResult = parseGameResultEvent(receipt);

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

              // Invalidate queries to refresh data
              queryClient.invalidateQueries(['balance', walletAccount]);
              queryClient.invalidateQueries(['gameHistory', walletAccount]);
              queryClient.invalidateQueries(['gameStats', walletAccount]);
            } else {
              addToast(
                'Could not parse game result. Check your transaction history.',
                'warning'
              );
            }
          } else {
            addToast('Transaction failed or was reverted', 'error');
          }
        } catch (error) {
          console.error('Place bet error:', error);
          handleError(error, 'handlePlaceBet');
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
    handleError,
    addToast,
    queryClient,
    isBetting,
    withBetting,
    setProcessingState,
    setRollingState,
    setLastResult,
  ]);

  // Derived state from balance data
  const hasNoTokens = useMemo(() => {
    // User has no tokens if balance exists and is zero
    return (
      balanceData?.balance !== undefined && balanceData.balance <= BigInt(0)
    );
  }, [balanceData]);

  const needsApproval = useMemo(() => {
    // User needs to approve if they have tokens but insufficient allowance
    return (
      balanceData?.balance !== undefined &&
      balanceData.balance > BigInt(0) &&
      balanceData.allowance !== undefined &&
      balanceData.allowance < betAmount
    );
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

  // Return all the necessary state and functions
  return {
    chosenNumber,
    betAmount,
    betAmountString,
    gameState,
    balanceData,
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
  };
};

export default useGameLogic;
