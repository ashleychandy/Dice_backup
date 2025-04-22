import { useState, useCallback } from 'react';

/**
 * Custom hook for managing toast notifications
 * @returns {Object} Toast management methods and state
 */
export const useToasts = () => {
  const [toasts, setToasts] = useState([]);

  // Define removeToast first to use it in addToast
  const removeToast = useCallback(id => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  /**
   * Add a new toast notification
   * @param {string} message - The toast message
   * @param {string} type - The toast type (info, success, warning, error)
   * @param {number} duration - Duration in ms (0 for persistent toast)
   * @returns {string} The ID of the created toast
   */
  const addToast = useCallback(
    (message, type = 'info', duration = 5000) => {
      const id = Date.now().toString();

      setToasts(prevToasts => {
        // Check for duplicate message
        const existingToast = prevToasts.find(
          toast => toast.message === message
        );
        if (existingToast) {
          // Return the same array if message already exists
          return prevToasts;
        }

        // Add new toast and limit to 5 maximum
        const newToasts = [
          ...prevToasts,
          {
            id,
            message,
            type,
            duration,
          },
        ];

        // Keep only the most recent 5 toasts
        return newToasts.slice(-5);
      });

      // Auto-remove toast after duration (if not persistent)
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  /**
   * Clear all active toasts
   */
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
  };
};

export default useToasts;
