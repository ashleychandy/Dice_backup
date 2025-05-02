import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useMemo } from 'react';
import gameService from '../services/gameService';
import { useWallet } from './useWallet';
import { useDiceContract } from './useDiceContract';

// Constants from contract
const GAME_TIMEOUT = 3600; // 1 hour in seconds
const BLOCK_THRESHOLD = 300;
const MAX_NUMBER = 6;

/**
 * Hook for managing and monitoring game status
 * Aligns with contract's getGameStatus function and related state checks
 */
export const useGameStatus = playerAddress => {
  const { account } = useWallet();
  const { contract: diceContract } = useDiceContract();
  const queryClient = useQueryClient();
  const pollingIntervalRef = useRef(null);
  const address = playerAddress || account;

  // Query key for this specific game status - wrapped in useMemo to fix deps warning
  const queryKey = useMemo(() => ['gameStatus', address], [address]);

  // Main query for game status
  const {
    data: gameStatus,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!address) return null;

      try {
        // Get detailed game status
        const status = await gameService.debugGameState(address);

        // Get recovery eligibility
        const recovery =
          await gameService.checkGameRecoveryEligibility(address);

        // Get additional game state
        const canStart = await diceContract.canStartNewGame(address);
        const hasPending = await diceContract.hasPendingRequest(address);

        // Combine all data
        return {
          ...status,
          ...recovery,
          canStartNewGame: canStart,
          hasPendingRequest: hasPending,
          timestamp: Date.now(),
        };
      } catch (err) {
        console.error('Error fetching game status:', err);
        throw err;
      }
    },
    enabled: !!address && !!diceContract,
    staleTime: 5000,
    cacheTime: 30000,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Force refresh function
  const forceRefresh = useCallback(async () => {
    queryClient.removeQueries(queryKey);
    return refetch();
  }, [queryClient, refetch, queryKey]);

  // Setup polling for active games
  useEffect(() => {
    if (gameStatus?.gameStatus?.isActive && !pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(() => {
        forceRefresh();
      }, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [gameStatus?.gameStatus?.isActive, forceRefresh]);

  // Subscribe to relevant contract events
  useEffect(() => {
    if (!diceContract || !address) return;

    const handleGameEvent = async () => {
      await forceRefresh();
    };

    diceContract.on('GameStarted', handleGameEvent);
    diceContract.on('GameCompleted', handleGameEvent);
    diceContract.on('GameRecovered', handleGameEvent);
    diceContract.on('GameForceStopped', handleGameEvent);

    return () => {
      diceContract.off('GameStarted', handleGameEvent);
      diceContract.off('GameCompleted', handleGameEvent);
      diceContract.off('GameRecovered', handleGameEvent);
      diceContract.off('GameForceStopped', handleGameEvent);
    };
  }, [diceContract, address, forceRefresh]);

  // Calculate recovery eligibility
  const recoveryStatus = useMemo(() => {
    if (!gameStatus?.gameStatus?.isActive) return null;

    const lastPlayTimestamp = Number(gameStatus.lastPlayTimestamp || 0);
    const currentTime = Math.floor(Date.now() / 1000);
    const elapsedTime = currentTime - lastPlayTimestamp;

    return {
      timeElapsed: elapsedTime,
      timeoutReached: elapsedTime >= GAME_TIMEOUT,
      blockThresholdReached: gameStatus.blocksPassed >= BLOCK_THRESHOLD,
      canRecover: gameStatus.recoveryEligible,
      timeUntilRecovery: Math.max(0, GAME_TIMEOUT - elapsedTime),
    };
  }, [gameStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return {
    // Game state from contract
    gameStatus,
    isActive: gameStatus?.gameStatus?.isActive || false,
    isCompleted: gameStatus?.gameStatus?.isCompleted || false,
    canStartNewGame: gameStatus?.canStartNewGame || false,
    isStuck: gameStatus?.isStuck || false,
    needsRecovery: gameStatus?.needsRecovery || false,
    hasPendingRequest: gameStatus?.hasPendingRequest || false,

    // Game details
    chosenNumber: gameStatus?.gameStatus?.chosenNumber || 0,
    result: gameStatus?.gameStatus?.result || 0,
    amount: gameStatus?.gameStatus?.amount || '0',
    payout: gameStatus?.gameStatus?.payout || '0',

    // Recovery status
    recoveryEligible: gameStatus?.eligible || false,
    secondsUntilRecovery: gameStatus?.secondsUntilEligible || null,
    lastPlayTimestamp: gameStatus?.lastPlayTimestamp || 0,
    recoveryStatus,

    // Request status
    requestId: gameStatus?.gameStatus?.requestId || '0',
    requestExists: gameStatus?.gameStatus?.requestExists || false,
    requestProcessed: gameStatus?.gameStatus?.requestProcessed || false,

    // Loading states
    isLoading,
    error,

    // Actions
    forceRefresh,

    // Constants
    GAME_TIMEOUT,
    BLOCK_THRESHOLD,
    MAX_NUMBER,
  };
};
