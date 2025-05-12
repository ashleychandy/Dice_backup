import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGameStatus } from './useGameStatus';
import { useBetHistory } from './useBetHistory';
import { useContractState } from './useContractState';
import { useContractStats } from './useContractStats';
import { useContractConstants } from './useContractConstants';
import { useWallet } from '../components/wallet/WalletProvider';

export const useGameState = () => {
  const queryClient = useQueryClient();
  const { account } = useWallet();

  // Get all the required states
  const { gameStatus, isLoading: isGameStatusLoading } = useGameStatus();
  const { betHistory, isLoading: isBetHistoryLoading } = useBetHistory({
    playerAddress: account,
  });
  const { contractState, isLoading: isContractStateLoading } =
    useContractState();
  const { stats, isLoading: isStatsLoading } = useContractStats();
  const { constants } = useContractConstants();

  // Get the last result from cache
  const { data: lastResult } = useQuery({
    queryKey: ['lastResult'],
    enabled: false, // This query is only updated manually
  });

  // Derived states
  const canPlaceBet =
    !contractState?.isPaused &&
    (!gameStatus?.isActive || gameStatus?.isCompleted) &&
    !isGameStatusLoading;

  const isWaitingForResult =
    gameStatus?.isActive && !gameStatus?.isCompleted && !isGameStatusLoading;

  const hasActiveGame = gameStatus?.isActive && !isGameStatusLoading;

  const lastCompletedGame = betHistory?.[0];

  // State update functions
  const setLastResult = useCallback(
    result => {
      queryClient.setQueryData(['lastResult'], result);
    },
    [queryClient]
  );

  const invalidateGameState = useCallback(() => {
    if (!account) return;

    queryClient.invalidateQueries(['gameStatus', account]);
    queryClient.invalidateQueries(['betHistory', account]);
    queryClient.invalidateQueries(['balance', account]);
    queryClient.invalidateQueries(['contractStats']);
  }, [queryClient, account]);

  // Loading state
  const isLoading =
    isGameStatusLoading ||
    isBetHistoryLoading ||
    isContractStateLoading ||
    isStatsLoading;

  return {
    // Basic states
    gameStatus,
    betHistory,
    contractState,
    stats,
    constants,
    lastResult,
    lastCompletedGame,

    // Derived states
    canPlaceBet,
    isWaitingForResult,
    hasActiveGame,

    // Loading states
    isLoading,
    isGameStatusLoading,
    isBetHistoryLoading,
    isContractStateLoading,
    isStatsLoading,

    // Update functions
    setLastResult,
    invalidateGameState,

    // Validation helpers
    isValidBetAmount: useCallback(
      amount => {
        if (!stats?.maxBetAmount || !amount) return false;
        try {
          const betAmount = BigInt(amount.toString());
          return (
            betAmount >= constants.MIN_BET_AMOUNT &&
            betAmount <= stats.maxBetAmount
          );
        } catch (error) {
          return false;
        }
      },
      [stats, constants]
    ),

    isValidDiceNumber: useCallback(
      number => {
        if (!number) return false;
        const num = Number(number);
        return (
          num >= constants.MIN_DICE_NUMBER && num <= constants.MAX_DICE_NUMBER
        );
      },
      [constants]
    ),

    // Game state helpers
    getGameResult: useCallback(() => {
      if (!gameStatus) return null;

      return {
        isWin: gameStatus.isWin,
        isCompleted: gameStatus.isCompleted,
        chosenNumber: gameStatus.chosenNumber,
        rolledNumber: gameStatus.result,
        amount: gameStatus.amount,
        payout: gameStatus.payout,
      };
    }, [gameStatus]),

    getPendingRequest: useCallback(() => {
      if (!gameStatus) return null;

      return {
        exists: gameStatus.requestExists,
        processed: gameStatus.requestProcessed,
        id: gameStatus.requestId,
      };
    }, [gameStatus]),

    getRecoveryStatus: useCallback(() => {
      if (!gameStatus) return null;

      return {
        isEligible: gameStatus.recoveryEligible,
        lastPlayTimestamp: gameStatus.lastPlayTimestamp,
        timeElapsed: Date.now() / 1000 - gameStatus.lastPlayTimestamp,
        canRecover:
          gameStatus.recoveryEligible &&
          Date.now() / 1000 - gameStatus.lastPlayTimestamp >=
            constants.GAME_TIMEOUT,
      };
    }, [gameStatus, constants]),
  };
};
