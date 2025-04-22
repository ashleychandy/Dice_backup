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
  const handleError = useErrorHandler(addToast, onError);
  const [isApproving, withApproving] = useLoadingState(false);
  const [isBetting, withBetting] = useLoadingState(false);
  const operationInProgress = useRef(false);
  const lastFetchedBalance = useRef(null);

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
      return;
    }

    operationInProgress.current = true;

    // Optimistically update UI before actual approval completes
    const currentBalance = balanceData?.balance || BigInt(0);
    queryClient.setQueryData(['balance', account, true], {
      balance: currentBalance,
      allowance: ethers.MaxUint256, // Optimistically set to max approval
    });

    await withApproving(async () => {
      try {
        const tx = await checkAndApproveToken(
          contracts.token,
          contracts.dice.target || contracts.dice.address,
          account
        );

        if (tx) {
          addToast('Successfully approved tokens for betting!', 'success');
          await queryClient.invalidateQueries(['balance', account]);
        }
      } catch (error) {
        // Revert optimistic update on error
        queryClient.invalidateQueries(['balance', account]);
        handleError(error, 'approveToken');
      } finally {
        operationInProgress.current = false;
      }
    });
  }, [
    contracts,
    account,
    withApproving,
    queryClient,
    handleError,
    addToast,
    balanceData,
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
      return;
    }

    operationInProgress.current = true;

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
        setLastResult(null);

        // Get dice contract address
        const diceContractAddress =
          contracts.dice.address || contracts.dice.target;

        // Check and handle token approval if needed
        const currentAllowance = await contracts.token.allowance(
          account,
          diceContractAddress
        );

        if (currentAllowance < betAmount) {
          await handleApproveToken();
        }

        // Place the bet
        const tx = await contracts.dice.playDice(chosenNumber, betAmount);
        const receipt = await tx.wait();

        // Get the result from the transaction events
        const event = parseGameResultEvent(receipt, contracts.dice.interface);

        if (event) {
          const [_player, _chosenNum, rolledNum, _betAmt, payout] = event.args;
          const isWin = payout > 0;

          setRollingState(false);
          setLastResult(Number(rolledNum));

          // Show appropriate message
          addToast(
            isWin
              ? `Congratulations! You won ${ethers.formatEther(payout)} GAMA!`
              : 'Better luck next time!',
            isWin ? 'success' : 'warning'
          );
        }

        // Refresh balances and game state
        await queryClient.invalidateQueries(['balance', account]);
      } catch (error) {
        // Revert optimistic update on error
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
    handleApproveToken,
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
