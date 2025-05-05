import { useState, useEffect, useCallback } from 'react';
import { useDiceContract } from './useDiceContract';
import { useWallet } from './useWallet';
import { useContractStats } from './useContractStats';

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

  const [betHistory, setBetHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
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
      setBetHistory([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Verify the contract has the getBetHistory method before calling
      if (
        !contract.getBetHistory ||
        typeof contract.getBetHistory !== 'function'
      ) {
        console.warn('getBetHistory method not available on contract');
        setError('Contract method not available');
        setBetHistory([]);
        setIsLoading(false);
        return;
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

      // Calculate total pages based on max history size or actual history length
      const maxHistorySize = stats?.maxHistorySize || processedBets.length;
      const totalItems = Math.min(processedBets.length, maxHistorySize);
      setTotalPages(Math.ceil(totalItems / itemsPerPage) || 1); // Ensure at least 1 page

      // Slice the history based on current page and max history size
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, maxHistorySize);
      const paginatedBets = processedBets.slice(startIndex, endIndex);

      setBetHistory(paginatedBets);
      setError(null);
    } catch (err) {
      console.error('Error fetching bet history:', err);

      // Handle specific error types
      if (err.message && err.message.includes('missing revert data')) {
        setError(
          'Network connectivity issue. Please check your connection or try again later.'
        );
      } else if (err.message && err.message.includes('timed out')) {
        setError('Request timed out. The network may be congested.');
      } else {
        setError(err.message || 'Failed to load bet history');
      }

      // Always clear bet history on error to avoid showing stale data
      setBetHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    contract,
    account,
    currentPage,
    stats?.maxHistorySize,
    itemsPerPage,
    betHistory.length,
  ]);

  useEffect(() => {
    fetchBetHistory();

    // Set up polling interval for real-time updates
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchBetHistory, 10000);
    }

    // No event listeners as the contract doesn't have the required events
    // We'll rely on polling instead

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    contract,
    account,
    currentPage,
    stats?.maxHistorySize,
    autoRefresh,
    fetchBetHistory,
    itemsPerPage,
  ]);

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
    refetch: fetchBetHistory,
  };
};
