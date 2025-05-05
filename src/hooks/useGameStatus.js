import { useQuery } from '@tanstack/react-query';
import { useDiceContract } from './useDiceContract';
import { useWallet } from '../hooks/useWallet';

export const useGameStatus = () => {
  const { contract } = useDiceContract();
  const { account } = useWallet();

  const {
    data: gameStatus,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['gameStatus', account],
    queryFn: async () => {
      if (!contract || !account) {
        return null;
      }

      try {
        const status = await contract.getGameStatus(account);

        return {
          isActive: status.isActive,
          isWin: status.isWin,
          isCompleted: status.isCompleted,
          chosenNumber: Number(status.chosenNumber),
          amount: status.amount.toString(),
          result: Number(status.result),
          payout: status.payout.toString(),
          requestId: status.requestId.toString(),
          recoveryEligible: status.recoveryEligible,
          lastPlayTimestamp: Number(status.lastPlayTimestamp),
        };
      } catch (err) {
        console.error('Error fetching game status:', err);
        throw err;
      }
    },
    enabled: !!contract && !!account,
    staleTime: 0, // Always consider data stale immediately
    cacheTime: 0, // Don't cache data at all
    retry: 2, // Retry failed requests up to 2 times
    refetchInterval: 5000, // Refetch data every 5 seconds
    refetchIntervalInBackground: false, // Only refetch when tab is in focus
  });

  return {
    gameStatus,
    isLoading,
    error,
    refetch,
  };
};
