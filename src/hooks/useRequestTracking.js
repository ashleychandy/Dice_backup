import { useQuery } from '@tanstack/react-query';
import { useDiceContract } from './useDiceContract';
import { useWallet } from '../hooks/useWallet';
import { ethers } from 'ethers';
import { DICE_CONTRACT_ADDRESS } from '../constants/contracts';
import DiceABI from '../contracts/abi/Dice.json';
import { safeContractCall } from '../utils/contractUtils';

export const useRequestTracking = requestId => {
  const { contract } = useDiceContract();
  const { account, provider } = useWallet();

  // Helper function for safer contract reads with ethers v6
  const safeReadContract = async (
    functionName,
    args,
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
        logName || functionName
      );
    } catch (err) {
      console.warn(
        `Error in ${logName || functionName} with special handling:`,
        err
      );
      return defaultValue;
    }
  };

  const {
    data: requestInfo,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['requestInfo', requestId],
    queryFn: async () => {
      if (!provider || !DICE_CONTRACT_ADDRESS || !requestId) {
        throw new Error('Contract client or requestId not available');
      }

      try {
        // Use our enhanced contract read function
        const player = await safeReadContract(
          'getPlayerForRequest',
          [requestId],
          null,
          'getPlayerForRequest'
        );

        if (!player || player === ethers.ZeroAddress) {
          return {
            exists: false,
            player: null,
            hasPendingRequest: false,
          };
        }

        // Get pending request status
        const hasPendingRequest = await safeReadContract(
          'hasPendingRequest',
          [player],
          false,
          'hasPendingRequest'
        );

        // Default game status
        let gameStatus = {
          isActive: false,
          requestExists: false,
          requestProcessed: false,
          recoveryEligible: false,
        };

        // Get game status
        const status = await safeReadContract(
          'getGameStatus',
          [player],
          null,
          'getGameStatus'
        );

        if (status) {
          gameStatus = {
            isActive: status.isActive || false,
            requestExists: status.requestExists || false,
            requestProcessed: status.requestProcessed || false,
            recoveryEligible: status.recoveryEligible || false,
          };
        }

        return {
          exists: true,
          player,
          hasPendingRequest,
          gameStatus,
        };
      } catch (error) {
        console.error('Error fetching request info:', error);
        // Return a safe default instead of throwing
        return {
          exists: false,
          player: null,
          hasPendingRequest: false,
          error: error.message,
        };
      }
    },
    enabled: !!provider && !!DICE_CONTRACT_ADDRESS && !!requestId,
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
        if (!provider || !DICE_CONTRACT_ADDRESS || !account) return false;

        return safeReadContract(
          'hasPendingRequest',
          [account],
          false,
          'userPendingRequest'
        );
      },
      enabled: !!provider && !!DICE_CONTRACT_ADDRESS && !!account,
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
