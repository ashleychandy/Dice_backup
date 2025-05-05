import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDiceContract } from './useDiceContract';
import { useWallet } from '../hooks/useWallet';
import { useContractStats } from './useContractStats';
import { useQuery } from '@tanstack/react-query';

// Constants for special game results
const RESULT_FORCE_STOPPED = 254;
const RESULT_RECOVERED = 255;

export const useBetHistory = ({
  playerAddress,
  pageSize = 10,
  autoRefresh = true,
  diceContract: externalContract,
} = {}) => {
  const { contract: internalContract } = useDiceContract();
  const { account: walletAccount } = useWallet();
  const { stats } = useContractStats();

  // Use provided contract or fallback to the one from the hook
  const contract = externalContract || internalContract;
  // Use provided player address or fallback to connected wallet
  const account = playerAddress || walletAccount;

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const itemsPerPage = pageSize; // Number of items to show per page

  const getResultType = rolledNumber => {
    if (rolledNumber === RESULT_FORCE_STOPPED) return 'force_stopped';
    if (rolledNumber === RESULT_RECOVERED) return 'recovered';
    if (rolledNumber >= 1 && rolledNumber <= 6) return 'normal';
    return 'unknown';
  };

  const fetchBetHistory = useCallback(async () => {
    if (!contract || !account) {
      return [];
    }

    // Verify the contract has the getBetHistory method before calling
    if (
      !contract.getBetHistory ||
      typeof contract.getBetHistory !== 'function'
    ) {
      console.warn('getBetHistory method not available on contract');
      throw new Error('Contract method not available');
    }

    // Use Promise.race with a timeout to prevent hanging calls
    const bets = await Promise.race([
      contract.getBetHistory(account),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Bet history request timed out')),
          15000
        )
      ),
    ]);

    const processedBets = bets
      .map(bet => {
        try {
          const rolledNumber = Number(bet.rolledNumber);
          const resultType = getResultType(rolledNumber);

          return {
            timestamp: Number(bet.timestamp),
            chosenNumber: Number(bet.chosenNumber),
            rolledNumber,
            amount: bet.amount.toString(),
            payout: bet.payout.toString(),
            isWin:
              resultType === 'normal' &&
              rolledNumber === Number(bet.chosenNumber),
            resultType,
            // Add status for UI display
            status:
              resultType === 'force_stopped'
                ? 'Force Stopped'
                : resultType === 'recovered'
                  ? 'Recovered'
                  : resultType === 'normal'
                    ? rolledNumber === Number(bet.chosenNumber)
                      ? 'Won'
                      : 'Lost'
                    : 'Unknown',
          };
        } catch (betError) {
          console.warn('Error processing bet data:', betError);
          // Return a default/fallback bet object
          return {
            timestamp: 0,
            chosenNumber: 0,
            rolledNumber: 0,
            amount: '0',
            payout: '0',
            isWin: false,
            resultType: 'error',
            status: 'Data Error',
          };
        }
      })
      .filter(bet => bet !== null); // Filter out any nulls from processing errors

    // Sort by timestamp (newest first)
    processedBets.sort((a, b) => b.timestamp - a.timestamp);

    return processedBets;
  }, [contract, account]);

  // Query for bet history data
  const {
    data: allBets = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['betHistory', account, contract?.address],
    queryFn: fetchBetHistory,
    enabled: !!contract && !!account,
    staleTime: 0, // Always consider data stale immediately
    cacheTime: 0, // Don't cache data at all
    retry: 2, // Retry failed requests up to 2 times
    refetchInterval: autoRefresh ? 10000 : false, // Refetch data every 10 seconds if autoRefresh is true
    refetchIntervalInBackground: false, // Only refetch when tab is in focus
    onError: err => {
      console.error('Error fetching bet history:', err);
    },
  });

  // Calculate pagination values based on the latest data
  useEffect(() => {
    // Calculate total pages based on max history size or actual history length
    const maxHistorySize = stats?.maxHistorySize || allBets.length;
    const totalItems = Math.min(allBets.length, maxHistorySize);
    setTotalPages(Math.ceil(totalItems / itemsPerPage) || 1); // Ensure at least 1 page
  }, [allBets, stats?.maxHistorySize, itemsPerPage]);

  // Get the current page of bet history
  const betHistory = useMemo(() => {
    // Calculate total pages based on max history size or actual history length
    const maxHistorySize = stats?.maxHistorySize || allBets.length;

    // Slice the history based on current page and max history size
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, maxHistorySize);

    return allBets.slice(startIndex, endIndex);
  }, [allBets, currentPage, itemsPerPage, stats?.maxHistorySize]);

  const goToPage = page => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPreviousPage = () => goToPage(currentPage - 1);

  return {
    betHistory,
    isLoading,
    error,
    currentPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    goToNextPage,
    goToPreviousPage,
    goToPage,
    refetch,
  };
};
