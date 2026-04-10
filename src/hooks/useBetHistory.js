import { useState, useMemo, useCallback } from 'react';
import { usePollingService } from '../services/pollingService.jsx';

// Constants not used directly in this file but kept for reference
// or potentially future use
const _RESULT_FORCE_STOPPED = 254;
const _RESULT_RECOVERED = 255;

export const useBetHistory = ({
  pageSize = 10,
  _playerAddress = null, // Prefixed with underscore as unused
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

  // Use useCallback for all state-updating functions
  const goToPage = useCallback(
    page => {
      const maxPage = Math.ceil((allBets?.length || 0) / pageSize) || 1;
      if (page >= 1 && page <= maxPage) {
        setCurrentPage(page);
      }
    },
    [allBets, pageSize]
  );

  const goToNextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [goToPage, currentPage]);

  const goToPreviousPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [goToPage, currentPage]);

  // Direct fetch function in case polling service fails
  const directFetch = useCallback(async () => {
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
  }, [isNewUser, diceContract, refreshData]);

  // Fix dependency array to avoid infinite loops
  const refetch = useCallback(() => {
    // Skip refreshing for new users unless explicitly forced
    if (isNewUser) {
      return;
    }
    refreshData();
    return directFetch();
  }, [isNewUser, refreshData, directFetch]);

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
    refetch,
  };
};
