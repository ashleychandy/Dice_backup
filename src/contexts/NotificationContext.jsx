import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { AnimatePresence } from 'framer-motion';
import debounce from 'lodash/debounce';
import Toast from '../components/ui/Toast';
import { useToasts } from '../hooks/useToasts';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { toasts, addToast: addToastBase, removeToast } = useToasts();
  const debouncedAddToastRef = useRef(null);

  // Create debounced function with cleanup
  useEffect(() => {
    debouncedAddToastRef.current = debounce(
      (message, type = 'info', duration = 5000) => {
        addToastBase(message, type, duration);
      },
      300
    );

    return () => {
      if (debouncedAddToastRef.current) {
        debouncedAddToastRef.current.cancel();
      }
    };
  }, [addToastBase]);

  // Wrapper function to handle immediate notifications
  const addToast = useCallback(
    (message, type = 'info', duration = 5000) => {
      if (type === 'error' || duration === 0) {
        // Show errors and zero-duration toasts immediately
        addToastBase(message, type, duration);
      } else {
        debouncedAddToastRef.current?.(message, type, duration);
      }
    },
    [addToastBase]
  );

  // Value to be provided to consumers
  const value = {
    addToast,
    removeToast,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="fixed bottom-0 right-0 p-4 flex flex-col gap-3 items-end z-50">
        <AnimatePresence>
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotification must be used within a NotificationProvider'
    );
  }
  return context;
};

export default NotificationContext;
