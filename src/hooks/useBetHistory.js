import { useState, useMemo } from 'react';
import { usePollingService } from '../services/pollingService.jsx';

// Constants for special game results
const RESULT_FORCE_STOPPED = 254;
const RESULT_RECOVERED = 255;

export const useBetHistory = ({
  pageSize = 10,
  playerAddress = null, // Optional: override the connected account
} = {}) => {
  const {
    betHistory: allBets,
    isLoading,
    error,
    refreshData,
  } = usePollingService();
  const [currentPage, setCurrentPage] = useState(1);

  // Get the current page of bet history
  const betHistory = useMemo(() => {
    // Calculate pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return allBets.slice(startIndex, endIndex);
  }, [allBets, currentPage, pageSize]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(allBets.length / pageSize) || 1; // Ensure at least 1 page
  }, [allBets, pageSize]);

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
    refetch: refreshData,
  };
};
