import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDiceContract } from './useDiceContract';
import { useWallet } from './useWallet';
import { useEffect } from 'react';

export const useContractStats = () => {
  const { contract } = useDiceContract();
  const { account } = useWallet();
  const queryClient = useQueryClient();

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contractStats'],
    queryFn: async () => {
      if (!contract) {
        throw new Error('Contract not initialized');
      }

      try {
        const [
          totalGames,
          totalPayout,
          totalWagered,
          maxBetAmount,
          maxHistorySize,
        ] = await Promise.all([
          contract.totalGamesPlayed(),
          contract.totalPayoutAmount(),
          contract.totalWageredAmount(),
          contract.MAX_BET_AMOUNT(),
          contract.MAX_HISTORY_SIZE(),
        ]);

        return {
          totalGames: totalGames.toString(),
          totalPayout: totalPayout.toString(),
          totalWagered: totalWagered.toString(),
          maxBetAmount: maxBetAmount.toString(),
          maxHistorySize: Number(maxHistorySize),
        };
      } catch (error) {
        console.error('Error fetching contract stats:', error);
        throw error;
      }
    },
    enabled: !!contract,
    staleTime: 30000, // Consider data stale after 30 seconds
    cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Set up event listeners for stats updates
  useEffect(() => {
    if (!contract) return;

    const handleGameComplete = () => {
      queryClient.invalidateQueries(['contractStats']);
    };

    // Set up listeners
    contract.on('GameCompleted', handleGameComplete);
    contract.on('GameRecovered', handleGameComplete);
    contract.on('GameForceStopped', handleGameComplete);

    return () => {
      // Use removeAllListeners instead of off for ethers.js v6
      contract.removeAllListeners('GameCompleted');
      contract.removeAllListeners('GameRecovered');
      contract.removeAllListeners('GameForceStopped');
    };
  }, [contract, queryClient]);

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
};
