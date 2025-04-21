import { useState, useCallback } from 'react';

/**
 * Custom hook for error boundary functionality
 * @param {Function} onError - Optional callback for error handling
 * @returns {Object} Error boundary methods and state
 */
export const useErrorBoundary = onError => {
  const [error, setError] = useState(null);

  const handleError = useCallback(
    error => {
      setError(error);
      if (onError) {
        onError(error);
      }
    },
    [onError]
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    resetError,
    isError: error !== null,
  };
};

export default useErrorBoundary;
