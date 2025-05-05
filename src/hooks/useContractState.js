import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDiceContract } from './useDiceContract';
import { useWallet } from './useWallet';
import { useNotification } from '../contexts/NotificationContext';
import { useEffect } from 'react';

export const useContractState = () => {
  const { contract } = useDiceContract();
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
        throw new Error('Contract not initialized');
      }

      try {
        const [isPaused, contractOwner] = await Promise.all([
          contract.paused(),
          contract.owner(),
        ]);

        return {
          isPaused,
          isOwner: account?.toLowerCase() === contractOwner?.toLowerCase(),
        };
      } catch (error) {
        console.error('Error fetching contract state:', error);
        throw error;
      }
    },
    enabled: !!contract && !!account,
    staleTime: 0, // Always consider data stale immediately
    cacheTime: 0, // Don't cache data at all
    refetchInterval: 5000, // Refetch data every 5 seconds
    refetchIntervalInBackground: false, // Only refetch when tab is in focus
  });

  // Mutation for pausing contract
  const pauseMutation = useMutation({
    mutationFn: async () => {
      if (!contract || !account) {
        throw new Error('Contract or account not available');
      }

      const tx = await contract.pause();
      await tx.wait();
    },
    onSuccess: () => {
      addToast('Contract paused successfully', 'success');
      queryClient.invalidateQueries(['contractState']);
    },
    onError: error => {
      console.error('Error pausing contract:', error);
      addToast(error.message || 'Failed to pause contract', 'error');
    },
  });

  // Mutation for unpausing contract
  const unpauseMutation = useMutation({
    mutationFn: async () => {
      if (!contract || !account) {
        throw new Error('Contract or account not available');
      }

      const tx = await contract.unpause();
      await tx.wait();
    },
    onSuccess: () => {
      addToast('Contract unpaused successfully', 'success');
      queryClient.invalidateQueries(['contractState']);
    },
    onError: error => {
      console.error('Error unpausing contract:', error);
      addToast(error.message || 'Failed to unpause contract', 'error');
    },
  });

  // Set up event listeners for contract state changes
  useEffect(() => {
    if (!contract) return;

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

    contract.on('Paused', handlePaused);
    contract.on('Unpaused', handleUnpaused);
    contract.on('OwnershipTransferred', handleOwnershipTransferred);

    return () => {
      contract.removeAllListeners('Paused');
      contract.removeAllListeners('Unpaused');
      contract.removeAllListeners('OwnershipTransferred');
    };
  }, [contract, queryClient, addToast]);

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
