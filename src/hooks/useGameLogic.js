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
import { handleContractError } from '../utils/errorHandling';

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
    // Add placeBet method to contract if it has playDice but not placeBet
    if (
      contracts?.dice &&
      typeof contracts.dice.playDice === 'function' &&
      typeof contracts.dice.placeBet !== 'function'
    ) {
      console.log(
        'Adding placeBet method to dice contract as wrapper for playDice'
      );
      // Use bind to ensure 'this' context is preserved
      contracts.dice.placeBet = contracts.dice.playDice.bind(contracts.dice);
    }

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
    refetchInterval: 5000, // Refetch data every 5 seconds
    refetchIntervalInBackground: true, // Continue refetching even when tab is not in focus
    refetchOnWindowFocus: true,
    onError: error => {
      console.error('Balance query failed:', error);
    },
  });

  // Handle approving tokens with optimistic updates
  const handleApproveToken = useCallback(async () => {
    if (!contracts?.token || !contracts?.dice || !walletAccount) {
      const errorMessage = !contracts?.token
        ? 'Token contract not connected'
        : !contracts?.dice
          ? 'Game contract not connected'
          : 'Wallet not connected';

      console.error(`Approval failed: ${errorMessage}`);
      addToast(
        `Cannot approve tokens: ${errorMessage}. This may be a network issue.`,
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
      addToast(
        'The approval operation timed out. This could be due to network congestion or wallet issues.',
        'error'
      );
    });

    try {
      // Get the current network from provider
      let currentChainId;
      try {
        if (window.ethereum) {
          const chainIdHex = await window.ethereum.request({
            method: 'eth_chainId',
          });
          currentChainId = parseInt(chainIdHex, 16);
          console.log(`Current chain ID during approval: ${currentChainId}`);
        }
      } catch (networkError) {
        console.warn('Could not detect current network:', networkError);
      }

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
        // Check if we might be on the wrong network
        let networkIssue = false;

        try {
          if (window.ethereum) {
            const newChainIdHex = await window.ethereum.request({
              method: 'eth_chainId',
            });
            const newChainId = parseInt(newChainIdHex, 16);

            // If chain ID changed during the operation, it was likely a network issue
            if (currentChainId && newChainId !== currentChainId) {
              networkIssue = true;
              addToast(
                'Network appears to have changed during approval. Please ensure you stay on the same network throughout the operation.',
                'warning'
              );
            }
          }
        } catch (networkCheckError) {
          console.warn(
            'Error checking for network changes:',
            networkCheckError
          );
        }

        if (!networkIssue) {
          // If approval failed, show a detailed error message
          addToast(
            'Token approval failed. This could be due to network congestion or wallet connection issues. Please try again.',
            'error'
          );
        }

        // Add debug information to console
        console.info('Debug information for approval failure:', {
          walletConnected: !!walletAccount,
          tokenContract: !!contracts?.token,
          diceContract: !!contracts?.dice,
          diceAddress: diceContractAddress,
          chainId: currentChainId,
        });
      }
    } catch (error) {
      console.error('Token approval error:', error);

      // Check for network-related errors
      if (
        error.message &&
        (error.message.includes('network') ||
          error.message.includes('chain') ||
          error.message.includes('connect') ||
          error.message.includes('metadata') ||
          error.message.includes('provider'))
      ) {
        addToast(
          'Network connection issue detected. Please check your wallet connection and make sure you are on the correct XDC network.',
          'error'
        );
      } else {
        handleError(error, 'handleApproveToken');
      }
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
      addToast({
        title: 'Connection Error',
        description: 'Cannot place bet: wallet or contract connection issue',
        type: 'error',
      });
      return;
    }

    // Validate that a number is chosen
    if (chosenNumber === null || chosenNumber === undefined) {
      addToast({
        title: 'Invalid Input',
        description: 'Please select a number first',
        type: 'warning',
      });
      return;
    }

    // Ensure chosenNumber is between 1-6
    if (chosenNumber < 1 || chosenNumber > 6) {
      addToast({
        title: 'Invalid Input',
        description: 'Please select a valid number between 1 and 6',
        type: 'warning',
      });
      return;
    }

    if (betAmount <= BigInt(0)) {
      addToast({
        title: 'Invalid Input',
        description: 'Please enter a valid bet amount',
        type: 'warning',
      });
      return;
    }

    // Prevent multiple betting attempts
    if (operationInProgress.current || isBetting) {
      addToast({
        title: 'Operation in Progress',
        description: 'A game is already in progress',
        type: 'warning',
      });
      return;
    }

    operationInProgress.current = true;

    try {
      await withBetting(async () => {
        // Update UI state immediately
        setProcessingState(true);
        setRollingState(true);

        // Setup safety timeout
        const clearTimeout = setupSafetyTimeout(
          safetyTimeoutRef,
          () => {
            operationInProgress.current = false;
            setProcessingState(false);
            setRollingState(false);
            addToast({
              title: 'Operation Timeout',
              description: 'The bet operation timed out. Please try again.',
              type: 'error',
            });
          },
          90000
        );

        try {
          // Check contract availability
          if (
            !contracts.dice ||
            (typeof contracts.dice.placeBet !== 'function' &&
              typeof contracts.dice.playDice !== 'function')
          ) {
            throw new Error('Dice contract is not properly initialized');
          }

          // Balance verification with fresh data
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
              handleContractError(balanceError, addToast);
              return;
            }
          }

          // Show notification
          addToast({
            title: 'Placing Bet',
            description: 'Placing your bet...',
            type: 'info',
          });

          // Convert chosen number to proper format
          let chosenNumberBigInt;
          try {
            chosenNumberBigInt = BigInt(chosenNumber);
            if (
              chosenNumberBigInt < BigInt(1) ||
              chosenNumberBigInt > BigInt(6)
            ) {
              throw new Error('Invalid dice number after conversion');
            }
          } catch (conversionError) {
            throw new Error(
              'Invalid dice number. Please select a number between 1 and 6.'
            );
          }

          // Add transaction options
          const txOptions = {
            gasLimit: ethers.parseUnits('500000', 'wei'),
          };

          // Place bet
          let tx;
          try {
            if (typeof contracts.dice.placeBet === 'function') {
              console.log('Using placeBet method');
              tx = await contracts.dice.placeBet(
                chosenNumberBigInt,
                betAmount,
                txOptions
              );
            } else if (typeof contracts.dice.playDice === 'function') {
              console.log('Using playDice method as fallback');
              tx = await contracts.dice.playDice(
                chosenNumberBigInt,
                betAmount,
                txOptions
              );
            } else {
              throw new Error(
                'No valid dice method found (placeBet or playDice)'
              );
            }
            pendingTxRef.current = tx;
          } catch (txError) {
            handleContractError(txError, addToast);
            return;
          }

          // Show pending notification
          addToast({
            title: 'Bet Placed',
            description: 'Bet placed! Waiting for confirmation...',
            type: 'info',
          });

          // Wait for transaction confirmation
          try {
            const receipt = await tx.wait();
            console.log('Transaction confirmed:', receipt);

            // Update queries and state
            invalidateQueries(['balance', 'gameStatus', 'betHistory']);

            // Set last result for animation
            setLastResult({
              txHash: receipt.hash,
              timestamp: Date.now(),
              isPending: true,
              vrfPending: true,
            });
          } catch (confirmError) {
            handleContractError(confirmError, addToast);
          }
        } catch (error) {
          handleContractError(error, addToast);
        } finally {
          // Clean up resources
          clearTimeout();
          pendingTxRef.current = null;
          operationInProgress.current = false;

          // Reset processing state to allow new bets
          setProcessingState(false);

          // Only reset rolling state if we don't have a VRF-pending result
          // This allows VRF popups and latest bet info to continue displaying
          const currentResult = queryClient.getQueryData(['lastResult']);
          if (!currentResult || !currentResult.vrfPending) {
            setRollingState(false);
          }
        }
      });
    } catch (error) {
      console.error('Error in withBetting wrapper:', error);
      operationInProgress.current = false;
      setProcessingState(false);
      setRollingState(false);
      handleContractError(error, addToast);
    }
  }, [
    contracts,
    walletAccount,
    chosenNumber,
    betAmount,
    balanceData,
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
      // For debugging purposes, log the current balance data
      console.log('Checking approval needs:', {
        balance: balanceData?.balance
          ? balanceData.balance.toString()
          : 'undefined',
        allowance: balanceData?.allowance
          ? balanceData.allowance.toString()
          : 'undefined',
        betAmount: betAmount.toString(),
      });

      // If we don't have balance data yet, we can't determine if approval is needed
      if (!balanceData) {
        console.log('No balance data available yet, deferring approval check');
        return false;
      }

      // Convert to BigInt with safe fallbacks
      const balanceBigInt = balanceData.balance
        ? BigInt(balanceData.balance.toString())
        : BigInt(0);
      const allowanceBigInt = balanceData.allowance
        ? BigInt(balanceData.allowance.toString())
        : BigInt(0);
      const betAmountBigInt = BigInt(betAmount.toString());

      // If balance is zero, no need to approve (can't bet anyway)
      if (balanceBigInt <= BigInt(0)) {
        console.log('Balance is zero or negative, no approval needed');
        return false;
      }

      // Check if allowance is less than bet amount
      const needsApproval = allowanceBigInt < betAmountBigInt;
      console.log(
        `Approval check result: ${needsApproval ? 'Needs approval' : 'Already approved'}`
      );

      return needsApproval;
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

  // Add a function to check for VRF results in history
  const checkVrfResultInHistory = async txHash => {
    try {
      // Only proceed if we still have a pending VRF
      const currentResult = queryClient.getQueryData(['lastResult']);
      if (!currentResult || !currentResult.vrfPending) {
        console.log('No pending VRF result to check for');
        return;
      }

      console.log('Checking game history for VRF result for tx:', txHash);

      // Fetch the latest history data
      await queryClient.invalidateQueries(['gameHistory']);
      const historyData = queryClient.getQueryData(['gameHistory']);

      if (historyData && historyData.length > 0) {
        // Find a matching transaction in history
        const matchingGame = historyData.find(
          game =>
            game.txHash === txHash ||
            (game.timestamp &&
              currentResult.timestamp &&
              Math.abs(game.timestamp - currentResult.timestamp) < 60)
        );

        if (
          matchingGame &&
          matchingGame.rolledNumber >= 1 &&
          matchingGame.rolledNumber <= 6
        ) {
          console.log('✅ Found matching game in history:', matchingGame);

          // Create a complete result with the VRF data
          const completeResult = {
            ...currentResult,
            rolledNumber: matchingGame.rolledNumber,
            payout: BigInt(matchingGame.payout || '0'),
            isWin: matchingGame.isWin,
            vrfComplete: true,
            vrfPending: false,
            isPending: false,
          };

          // Update the game state with the complete result
          setLastResult(completeResult);

          // IMPORTANT: Explicitly stop rolling animation when VRF result is found
          setRollingState(false);

          // Show a notification
          if (completeResult.isWin) {
            addToast(`🎉 VRF completed - You won!`, 'success');
          } else {
            addToast(`VRF completed - Better luck next time!`, 'info');
          }

          // Force refresh all data
          invalidateQueries(['balance', 'gameHistory', 'gameStats']);
        } else {
          console.log('💤 No matching game found in history yet, will retry');
          // If still not found, schedule another check in a few seconds (max 5 retries)
          if (!currentResult.vrfRetryCount || currentResult.vrfRetryCount < 5) {
            // Update retry count
            setLastResult(prev => ({
              ...prev,
              vrfRetryCount: (prev.vrfRetryCount || 0) + 1,
            }));

            setTimeout(() => checkVrfResultInHistory(txHash), 5000);
          } else {
            console.log(
              '⚠️ Maximum VRF retry count reached, marking as incomplete'
            );
            // After max retries, mark the VRF as complete but with unknown result
            setLastResult(prev => ({
              ...prev,
              vrfComplete: true,
              vrfPending: false,
              isPending: false,
              vrfTimedOut: true,
            }));

            // Stop the rolling animation
            setRollingState(false);

            addToast(
              'Unable to retrieve VRF result. Please check your history.',
              'warning'
            );
          }
        }
      } else {
        // If no history data, retry
        setTimeout(() => checkVrfResultInHistory(txHash), 5000);
      }
    } catch (error) {
      console.error('Error checking VRF result in history:', error);
      // On error, make sure we stop the animation after a few retries
      const currentResult = queryClient.getQueryData(['lastResult']);
      if (currentResult && currentResult.vrfRetryCount >= 3) {
        setRollingState(false);
      }
    }
  };

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
