import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useWallet } from '../components/wallet/WalletProvider';
import { useNotification } from '../contexts/NotificationContext';
import { safeContractCall } from '../utils/contractUtils';
import { useDiceContract } from './useDiceContract';

export const useContractState = () => {
  const { contract, tokenContract } = useDiceContract();
  const { account } = useWallet();
  const queryClient = useQueryClient();
  const { addToast } = useNotification();

  // Query for contract pause state
  const {
    data: contractState,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['contractState'],
    queryFn: async () => {
      if (!contract) {
        return { isPaused: false, isOwner: false };
      }

      try {
        // Use Promise.allSettled with our new safeContractCall utility
        const [pausedResult, ownerResult] = await Promise.allSettled([
          // Use safeContractCall for better error handling
          safeContractCall(contract, 'paused', [], false),
          safeContractCall(contract, 'owner', [], null),
        ]);

        // Extract results or use defaults
        const isPaused =
          pausedResult.status === 'fulfilled' ? pausedResult.value : false;
        const contractOwner =
          ownerResult.status === 'fulfilled' ? ownerResult.value : null;

        return {
          isPaused,
          isOwner: account?.toLowerCase() === contractOwner?.toLowerCase(),
        };
      } catch (error) {
        // Return a default state instead of throwing, to avoid breaking the UI
        return { isPaused: false, isOwner: false };
      }
    },
    enabled: !!contract,
    staleTime: 30000, // Consider data fresh for 30 seconds
    cacheTime: 60000, // Cache data for 1 minute
    retry: 1, // Only retry once
    refetchInterval: 5000, // Refetch data every 5 seconds
    refetchIntervalInBackground: true, // Continue refetching even when tab is not in focus
    onError: _error => {
      // Don't show toast for this error as it might be frequent
    },
  });

  // Mutation for pausing contract
  const pauseMutation = useMutation({
    mutationFn: async () => {
      if (!contract || !account) {
        throw new Error('Contract or account not available');
      }

      // Use safeContractCall with custom error handling and transaction options
      const tx = await safeContractCall(
        contract,
        'pause',
        [],
        null,
        error => {
          throw error;
        }, // Rethrow to trigger onError
        addToast
      );

      if (!tx) throw new Error('Failed to pause contract');

      await tx.wait();
      return true;
    },
    onSuccess: () => {
      addToast('Contract paused successfully', 'success');
      queryClient.invalidateQueries(['contractState']);
    },
    onError: error => {
      addToast(error.message || 'Failed to pause contract', 'error');
    },
  });

  // Mutation for unpausing contract
  const unpauseMutation = useMutation({
    mutationFn: async () => {
      if (!contract || !account) {
        throw new Error('Contract or account not available');
      }

      // Use safeContractCall with custom error handling and transaction options
      const tx = await safeContractCall(
        contract,
        'unpause',
        [],
        null,
        error => {
          throw error;
        }, // Rethrow to trigger onError
        addToast
      );

      if (!tx) throw new Error('Failed to unpause contract');

      await tx.wait();
      return true;
    },
    onSuccess: () => {
      addToast('Contract unpaused successfully', 'success');
      queryClient.invalidateQueries(['contractState']);
    },
    onError: error => {
      addToast(error.message || 'Failed to unpause contract', 'error');
    },
  });

  // Set up event listeners for contract state changes
  useEffect(() => {
    if (!contract) return;

    let cleanupFunction = () => {}; // Define default cleanup

    try {
      const handlePaused = account => {
        queryClient.invalidateQueries(['contractState']);
        addToast(`Contract paused by ${account}`, 'info');
      };

      const handleUnpaused = account => {
        queryClient.invalidateQueries(['contractState']);
        addToast(`Contract unpaused by ${account}`, 'info');
      };

      const handleOwnershipTransferred = (previousOwner, newOwner) => {
        queryClient.invalidateQueries(['contractState']);
        addToast(
          `Contract ownership transferred from ${previousOwner} to ${newOwner}`,
          'info'
        );
      };
      const handleBetPlaced = (player, _requestId, _chosenSide, _amount) => {
        // Invalidate queries so UI will reflect external bets immediately
        queryClient.invalidateQueries({ queryKey: ['gameStatus'] });
        queryClient.invalidateQueries({ queryKey: ['gameHistory'] });
        queryClient.invalidateQueries({ queryKey: ['balance'] });

        // Optionally notify the user if the bet belongs to them
        try {
          if (
            player &&
            account &&
            player.toLowerCase() === account.toLowerCase()
          ) {
            addToast('A bet was placed from your account (external)', 'info');
          }
        } catch (err) {
          // ignore
        }
      };

      const handleGameCompleted = (player, _requestId, _result, _payout) => {
        queryClient.invalidateQueries({ queryKey: ['gameStatus'] });
        queryClient.invalidateQueries({ queryKey: ['gameHistory'] });
        queryClient.invalidateQueries({ queryKey: ['balance'] });

        try {
          if (
            player &&
            account &&
            player.toLowerCase() === account.toLowerCase()
          ) {
            addToast('Your game completed (external)', 'success');
          }
        } catch (err) {
          // ignore
        }
      };

      // Handler for ERC20 Approval events on the token contract
      const handleTokenApproval = (owner, spender, value) => {
        try {
          // Debug: log approval events so we can confirm event emission in browser
          try {
            console.debug &&
              console.debug('[useContractState] Approval', {
                owner,
                spender,
                value,
              });
          } catch (_e) {
            return;
          }

          // Only refresh balance/allowance for the connected account
          if (
            !owner ||
            !account ||
            owner.toLowerCase() !== account.toLowerCase()
          ) {
            return;
          }

          // Invalidate balance-related queries immediately and schedule retries
          // to account for RPC indexing delays or providers that don't emit events reliably.
          try {
            queryClient.invalidateQueries({ queryKey: ['balance'] });
          } catch (err) {
            // ignore
          }

          // Also schedule follow-up invalidations to ensure UI picks up the change
          setTimeout(() => {
            try {
              queryClient.invalidateQueries({ queryKey: ['balance'] });
            } catch (err) {
              // ignore
            }
          }, 1500);

          setTimeout(() => {
            try {
              queryClient.invalidateQueries({ queryKey: ['balance'] });
            } catch (err) {
              // ignore
            }
          }, 4000);

          // Notify the user the approval updated
          addToast('Token approval updated', 'success');
        } catch (err) {
          // ignore
        }
      };

      // Safely add event listeners with error handling
      try {
        contract.on('Paused', handlePaused);
        contract.on('Unpaused', handleUnpaused);
        contract.on('OwnershipTransferred', handleOwnershipTransferred);

        // Game events
        contract.on('BetPlaced', handleBetPlaced);
        contract.on('GameCompleted', handleGameCompleted);

        // Token approval event (ERC20)
        if (tokenContract && typeof tokenContract.on === 'function') {
          tokenContract.on('Approval', handleTokenApproval);
        }
      } catch (err) {
        // Silent error for event listeners setup
      }

      cleanupFunction = () => {
        try {
          contract.removeAllListeners('Paused');
          contract.removeAllListeners('Unpaused');
          contract.removeAllListeners('OwnershipTransferred');
          contract.removeAllListeners('BetPlaced');
          contract.removeAllListeners('GameCompleted');

          if (
            tokenContract &&
            typeof tokenContract.removeAllListeners === 'function'
          ) {
            tokenContract.removeAllListeners('Approval');
          }
        } catch (error) {
          // Error in cleanup - ignore and keep default no-op cleanup
        }
      };
    } catch (err) {
      // Ignore errors during event handler setup
    }

    return cleanupFunction;
  }, [contract, tokenContract, queryClient, addToast, account]);

  return {
    contractState,
    isLoading,
    error,
    pauseContract: pauseMutation.mutate,
    unpauseContract: unpauseMutation.mutate,
    isPausing: pauseMutation.isLoading,
    isUnpausing: unpauseMutation.isLoading,
  };
};
