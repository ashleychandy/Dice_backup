import { useQuery } from '@tanstack/react-query';
import { useDiceContract } from './useDiceContract';
import { useWallet } from '../components/wallet/WalletProvider';
import { safeContractCall } from '../utils/contractUtils';

export const useContractStats = () => {
  const { contract } = useDiceContract();
  const { account } = useWallet();

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
        // Use Promise.allSettled with our new safeContractCall utility
        const [
          totalGamesResult,
          totalPayoutResult,
          maxBetAmountResult,
          maxHistorySizeResult,
        ] = await Promise.allSettled([
          safeContractCall(
            contract,
            'totalGamesPlayed',
            [],
            defaultStats.totalGames
          ),
          safeContractCall(
            contract,
            'totalPayoutAmount',
            [],
            defaultStats.totalPayout
          ),
          safeContractCall(
            contract,
            'MAX_BET_AMOUNT',
            [],
            defaultStats.maxBetAmount
          ),
          safeContractCall(
            contract,
            'MAX_HISTORY_SIZE',
            [],
            defaultStats.maxHistorySize
          ),
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

        const maxBetAmount =
          maxBetAmountResult.status === 'fulfilled'
            ? maxBetAmountResult.value.toString()
            : defaultStats.maxBetAmount;

        const maxHistorySize =
          maxHistorySizeResult.status === 'fulfilled'
            ? Number(maxHistorySizeResult.value)
            : defaultStats.maxHistorySize;

        return {
          totalGames,
          totalPayout,
          totalWagered: '0', // Remove totalWagered as it's not accessible as a function
          maxBetAmount,
          maxHistorySize,
        };
      } catch (error) {
        // Return default values instead of throwing to prevent UI errors
        return defaultStats;
      }
    },
    enabled: !!contract,
    staleTime: 30000, // Consider data fresh for 30 seconds
    cacheTime: 60000, // Cache for 1 minute
    retry: 1, // Only retry once on failure
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchIntervalInBackground: true, // Continue refetching even when tab is not in focus
    onError: err => {
      // Silent error handling
    },
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
};
