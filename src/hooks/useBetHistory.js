import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import gameService from '../services/gameService';
import { useWallet } from './useWallet';
import { useDiceContract } from './useDiceContract';

// Match contract constants
const MAX_HISTORY_SIZE = 10;
const DEFAULT_PAGE_SIZE = 10;
const RESULT_FORCE_STOPPED = 254;
const RESULT_RECOVERED = 255;

/**
 * Hook for managing bet history with pagination and instant updates
 * Aligned with contract's BetHistory struct and circular buffer implementation
 */
export const useBetHistory = ({
  playerAddress,
  pageSize = DEFAULT_PAGE_SIZE,
  autoRefresh = true,
} = {}) => {
  const { account } = useWallet();
  const { contract: diceContract } = useDiceContract();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const address = playerAddress || account;

  // Query key for this specific bet history - wrapped in useMemo to fix deps warning
  const queryKey = useMemo(() => ['betHistory', address], [address]);

  // Determine result type based on contract constants
  const getResultType = useCallback(rolledNumber => {
    if (rolledNumber === RESULT_FORCE_STOPPED) return 'force_stopped';
    if (rolledNumber === RESULT_RECOVERED) return 'recovered';
    if (rolledNumber >= 1 && rolledNumber <= 6) return 'normal';
    return 'unknown';
  }, []);

  // Validate bet data to match contract types
  const validateBetData = useCallback(
    bet => {
      return {
        chosenNumber: Number(bet.chosenNumber) & 0xff, // uint8
        rolledNumber: Number(bet.rolledNumber) & 0xff, // uint8
        timestamp: Number(bet.timestamp) >>> 0, // uint32
        amount: bet.amount.toString(), // uint256
        payout: bet.payout.toString(), // uint256
        resultType: getResultType(Number(bet.rolledNumber)),
      };
    },
    [getResultType]
  );

  // Main query for bet history
  const {
    data: historyData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!address) return null;

      try {
        const history = await gameService.getGameHistory(address);
        return {
          games: history.games.slice(0, MAX_HISTORY_SIZE).map(validateBetData),
          timestamp: Date.now(),
        };
      } catch (err) {
        console.error('Error fetching bet history:', err);
        throw err;
      }
    },
    enabled: !!address,
    staleTime: 30000,
    cacheTime: 300000,
    refetchInterval: autoRefresh ? 30000 : false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Force refresh function
  const forceRefresh = useCallback(async () => {
    queryClient.removeQueries(queryKey);
    return refetch();
  }, [queryClient, refetch, queryKey]);

  // Subscribe to contract events for real-time updates
  useEffect(() => {
    if (!diceContract || !address) return;

    const handleGameComplete = async (player, _result) => {
      if (player.toLowerCase() === address.toLowerCase()) {
        await forceRefresh();
      }
    };

    diceContract.on('GameCompleted', handleGameComplete);
    diceContract.on('GameRecovered', handleGameComplete);
    diceContract.on('GameForceStopped', handleGameComplete);

    return () => {
      diceContract.off('GameCompleted', handleGameComplete);
      diceContract.off('GameRecovered', handleGameComplete);
      diceContract.off('GameForceStopped', handleGameComplete);
    };
  }, [diceContract, address, forceRefresh]);

  // Calculate pagination with respect to MAX_HISTORY_SIZE
  const { totalPages, currentPageData, hasNextPage, hasPreviousPage } =
    useMemo(() => {
      if (!historyData?.games) {
        return {
          totalPages: 0,
          currentPageData: [],
          hasNextPage: false,
          hasPreviousPage: false,
        };
      }

      const totalItems = Math.min(historyData.games.length, MAX_HISTORY_SIZE);
      const totalPages = Math.ceil(totalItems / pageSize);
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalItems);
      const currentPageData = historyData.games.slice(startIndex, endIndex);

      return {
        totalPages,
        currentPageData,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      };
    }, [historyData?.games, currentPage, pageSize]);

  // Pagination controls
  const goToNextPage = useCallback(() => {
    if (hasNextPage) setCurrentPage(prev => prev + 1);
  }, [hasNextPage]);

  const goToPreviousPage = useCallback(() => {
    if (hasPreviousPage) setCurrentPage(prev => prev - 1);
  }, [hasPreviousPage]);

  const goToPage = useCallback(
    page => {
      if (page >= 1 && page <= totalPages) setCurrentPage(page);
    },
    [totalPages]
  );

  return {
    // Data
    allGames: historyData?.games || [],
    currentPageGames: currentPageData,

    // Pagination
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    goToPage,

    // Status
    isLoading,
    error,

    // Actions
    forceRefresh,

    // Constants
    MAX_HISTORY_SIZE,
    RESULT_FORCE_STOPPED,
    RESULT_RECOVERED,
  };
};
