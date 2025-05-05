import { useQuery } from '@tanstack/react-query';
import { useDiceContract } from './useDiceContract';
import { useWallet } from '../hooks/useWallet';
import { ethers } from 'ethers';
import { DICE_CONTRACT_ADDRESS } from '../constants/contracts';
import DiceABI from '../contracts/abi/Dice.json';
import { safeContractCall } from '../utils/contractUtils';

export const useContractStats = () => {
  // Keep contract reference for backward compatibility
  const { contract: _contract } = useDiceContract();
  // eslint-disable-next-line no-unused-vars
  const { account, provider } = useWallet();

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contractStats'],
    queryFn: async () => {
      if (!provider || !DICE_CONTRACT_ADDRESS) {
        throw new Error('Contract client not initialized');
      }

      // Default values as fallback in case of errors
      let defaultStats = {
        totalGames: '0',
        totalPayout: '0',
        totalWagered: '0',
        maxBetAmount: '1000000000000000000000', // Default 1000 tokens
        maxHistorySize: 20,
      };

      // Create ethers contract instance
      const contract = new ethers.Contract(
        DICE_CONTRACT_ADDRESS,
        DiceABI.abi,
        provider
      );

      // Special handling for contract calls using ethers v6
      const fetchContractValue = async (
        functionName,
        defaultValue,
        logName
      ) => {
        try {
          // Use ethers v6 with safeContractCall for better error handling
          return await safeContractCall(
            async () => {
              // Direct call to contract function using ethers
              const result = await contract[functionName]();

              // Extra validation
              if (!result) {
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

      // Get all stats using our enhanced function with ethers
      const totalGames = await fetchContractValue(
        'totalGamesPlayed',
        defaultStats.totalGames,
        'totalGames'
      );
      const totalPayout = await fetchContractValue(
        'totalPayoutAmount',
        defaultStats.totalPayout,
        'totalPayout'
      );
      const totalWagered = await fetchContractValue(
        'totalWageredAmount',
        defaultStats.totalWagered,
        'totalWagered'
      );
      const maxBetAmount = await fetchContractValue(
        'MAX_BET_AMOUNT',
        defaultStats.maxBetAmount,
        'maxBetAmount'
      );
      const maxHistorySize = await fetchContractValue(
        'MAX_HISTORY_SIZE',
        defaultStats.maxHistorySize,
        'maxHistorySize'
      );

      // Return the stats, with all values we were able to fetch
      return {
        totalGames: totalGames?.toString() || defaultStats.totalGames,
        totalPayout: totalPayout?.toString() || defaultStats.totalPayout,
        totalWagered: totalWagered?.toString() || defaultStats.totalWagered,
        maxBetAmount: maxBetAmount?.toString() || defaultStats.maxBetAmount,
        maxHistorySize: Number(maxHistorySize) || defaultStats.maxHistorySize,
      };
    },
    enabled: !!provider && !!DICE_CONTRACT_ADDRESS,
    staleTime: 0, // Always consider data stale immediately
    cacheTime: 0, // Don't cache data at all
    retry: 1, // Reduced retry count to minimize errors
    refetchInterval: 5000, // Refetch data every 5 seconds
    refetchIntervalInBackground: false, // Only refetch when tab is in focus
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
};
