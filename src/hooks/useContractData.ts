import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../components/wallet/WalletProvider';
import { useDiceContract } from './useDiceContract';
import { useNotification } from '../contexts/NotificationContext';

// Constants for cache configuration
const CACHE_TIME = 1000 * 60 * 5; // 5 minutes
const STALE_TIME = 1000 * 30; // 30 seconds
const REFRESH_INTERVAL = 1000 * 3; // 3 seconds for live updates

interface ContractCallConfig {
  enabled?: boolean;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

/**
 * Custom hook for real-time contract data management
 * Includes automatic updates, caching, and error handling
 */
export const useContractData = (
  methodName: string,
  args: any[] = [],
  config: ContractCallConfig = {}
) => {
  const { contract: diceContract } = useDiceContract();
  const { addToast } = useNotification();
  const queryClient = useQueryClient();
  const { isWalletConnected, account } = useWallet();
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Generate a unique key for this contract call
  const queryKey = [methodName, ...args, account];

  // Setup event listener for contract events that should trigger updates
  useEffect(() => {
    if (!diceContract || !isWalletConnected) return;

    const eventMap: { [key: string]: string[] } = {
      getGameState: ['GameStarted', 'GameEnded', 'GameRecovered'],
      getBetHistory: ['BetPlaced', 'GameEnded'],
      getUserBalance: ['Transfer', 'Approval'],
      getTokenAllowance: ['Approval'],
      // Add more method-to-event mappings as needed
    };

    const relevantEvents = eventMap[methodName] || [];

    const handleEvent = async (event: any) => {
      console.log(`Contract event received: ${event.eventName}`);

      // Invalidate the cache for this query
      await queryClient.invalidateQueries({ queryKey });

      // Force an immediate refetch
      queryClient.refetchQueries({ queryKey });
    };

    // Subscribe to all relevant events
    relevantEvents.forEach(eventName => {
      diceContract.on(eventName, handleEvent);
      setIsSubscribed(true);
    });

    // Cleanup subscriptions
    return () => {
      relevantEvents.forEach(eventName => {
        diceContract.off(eventName, handleEvent);
      });
      setIsSubscribed(false);
    };
  }, [diceContract, methodName, queryClient, isWalletConnected, account]);

  // Setup the contract call with React Query
  const { data, error, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!diceContract || !isWalletConnected) {
        throw new Error('Contract or wallet not available');
      }

      try {
        // Check if method exists
        if (typeof diceContract[methodName] !== 'function') {
          throw new Error(`Method ${methodName} not found on contract`);
        }

        // Make the contract call
        const result = await diceContract[methodName](...args);

        // Format BigNumber results if needed
        const formattedResult = formatContractResult(result);

        return formattedResult;
      } catch (err: any) {
        console.error(`Error calling ${methodName}:`, err);
        addToast(`Error fetching ${methodName}: ${err.message}`, 'error');
        throw err;
      }
    },
    enabled: Boolean(
      diceContract && isWalletConnected && (config.enabled ?? true)
    ),
    cacheTime: CACHE_TIME,
    staleTime: STALE_TIME,
    refetchInterval: config.refetchInterval ?? REFRESH_INTERVAL,
    refetchOnWindowFocus: config.refetchOnWindowFocus ?? true,
    retry: 2,
    ...config,
  });

  // Provide a manual refresh function
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
    return queryClient.refetchQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    data,
    error,
    isLoading,
    isFetching,
    isSubscribed,
    refresh,
  };
};

// Helper function to format contract call results
const formatContractResult = (result: any): any => {
  if (result === null || result === undefined) {
    return result;
  }

  // Handle arrays
  if (Array.isArray(result)) {
    return result.map(formatContractResult);
  }

  // Handle objects (including BigNumber)
  if (typeof result === 'object') {
    // Check if it's a BigNumber
    if (ethers.BigNumber.isBigNumber(result)) {
      return result.toString();
    }

    // Handle regular objects
    const formatted: { [key: string]: any } = {};
    for (const key in result) {
      formatted[key] = formatContractResult(result[key]);
    }
    return formatted;
  }

  return result;
};

// Batch contract calls hook for optimized multiple data fetching
export const useBatchContractData = (
  calls: { methodName: string; args: any[] }[],
  config: ContractCallConfig = {}
) => {
  const results = calls.map(call =>
    useContractData(call.methodName, call.args, {
      ...config,
      // Disable automatic refetch for batch calls
      refetchInterval: 0,
    })
  );

  const isLoading = results.some(result => result.isLoading);
  const isFetching = results.some(result => result.isFetching);
  const error = results.find(result => result.error)?.error;

  // Combine all refresh functions
  const refreshAll = useCallback(async () => {
    await Promise.all(results.map(result => result.refresh()));
  }, [results]);

  return {
    results: results.map(r => r.data),
    isLoading,
    isFetching,
    error,
    refreshAll,
  };
};
