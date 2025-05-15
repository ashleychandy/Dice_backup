import { useState, useMemo, useEffect } from 'react';
import { usePollingService } from '../services/pollingService.jsx';

// Constants for special game results
const RESULT_FORCE_STOPPED = 254;
const RESULT_RECOVERED = 255;

export const useBetHistory = ({
  pageSize = 10,
  playerAddress = null, // Optional: override the connected account
  diceContract = null, // We don't actually need this directly anymore, but keeping for API compatibility
} = {}) => {
  const {
    betHistory: allBets,
    isLoading,
    error,
    refreshData,
  } = usePollingService();
  const [currentPage, setCurrentPage] = useState(1);

  // Add debugging for bet history
  useEffect(() => {
    console.log('DEBUG - useBetHistory allBets:', {
      hasData: !!allBets && allBets.length > 0,
      allBetsLength: allBets?.length || 0,
      allBetsData: allBets,
    });
  }, [allBets]);

  // Add debugging for the contract
  useEffect(() => {
    if (diceContract) {
      console.log('DEBUG - diceContract in useBetHistory:', {
        hasDiceContract: !!diceContract,
        hasBetHistoryMethod: typeof diceContract.getBetHistory === 'function',
        contractMethods: Object.keys(diceContract).filter(
          key => typeof diceContract[key] === 'function'
        ),
      });
    }
  }, [diceContract]);

  // Get the current page of bet history
  const betHistory = useMemo(() => {
    // Calculate pagination
    if (!allBets || !Array.isArray(allBets)) {
      console.log('DEBUG - allBets is empty or not an array in useBetHistory');
      return [];
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const paginatedBets = allBets.slice(startIndex, endIndex);

    console.log('DEBUG - Paginated bets:', {
      currentPage,
      pageSize,
      startIndex,
      endIndex,
      paginatedLength: paginatedBets.length,
    });

    return paginatedBets;
  }, [allBets, currentPage, pageSize]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil((allBets?.length || 0) / pageSize) || 1; // Ensure at least 1 page
  }, [allBets, pageSize]);

  const goToPage = page => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPreviousPage = () => goToPage(currentPage - 1);

  // Direct fetch function in case polling service fails
  const directFetch = async () => {
    console.log('Attempting direct fetch of bet history from contract');
    if (!diceContract || typeof diceContract.getBetHistory !== 'function') {
      console.error(
        'Direct fetch failed: contract or getBetHistory method not available'
      );
      return;
    }

    try {
      refreshData();
    } catch (err) {
      console.error('Error in direct fetch:', err);
    }
  };

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
    refetch: () => {
      console.log('Refreshing bet history data');
      refreshData();
      return directFetch();
    },
  };
};
