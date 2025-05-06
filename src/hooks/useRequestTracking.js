import { useQuery } from '@tanstack/react-query';
import { useDiceContract } from './useDiceContract';
import { useWallet } from '../components/wallet/WalletProvider';

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
        return {
          exists: false,
          player: null,
          hasPendingRequest: false,
        };
      }

      try {
        // Catch potential errors in getPlayerForRequest
        let player;
        try {
          // Check method existence first
          if (
            contract.getPlayerForRequest &&
            typeof contract.getPlayerForRequest === 'function'
          ) {
            player = await contract.getPlayerForRequest(requestId);
          } else {
            console.warn(
              'getPlayerForRequest method not available on contract'
            );
            return {
              exists: false,
              player: null,
              hasPendingRequest: false,
              error: 'Contract method not available',
            };
          }
        } catch (playerErr) {
          // Handle specific "missing revert data" error
          if (
            playerErr.message &&
            playerErr.message.includes('missing revert data')
          ) {
            console.warn(
              'Caught missing revert data error on getPlayerForRequest call:',
              playerErr.message
            );
            return {
              exists: false,
              player: null,
              hasPendingRequest: false,
              error: 'Contract data retrieval error',
            };
          }
          console.warn('Error fetching player for request:', playerErr);
          return {
            exists: false,
            player: null,
            hasPendingRequest: false,
            error: 'Error fetching player information',
          };
        }

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

        // Helper function to safely call a contract method with error handling
        const safeContractCall = async (methodName, params, defaultValue) => {
          if (
            !contract[methodName] ||
            typeof contract[methodName] !== 'function'
          ) {
            console.warn(`${methodName} method not available on contract`);
            return defaultValue;
          }

          try {
            return await contract[methodName](...params);
          } catch (err) {
            // Handle specific "missing revert data" error
            if (err.message && err.message.includes('missing revert data')) {
              console.warn(
                `Caught missing revert data error on ${methodName} call:`,
                err.message
              );
              return defaultValue;
            }
            console.warn(`Error calling ${methodName}:`, err);
            return defaultValue;
          }
        };

        // Use allSettled to handle partial failures
        const [hasPendingRequestResult, gameStatusResult] =
          await Promise.allSettled([
            safeContractCall('hasPendingRequest', [player], false),
            safeContractCall('getGameStatus', [player], {
              isActive: false,
              requestExists: false,
              requestProcessed: false,
              recoveryEligible: false,
            }),
          ]);

        const hasPendingRequest =
          hasPendingRequestResult.status === 'fulfilled'
            ? hasPendingRequestResult.value
            : false;

        const gameStatus =
          gameStatusResult.status === 'fulfilled'
            ? gameStatusResult.value
            : {
                isActive: false,
                requestExists: false,
                requestProcessed: false,
                recoveryEligible: false,
              };

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
        // Return a default state instead of throwing
        return {
          exists: false,
          player: null,
          hasPendingRequest: false,
          error: error.message || 'Unknown error occurred',
        };
      }
    },
    enabled: !!contract,
    staleTime: 15000, // Consider data fresh for 15 seconds
    cacheTime: 30000, // Cache for 30 seconds
    retry: 1, // Only retry once
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchIntervalInBackground: true, // Continue refetching even when tab is not in focus
  });

  // Query for checking if current user has pending request
  const { data: userPendingRequest, isLoading: isLoadingUserRequest } =
    useQuery({
      queryKey: ['userPendingRequest', account],
      queryFn: async () => {
        if (!contract || !account) return false;

        try {
          // First check if method exists
          if (
            !contract.hasPendingRequest ||
            typeof contract.hasPendingRequest !== 'function'
          ) {
            console.warn('hasPendingRequest method not available on contract');
            return false;
          }

          try {
            const hasPending = await contract.hasPendingRequest(account);
            return !!hasPending; // Ensure boolean return
          } catch (err) {
            // Handle specific "missing revert data" error
            if (err.message && err.message.includes('missing revert data')) {
              console.warn(
                'Caught missing revert data error on hasPendingRequest call:',
                err.message
              );
              return false;
            }
            console.error('Error checking user pending request:', err);
            return false;
          }
        } catch (error) {
          console.error('Error in userPendingRequest query:', error);
          return false;
        }
      },
      enabled: !!contract && !!account,
      staleTime: 15000, // Consider data fresh for 15 seconds
      cacheTime: 30000, // Cache for 30 seconds
      retry: 1, // Only retry once
      refetchInterval: 5000, // Refetch every 5 seconds
      refetchIntervalInBackground: true, // Continue refetching even when tab is not in focus
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
