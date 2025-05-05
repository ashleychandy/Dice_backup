import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDiceContract } from './useDiceContract';
import { useWallet } from '../hooks/useWallet';
import { useNotification } from '../contexts/NotificationContext';
import { useEffect } from 'react';
import { ethers } from 'ethers';
import { DICE_CONTRACT_ADDRESS } from '../constants/contracts';
import DiceABI from '../contracts/abi/Dice.json';
import { safeContractCall } from '../utils/contractUtils';

export const useContractState = () => {
  const { contract } = useDiceContract();
  const { account, provider } = useWallet();
  const queryClient = useQueryClient();
  const { addToast } = useNotification();

  // Helper function for safer contract reads with ethers v6
  const safeReadContract = async (
    functionName,
    args = [],
    defaultValue,
    logName
  ) => {
    if (!provider || !DICE_CONTRACT_ADDRESS) return defaultValue;

    try {
      // Create ethers contract instance
      const contract = new ethers.Contract(
        DICE_CONTRACT_ADDRESS,
        DiceABI.abi,
        provider
      );

      return await safeContractCall(
        async () => {
          // Direct call to contract function using ethers
          const result = await contract[functionName](...args);

          // Extra validation
          if (result === undefined || result === null) {
            throw new Error('Empty data response');
          }

          return result;
        },
        defaultValue,
        logName || functionName,
        true
      );
    } catch (err) {
      console.warn(
        `Error in ${logName || functionName} with special handling:`,
        err
      );
      return defaultValue;
    }
  };

  // Query for contract pause state
  const {
    data: contractState,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['contractState'],
    queryFn: async () => {
      if (!provider || !DICE_CONTRACT_ADDRESS) {
        throw new Error('Contract client not initialized');
      }

      // Get paused state with our enhanced function
      const isPaused = await safeReadContract('paused', [], false, 'paused');

      // Get owner with our enhanced function
      const contractOwner = await safeReadContract('owner', [], null, 'owner');

      // Return what we have, even if some calls failed
      return {
        isPaused: isPaused || false,
        isOwner: account?.toLowerCase() === contractOwner?.toLowerCase(),
        ownerAddress: contractOwner || null,
      };
    },
    enabled: !!provider && !!DICE_CONTRACT_ADDRESS && !!account,
    staleTime: 0, // Always consider data stale immediately
    cacheTime: 0, // Don't cache data at all
    refetchInterval: 5000, // Refetch data every 5 seconds
    refetchIntervalInBackground: false, // Only refetch when tab is in focus
    retry: 1, // Only retry once to avoid too many errors
  });

  // Mutation for pausing contract
  const pauseMutation = useMutation({
    mutationFn: async () => {
      if (!contract || !account) {
        throw new Error('Contract or account not available');
      }

      try {
        return contract.pause();
      } catch (error) {
        console.error('Error calling pause function:', error);
        throw error;
      }
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

      try {
        return contract.unpause();
      } catch (error) {
        console.error('Error calling unpause function:', error);
        throw error;
      }
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

  // Set up event listeners for contract state changes using ethers v6
  useEffect(() => {
    if (!provider || !DICE_CONTRACT_ADDRESS) return;

    // Create ethers contract instance for events
    const contract = new ethers.Contract(
      DICE_CONTRACT_ADDRESS,
      DiceABI.abi,
      provider
    );

    // Setup event handlers
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

    // Add event listeners
    contract.on('Paused', handlePaused);
    contract.on('Unpaused', handleUnpaused);
    contract.on('OwnershipTransferred', handleOwnershipTransferred);

    // Cleanup function to remove all event listeners
    return () => {
      contract.removeAllListeners('Paused');
      contract.removeAllListeners('Unpaused');
      contract.removeAllListeners('OwnershipTransferred');
    };
  }, [provider, queryClient, addToast]);

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
