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
        // Handle different message types (including objects)
        if (
          typeof message === 'object' &&
          message !== null &&
          !(message instanceof Error)
        ) {
          // If it's an object with title and description, keep it as is
          if (message.title || message.description) {
            addToastBase(message, type, duration);
            return;
          }

          // Otherwise convert to string
          addToastBase(JSON.stringify(message), type, duration);
          return;
        }

        // Handle strings and errors
        const messageString =
          typeof message === 'string'
            ? message
            : message instanceof Error
              ? message.message || 'An error occurred'
              : String(message || 'An error occurred');

        addToastBase(messageString, type, duration);
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
      // Handle objects with title and description
      if (
        typeof message === 'object' &&
        message !== null &&
        !(message instanceof Error)
      ) {
        // If it's an object with title and description, keep it as is
        if (message.title || message.description) {
          if (type === 'error' || duration === 0) {
            // Show errors immediately
            addToastBase(message, type, duration);
          } else {
            debouncedAddToastRef.current?.(message, type, duration);
          }
          return;
        }
      }

      // Handle strings and errors
      const messageString =
        typeof message === 'string'
          ? message
          : message instanceof Error
            ? message.message || 'An error occurred'
            : typeof message === 'object'
              ? JSON.stringify(message)
              : String(message || 'An error occurred');

      if (type === 'error' || duration === 0) {
        // Show errors and zero-duration toasts immediately
        addToastBase(messageString, type, duration);
      } else {
        debouncedAddToastRef.current?.(messageString, type, duration);
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
