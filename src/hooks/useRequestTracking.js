import { useQuery } from '@tanstack/react-query';
import { useDiceContract } from './useDiceContract';
import { useWallet } from './useWallet';

export const useRequestTracking = requestId => {
  const { contract } = useDiceContract();
  const { account } = useWallet();

  const {
    data: requestInfo,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['requestInfo', requestId],
    queryFn: async () => {
      if (!contract || !requestId) {
        throw new Error('Contract or requestId not available');
      }

      try {
        const player = await contract.getPlayerForRequest(requestId);

        if (
          !player ||
          player === '0x0000000000000000000000000000000000000000'
        ) {
          return {
            exists: false,
            player: null,
            hasPendingRequest: false,
          };
        }

        const [hasPendingRequest, gameStatus] = await Promise.all([
          contract.hasPendingRequest(player),
          contract.getGameStatus(player),
        ]);

        return {
          exists: true,
          player,
          hasPendingRequest,
          gameStatus: {
            isActive: gameStatus.isActive,
            requestExists: gameStatus.requestExists,
            requestProcessed: gameStatus.requestProcessed,
            recoveryEligible: gameStatus.recoveryEligible,
          },
        };
      } catch (error) {
        console.error('Error fetching request info:', error);
        throw error;
      }
    },
    enabled: !!contract && !!requestId,
    staleTime: 0, // Always consider data stale immediately
    cacheTime: 0, // Don't cache data at all
    retry: 1, // Minimal retry since we're not caching
    refetchInterval: 3000, // Refetch data every 3 seconds
    refetchIntervalInBackground: false, // Only refetch when tab is in focus
  });

  // Query for checking if current user has pending request
  const { data: userPendingRequest, isLoading: isLoadingUserRequest } =
    useQuery({
      queryKey: ['userPendingRequest', account],
      queryFn: async () => {
        if (!contract || !account) return false;

        try {
          return await contract.hasPendingRequest(account);
        } catch (error) {
          console.error('Error checking user pending request:', error);
          return false;
        }
      },
      enabled: !!contract && !!account,
      staleTime: 0, // Always consider data stale immediately
      cacheTime: 0, // Don't cache data at all
      retry: 1, // Minimal retry since we're not caching
      refetchInterval: 3000, // Refetch data every 3 seconds
      refetchIntervalInBackground: false, // Only refetch when tab is in focus
    });

  return {
    requestInfo,
    isLoading,
    error,
    refetch,
    userPendingRequest,
    isLoadingUserRequest,
  };
};
