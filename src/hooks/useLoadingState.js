import { useState, useCallback } from 'react';

/**
 * Custom hook for managing loading states with automatic cleanup
 * @param {boolean} initialState - Initial loading state
 * @returns {[boolean, Function]} Loading state and wrapper function
 */
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);

  const withLoading = useCallback(async operation => {
    if (!operation) return;

    setIsLoading(true);
    try {
      const result = await operation();
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return [isLoading, withLoading];
};

export default useLoadingState;
