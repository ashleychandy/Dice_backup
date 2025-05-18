import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDiceContract } from './useDiceContract';
import { useWallet } from '../components/wallet/WalletProvider';
import { useNotification } from '../contexts/NotificationContext';
import { useEffect } from 'react';
import { safeContractCall } from '../utils/contractUtils';
import { ethers } from 'ethers';

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
        addToast,
        { gasLimit: ethers.parseUnits('200000', 'wei') }
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
        addToast,
        { gasLimit: ethers.parseUnits('200000', 'wei') }
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

      // Safely add event listeners with error handling
      try {
        contract.on('Paused', handlePaused);
        contract.on('Unpaused', handleUnpaused);
        contract.on('OwnershipTransferred', handleOwnershipTransferred);
      } catch (err) {
        // Silent error for event listeners setup
      }

      cleanupFunction = () => {
        try {
          contract.removeAllListeners('Paused');
          contract.removeAllListeners('Unpaused');
          contract.removeAllListeners('OwnershipTransferred');
        } catch (err) {
          // Silent error for event listeners removal
        }
      };
    } catch (error) {
      // Error in setup - cleanupFunction remains as empty function
    }

    return cleanupFunction;
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
