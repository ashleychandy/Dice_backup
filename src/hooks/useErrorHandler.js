import { useCallback } from 'react';

/**
 * Custom hook for centralized error handling
 * @param {Function} addToast - Toast notification function
 * @param {Function} onError - Optional additional error handler
 * @returns {Function} Error handler function
 */
export const useErrorHandler = (addToast, onError) => {
  const handleError = useCallback(
    (error, context = '') => {
      // Log error for debugging
      console.error(`Error in ${context}:`, error);

      // Default error message
      let message = 'An unexpected error occurred';
      let type = 'error';

      // Handle specific error types
      if (error.code === 4001) {
        message = 'Transaction cancelled by user';
        type = 'warning';
      } else if (error.code === -32002) {
        message = 'Please check your wallet - a connection request is pending';
        type = 'warning';
      } else if (error.code === -32603) {
        message =
          'Network connection issue. Please check your wallet connection.';
      } else if (error.message?.includes('insufficient allowance')) {
        message = 'Insufficient token allowance. Please approve tokens first.';
      } else if (error.message?.includes('insufficient balance')) {
        message = 'Insufficient token balance for this transaction.';
      } else if (error.message) {
        message = error.message;
      }

      // Show toast notification
      addToast(message, type);

      // Call additional error handler if provided
      if (onError) {
        onError(error);
      }

      return message;
    },
    [addToast, onError]
  );

  return handleError;
};

export default useErrorHandler;
