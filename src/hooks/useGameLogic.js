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

  const setBetAmount = useCallback(amount => {
    // Handle both string and BigInt inputs
    if (typeof amount === 'bigint') {
      setBetAmountRaw(amount.toString());
    } else {
      setBetAmountRaw(amount);
    }
  }, []);

  // Convert to BigInt when needed
  const betAmountBigInt = useMemo(() => {
    try {
      return BigInt(betAmount);
    } catch (error) {
      console.error('Invalid bet amount:', error);
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

  // Balance Query with cleanup
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['balance', account, contracts?.token?.target],
    queryFn: async () => {
      if (!contracts?.token || !account) return null;

      const [balance, tokenAllowance] = await Promise.all([
        contracts.token.balanceOf(account),
        contracts.token.allowance(account, contracts.dice.target),
      ]);

      return {
        balance,
        allowance: tokenAllowance,
      };
    },
    enabled: !!contracts?.token && !!account,
    refetchInterval: 5000,
    staleTime: 2000,
    cacheTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Cleanup queries on unmount
  useEffect(() => {
    return () => {
      queryClient.cancelQueries(['balance', account]);
    };
  }, [queryClient, account]);

  // Handle token approval
  const handleApproveToken = useCallback(async () => {
    if (
      !contracts?.token ||
      !contracts?.dice ||
      !account ||
      betAmount <= BigInt(0) ||
      operationInProgress.current
    ) {
      return;
    }

    operationInProgress.current = true;
    await withApproving(async () => {
      try {
        await checkAndApproveToken(
          contracts.token,
          contracts.dice.target,
          betAmount,
          account,
          setProcessingState,
          addToast
        );

        // Refresh balance data after approval
        await queryClient.invalidateQueries(['balance', account]);
      } catch (error) {
        handleError(error, 'approveToken');
      } finally {
        operationInProgress.current = false;
      }
    });
  }, [
    contracts,
    account,
    betAmount,
    queryClient,
    addToast,
    handleError,
    withApproving,
    setProcessingState,
  ]);

  // Handle placing a bet
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
    await withBetting(async () => {
      try {
        setProcessingState(true);
        setRollingState(true);
        setLastResult(null);

        // Check and handle token approval if needed
        const currentAllowance = await contracts.token.allowance(
          account,
          contracts.dice.target
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
