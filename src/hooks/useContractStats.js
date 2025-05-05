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

      // Default values as fallback in case of errors
      let defaultStats = {
        totalGames: '0',
        totalPayout: '0',
        totalWagered: '0',
        maxBetAmount: '1000000000000000000000', // Default 1000 tokens
        maxHistorySize: 20,
      };

      try {
        // Use Promise.allSettled to handle partial failures
        const [
          totalGamesResult,
          totalPayoutResult,
          totalWageredResult,
          maxBetAmountResult,
          maxHistorySizeResult,
        ] = await Promise.allSettled([
          contract.totalGamesPlayed(),
          contract.totalPayoutAmount(),
          contract.totalWageredAmount(),
          contract.MAX_BET_AMOUNT(),
          contract.MAX_HISTORY_SIZE(),
        ]);

        // Extract values or use defaults for any failed promises
        const totalGames =
          totalGamesResult.status === 'fulfilled'
            ? totalGamesResult.value.toString()
            : defaultStats.totalGames;

        const totalPayout =
          totalPayoutResult.status === 'fulfilled'
            ? totalPayoutResult.value.toString()
            : defaultStats.totalPayout;

        const totalWagered =
          totalWageredResult.status === 'fulfilled'
            ? totalWageredResult.value.toString()
            : defaultStats.totalWagered;

        const maxBetAmount =
          maxBetAmountResult.status === 'fulfilled'
            ? maxBetAmountResult.value.toString()
            : defaultStats.maxBetAmount;

        const maxHistorySize =
          maxHistorySizeResult.status === 'fulfilled'
            ? Number(maxHistorySizeResult.value)
            : defaultStats.maxHistorySize;

        // Log any errors for debugging
        [
          totalGamesResult,
          totalPayoutResult,
          totalWageredResult,
          maxBetAmountResult,
          maxHistorySizeResult,
        ]
          .filter(result => result.status === 'rejected')
          .forEach((result, index) => {
            const propertyNames = [
              'totalGames',
              'totalPayout',
              'totalWagered',
              'maxBetAmount',
              'maxHistorySize',
            ];
            console.error(
              `Error fetching ${propertyNames[index]}:`,
              result.reason
            );
          });

        return {
          totalGames,
          totalPayout,
          totalWagered,
          maxBetAmount,
          maxHistorySize,
        };
      } catch (error) {
        console.error('Error fetching contract stats:', error);
        // Return default values instead of throwing to prevent UI errors
        return defaultStats;
      }
    },
    enabled: !!contract,
    staleTime: 0, // Always consider data stale immediately
    cacheTime: 0, // Don't cache data at all
    retry: 2, // Retry failed requests up to 2 times
  });

  // Set up polling for stats updates with more frequent updates since we don't cache
  useEffect(() => {
    if (!contract) return;

    // Set up polling interval to refresh stats every 5 seconds
    const pollingInterval = setInterval(() => {
      queryClient.invalidateQueries(['contractStats']);
    }, 5000);

    return () => {
      clearInterval(pollingInterval);
    };
  }, [contract, queryClient]);

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
};
