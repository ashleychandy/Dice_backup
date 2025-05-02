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
  const [isApproving, setIsApproving] = useState(false);
  const [isBetting, withBetting] = useLoadingState(false);
  const handleError = useErrorHandler(onError, addToast);

  // Reset last fetched balance when account or token contract changes
  // to ensure fresh data is always fetched
  useEffect(() => {
    lastFetchedBalance.current = null;

    // Invalidate balance data when account or contracts change
    if (account && contracts?.token) {
      console.log('Account or contracts changed, refreshing balance data');
      queryClient.invalidateQueries(['balance', account]);
    }

    // Register global function to refresh balance data
    window.refreshBalanceData = accountAddress => {
      // If no account is provided, use the current one
      const targetAccount = accountAddress || account;
      if (targetAccount) {
        console.log('Refreshing balance data for account:', targetAccount);
        queryClient.invalidateQueries(['balance', targetAccount]);
      }
    };

    return () => {
      delete window.refreshBalanceData;
    };
  }, [contracts, account, queryClient]);

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
    queryKey: ['balance', account, contracts?.token ? true : false],
    queryFn: async () => {
      if (!contracts?.token || !account) {
        return null;
      }

      try {
        // First, immediately return the cached balance data if available
        // This makes the UI feel instant even before the fetch completes
        if (lastFetchedBalance.current) {
          // Schedule a background refresh without blocking the UI
          setTimeout(() => {
            queryClient.invalidateQueries(['balance', account], {
              exact: false,
            });
          }, 0);
          return lastFetchedBalance.current;
        }

        const [balance, tokenAllowance] = await Promise.all([
          contracts.token.balanceOf(account),
          contracts.token.allowance(
            account,
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
        console.error('Error fetching balance:', error);
        return {
          balance: BigInt(0),
          allowance: BigInt(0),
        };
      }
    },
    enabled: !!contracts?.token && !!account,
    staleTime: 0, // Always consider data stale to get fresh data
    cacheTime: 5 * 60 * 1000, // Keep cached data for 5 minutes
    retry: 1, // Reduce retries to make fail-fast when there's an issue
    onError: error => {
      console.error('Balance query error:', error);
    },
  });

  // Debug logging
  useEffect(() => {
    console.log('Contracts:', contracts);
    console.log('Account:', account);

    // Check if contracts are proxy objects and log their structure
    if (contracts?.token) {
      console.log('Token Contract Type:', typeof contracts.token);
      console.log('Token Contract Structure:', Object.keys(contracts.token));
      console.log(
        'Token Contract Address:',
        contracts.token.target || contracts.token.address
      );
    }

    if (contracts?.dice) {
      console.log('Dice Contract Type:', typeof contracts.dice);
      console.log('Dice Contract Structure:', Object.keys(contracts.dice));
      console.log(
        'Dice Contract Address:',
        contracts.dice.target || contracts.dice.address
      );
    }

    console.log('Token Contract Target:', contracts?.token?.target);
    console.log('Dice Contract Target:', contracts?.dice?.target);
  }, [contracts, account]);

  // Debug log when balance data changes
  useEffect(() => {
    console.log('Balance data updated:', balanceData);
  }, [balanceData]);

  // Cleanup queries on unmount
  useEffect(() => {
    return () => {
      queryClient.cancelQueries(['balance', account]);
    };
  }, [queryClient, account]);

  // Handle approving tokens with optimistic updates
  const handleApproveToken = useCallback(async () => {
    if (!contracts?.token || !contracts?.dice || !account) {
      console.error('Cannot approve tokens: contracts or account missing');
      addToast(
        'Cannot approve tokens: wallet or contract connection issue',
        'error'
      );
      return;
    }

    // Prevent multiple approval attempts
    if (operationInProgress.current) {
      console.log(
        'Approval operation already in progress, preventing duplicate'
      );
      addToast('Approval already in progress', 'info');
      return;
    }

    operationInProgress.current = true;
    setIsApproving(true);

    // Set local state immediately for better UI feedback
    setProcessingState(true);

    try {
      // Get the dice contract address (target for v6 ethers, address for v5)
      const diceContractAddress =
        contracts.dice.target || contracts.dice.address;

      console.log('Approving tokens for address:', {
        token: contracts.token.target || contracts.token.address,
        dice: diceContractAddress,
        account,
      });

      // Show initial toast
      addToast('Starting token approval process...', 'info');

      // Only update UI optimistically after transaction is sent, not before
      // We'll let checkAndApproveToken take care of the state

      // Call the enhanced token approval function with correct parameters
      // Use maxRetries=2 for up to 3 total attempts (initial + 2 retries)
      const success = await checkAndApproveToken(
        contracts.token,
        diceContractAddress,
        account,
        isProcessing => setProcessingState(isProcessing),
        addToast,
        2 // max retries
      );

      if (success) {
        console.log('Token approval successful');

        // Force immediate refetch of all balance data
        try {
          // Create a small delay to let blockchain state settle
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Get fresh data for both balance and allowance
          const [newBalance, newAllowance] = await Promise.all([
            contracts.token.balanceOf(account),
            contracts.token.allowance(account, diceContractAddress),
          ]);

          console.log(
            'Fetched new balance after approval:',
            newBalance.toString()
          );
          console.log(
            'Fetched new allowance after approval:',
            newAllowance.toString()
          );

          // If allowance still doesn't show as increased, use a max value
          // This ensures the UI lets the user proceed with betting
          const effectiveAllowance =
            newAllowance > BigInt(0) ? newAllowance : ethers.MaxUint256;

          // Update cache with the new values immediately
          queryClient.setQueryData(['balance', account, true], {
            balance: newBalance,
            allowance: effectiveAllowance,
          });

          // Also invalidate to ensure any other components get refreshed
          queryClient.invalidateQueries(['balance', account]);

          console.log('Balance data refreshed after approval:', {
            balance: newBalance.toString(),
            allowance: effectiveAllowance.toString(),
          });
        } catch (fetchError) {
          console.error(
            'Error fetching updated balance after approval:',
            fetchError
          );
          // Fall back to optimistically setting allowance to max
          const currentBalance = balanceData?.balance || BigInt(0);
          queryClient.setQueryData(['balance', account, true], {
            balance: currentBalance,
            allowance: ethers.MaxUint256, // Optimistically set to max approval on error
          });

          // Also invalidate to ensure any other components get refreshed
          queryClient.invalidateQueries(['balance', account]);
        }
      } else {
        console.error('Token approval failed');
        // Revert any optimistic updates
        queryClient.invalidateQueries(['balance', account]);

        // Clear any lingering processing state
        setProcessingState(false);

        // Inform user of failure if not already done by checkAndApproveToken
        addToast(
          'Token approval process could not be completed. Please try again.',
          'error'
        );
      }
    } catch (error) {
      console.error('Error in approval process:', error);
      // Revert optimistic update on error
      queryClient.invalidateQueries(['balance', account]);
      handleError(error, 'approveToken');

      // Clear any lingering processing state
      setProcessingState(false);
    } finally {
      // Ensure operation flag is reset even if there are errors
      operationInProgress.current = false;
      setIsApproving(false);
    }
  }, [
    contracts,
    account,
    queryClient,
    handleError,
    addToast,
    balanceData,
    setProcessingState,
  ]);

  // Handle placing a bet with optimistic updates
  const handlePlaceBet = useCallback(async () => {
    if (
      !contracts?.dice ||
      !account ||
      !chosenNumber ||
      betAmount <= BigInt(0) ||
      gameState.isProcessing ||
      operationInProgress.current
    ) {
      console.log('Debug - Bet preconditions not met:', {
        hasContracts: !!contracts?.dice,
        hasAccount: !!account,
        hasChosenNumber: !!chosenNumber,
        betAmountValid: betAmount > BigInt(0),
        isProcessing: gameState.isProcessing,
        operationInProgress: operationInProgress.current,
      });
      return;
    }

    operationInProgress.current = true;
    console.log('Debug - Starting bet placement:', {
      chosenNumber,
      betAmount: betAmount.toString(),
      currentGameState: gameState,
    });

    // Optimistically update the UI before the bet is confirmed
    const currentBalance = balanceData?.balance || BigInt(0);
    const currentAllowance = balanceData?.allowance || BigInt(0);

    // Update balance immediately for instant UI feedback
    queryClient.setQueryData(['balance', account, true], {
      balance: currentBalance - betAmount,
      allowance: currentAllowance - betAmount,
    });

    await withBetting(async () => {
      try {
        setProcessingState(true);
        setRollingState(true);
        console.log('Debug - Clearing previous result');
        setLastResult(null);

        // Get dice contract address
        const diceContractAddress =
          contracts.dice.address || contracts.dice.target;

        // Place the bet
        console.log('Debug - Placing bet:', {
          chosenNumber,
          betAmount: betAmount.toString(),
        });
        const tx = await contracts.dice.playDice(chosenNumber, betAmount);
        addToast('Bet placed, waiting for confirmation...', 'info');

        const receipt = await tx.wait();
        console.log('Debug - Transaction receipt:', receipt);

        // Get the result from the transaction events
        const event = parseGameResultEvent(receipt, contracts.dice.interface);
        console.log('Debug - Parsed game event:', event);

        if (event) {
          const [_player, _chosenNum, rolledNum, _betAmt, payout] = event.args;
          const isWin = payout > 0;

          console.log('Debug - Setting game result:', {
            rolledNumber: Number(rolledNum),
            isWin,
            payout: payout.toString(),
          });

          setRollingState(false);
          setLastResult({
            rolledNumber: Number(rolledNum),
            isWin,
            payout,
          });

          // Show appropriate message
          addToast(
            isWin
              ? `Congratulations! You won ${ethers.formatEther(payout)} GAMA!`
              : 'Better luck next time!',
            isWin ? 'success' : 'warning'
          );
        } else {
          console.error('Could not parse game result event from receipt');
          addToast('Bet confirmed, but could not determine result', 'warning');
          setRollingState(false);
        }

        // Refresh balances and game state
        await queryClient.invalidateQueries(['balance', account]);
      } catch (error) {
        // Revert optimistic update on error
        console.error('Debug - Error during bet:', error);
        queryClient.invalidateQueries(['balance', account]);
        handleError(error, 'placeBet');
        setRollingState(false);
        setLastResult(null);
      } finally {
        setProcessingState(false);
        operationInProgress.current = false;
      }
    });
  }, [
    contracts,
    account,
    chosenNumber,
    betAmount,
    gameState.isProcessing,
    queryClient,
    addToast,
    handleError,
    withBetting,
    setProcessingState,
    setRollingState,
    setLastResult,
    balanceData,
  ]);

  // Memoized derived state
  const gameStatus = useMemo(
    () => ({
      hasNoTokens: balanceData?.balance === BigInt(0),
      needsApproval:
        betAmount > BigInt(0) && balanceData?.allowance < betAmount,
      canPlaceBet:
        !gameState.isProcessing &&
        !operationInProgress.current &&
        chosenNumber != null &&
        betAmount > BigInt(0),
    }),
    [balanceData, betAmount, chosenNumber, gameState.isProcessing]
  );

  return {
    // State
    chosenNumber,
    betAmount,
    betAmountString,
    gameState,
    balanceData,
    balanceLoading,
    isApproving,
    isBetting,
    ...gameStatus,

    // Actions
    setChosenNumber,
    setBetAmount,
    handleApproveToken,
    handlePlaceBet,
  };
};

export default useGameLogic;
