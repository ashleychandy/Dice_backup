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
    isNewUser, // Get the isNewUser flag from polling service
  } = usePollingService();
  const [currentPage, setCurrentPage] = useState(1);

  // Get the current page of bet history
  const betHistory = useMemo(() => {
    // For new users, return empty array without any processing
    if (isNewUser) {
      return [];
    }

    // Calculate pagination
    if (!allBets || !Array.isArray(allBets)) {
      return [];
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const paginatedBets = allBets.slice(startIndex, endIndex);

    return paginatedBets;
  }, [allBets, currentPage, pageSize, isNewUser]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    if (isNewUser) return 1; // For new users, always return 1 page
    return Math.ceil((allBets?.length || 0) / pageSize) || 1; // Ensure at least 1 page
  }, [allBets, pageSize, isNewUser]);

  const goToPage = page => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPreviousPage = () => goToPage(currentPage - 1);

  // Direct fetch function in case polling service fails
  const directFetch = async () => {
    // Skip direct fetch for new users
    if (isNewUser) {
      return;
    }

    if (!diceContract || typeof diceContract.getBetHistory !== 'function') {
      return;
    }

    try {
      refreshData();
    } catch (err) {
      // Handle error silently
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
    isNewUser, // Include isNewUser in the return object
    refetch: () => {
      // Skip refreshing for new users unless explicitly forced
      if (isNewUser) {
        return;
      }
      refreshData();
      return directFetch();
    },
  };
};
