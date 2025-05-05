import { useState, useEffect } from 'react';
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

  const fetchBetHistory = async () => {
    if (!contract || !account) {
      setBetHistory([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const bets = await contract.getBetHistory(account);

      const processedBets = bets.map(bet => {
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
      });

      // Sort by timestamp (newest first)
      processedBets.sort((a, b) => b.timestamp - a.timestamp);

      // Calculate total pages based on max history size or actual history length
      const maxHistorySize = stats?.maxHistorySize || processedBets.length;
      const totalItems = Math.min(processedBets.length, maxHistorySize);
      setTotalPages(Math.ceil(totalItems / itemsPerPage));

      // Slice the history based on current page and max history size
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, maxHistorySize);
      const paginatedBets = processedBets.slice(startIndex, endIndex);

      setBetHistory(paginatedBets);
      setError(null);
    } catch (err) {
      console.error('Error fetching bet history:', err);
      setError(err.message);
      setBetHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBetHistory();

    // Set up polling interval for real-time updates
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchBetHistory, 10000);
    }

    // Listen to contract events
    if (contract && account) {
      const handleGameEvent = (_player, _result) => {
        if (_player.toLowerCase() === account.toLowerCase()) {
          fetchBetHistory();
        }
      };

      try {
        // In ethers.js v6, we need to store references to the listeners
        const _gameCompletedListener = contract.on(
          'GameCompleted',
          handleGameEvent
        );
        const _gameRecoveredListener = contract.on(
          'GameRecovered',
          handleGameEvent
        );
        const _gameForceStoppedListener = contract.on(
          'GameForceStopped',
          handleGameEvent
        );
      } catch (err) {
        console.error('Error setting up event listeners:', err);
      }

      return () => {
        if (interval) clearInterval(interval);
        try {
          // Remove listeners by removing all listeners for these events
          // This is the recommended approach in ethers.js v6
          contract.removeAllListeners('GameCompleted');
          contract.removeAllListeners('GameRecovered');
          contract.removeAllListeners('GameForceStopped');
        } catch (err) {
          console.error('Error cleaning up event listeners:', err);
        }
      };
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [contract, account, currentPage, stats?.maxHistorySize, autoRefresh]);

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
