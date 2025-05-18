import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useWallet } from '../components/wallet/WalletProvider';
import { useDiceContract } from './useDiceContract';
import { useNotification } from '../contexts/NotificationContext';
import { usePollingService } from '../services/pollingService.jsx';

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
  const { refreshData, gameStatus } = usePollingService();
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
        throw error;
      }
    },
    onSuccess: data => {
      addToast({
        title: 'Game Recovery Successful',
        description: 'Your stuck game has been recovered and refunded.',
        type: 'success',
      });

      // Refresh data from polling service
      refreshData();

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
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      addToast({
        title: 'Force Stop Successful',
        description: `Game force stopped for player ${variables}`,
        type: 'success',
      });

      // Refresh data from polling service
      refreshData();

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
      // If we need a specific address other than the current account,
      // we still need to make a direct contract call
      if (playerAddress && playerAddress !== account) {
        if (!diceContract) return null;

        try {
          const status = await diceContract.getGameStatus(playerAddress);
          return processGameStatusForRecovery(status);
        } catch (error) {
          return null;
        }
      }

      // For the current account, use the cached gameStatus from polling service
      if (gameStatus) {
        return processGameStatusForRecovery(gameStatus);
      }

      return null;
    },
    [diceContract, account, gameStatus]
  );

  // Helper function to process game status for recovery
  const processGameStatusForRecovery = status => {
    const {
      isActive,
      requestId,
      requestExists,
      requestProcessed,
      recoveryEligible,
      lastPlayTimestamp,
    } = status;

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
  };

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
