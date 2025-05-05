import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useDiceContract } from './useDiceContract';
import { useNotification } from '../contexts/NotificationContext';

// Constants from contract
const GAME_TIMEOUT = 3600; // 1 hour in seconds
const BLOCK_THRESHOLD = 300;

/**
 * Hook for managing game recovery and force stop functionality
 * Aligns with contract's recoverOwnStuckGame and forceStopGame functions
 */
export const useGameRecovery = ({ onSuccess, onError } = {}) => {
  const { account } = useWallet();
  const { contract: diceContract } = useDiceContract();
  const queryClient = useQueryClient();
  const { addToast } = useNotification();

  // Mutation for self-recovery
  const {
    mutate: recoverGame,
    isLoading: isRecovering,
    error: recoveryError,
  } = useMutation({
    mutationFn: async () => {
      if (!account || !diceContract) {
        throw new Error('Wallet not connected or contract not initialized');
      }

      try {
        const tx = await diceContract.recoverOwnStuckGame();
        const receipt = await tx.wait();
        return receipt;
      } catch (error) {
        console.error('Game recovery failed:', error);
        throw error;
      }
    },
    onSuccess: data => {
      addToast({
        title: 'Game Recovery Successful',
        description: 'Your stuck game has been recovered and refunded.',
        type: 'success',
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries(['gameStatus']);
      queryClient.invalidateQueries(['betHistory']);

      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: error => {
      addToast({
        title: 'Game Recovery Failed',
        description:
          error.message || 'Failed to recover game. Please try again.',
        type: 'error',
      });

      if (onError) {
        onError(error);
      }
    },
  });

  // Mutation for force stop (admin only)
  const {
    mutate: forceStopGame,
    isLoading: isForceStoping,
    error: forceStopError,
  } = useMutation({
    mutationFn: async playerAddress => {
      if (!diceContract) {
        throw new Error('Contract not initialized');
      }

      if (!playerAddress) {
        throw new Error('Player address required');
      }

      try {
        const tx = await diceContract.forceStopGame(playerAddress);
        const receipt = await tx.wait();
        return receipt;
      } catch (error) {
        console.error('Force stop failed:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      addToast({
        title: 'Force Stop Successful',
        description: `Game force stopped for player ${variables}`,
        type: 'success',
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries(['gameStatus', variables]);
      queryClient.invalidateQueries(['betHistory', variables]);

      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: error => {
      addToast({
        title: 'Force Stop Failed',
        description:
          error.message || 'Failed to force stop game. Please try again.',
        type: 'error',
      });

      if (onError) {
        onError(error);
      }
    },
  });

  // Check if game is eligible for recovery
  const checkRecoveryEligibility = useCallback(
    async playerAddress => {
      if (!diceContract) return null;

      const address = playerAddress || account;
      if (!address) return null;

      try {
        const gameStatus = await diceContract.getGameStatus(address);
        const {
          isActive,
          requestId,
          requestExists,
          requestProcessed,
          recoveryEligible,
          lastPlayTimestamp,
        } = gameStatus;

        if (!isActive) return { eligible: false, reason: 'No active game' };

        const currentTime = Math.floor(Date.now() / 1000);
        const elapsedTime = currentTime - Number(lastPlayTimestamp);

        return {
          eligible: recoveryEligible,
          isActive,
          requestStatus: {
            id: requestId.toString(),
            exists: requestExists,
            processed: requestProcessed,
          },
          timeStatus: {
            elapsed: elapsedTime,
            timeoutReached: elapsedTime >= GAME_TIMEOUT,
            secondsUntilEligible: Math.max(0, GAME_TIMEOUT - elapsedTime),
          },
        };
      } catch (error) {
        console.error('Error checking recovery eligibility:', error);
        return null;
      }
    },
    [diceContract, account]
  );

  return {
    // Recovery actions
    recoverGame,
    forceStopGame,
    checkRecoveryEligibility,

    // Loading states
    isRecovering,
    isForceStoping,

    // Errors
    recoveryError,
    forceStopError,

    // Constants
    GAME_TIMEOUT,
    BLOCK_THRESHOLD,
  };
};
