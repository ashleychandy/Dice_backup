import { useState, useCallback } from 'react';

/**
 * Custom hook for managing toast notifications
 * @returns {Object} Toast state and functions
 */
export const useToasts = () => {
  const [toasts, setToasts] = useState([]);

  /**
   * Add a toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (info, success, warning, error)
   * @returns {Function} Function to clear the timeout
   */
  const addToast = useCallback((message, type = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    setToasts(prev => {
      if (prev.some(toast => toast.message === message)) {
        return prev;
      }

      const newToasts = [...prev, { id, message, type }];
      if (newToasts.length > 3) {
        return newToasts.slice(-3);
      }
      return newToasts;
    });

    const timeoutId = setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, []);

  /**
   * Remove a toast notification
   * @param {string} id - Toast ID
   */
  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
};
