import React from 'react';
import { motion } from 'framer-motion';

const Toast = ({ message, type, onClose }) => {
  // Ensure message is always a string
  const displayMessage =
    typeof message === 'string'
      ? message
      : message instanceof Error
        ? message.message || 'An error occurred'
        : 'An error occurred';

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`max-w-md w-full p-4 rounded-xl shadow-xl 
                border transition-all duration-300
                ${
                  type === 'success'
                    ? 'bg-gaming-success/10 border-gaming-success/30'
                    : type === 'error'
                      ? 'bg-gaming-error/10 border-gaming-error/30'
                      : type === 'warning'
                        ? 'bg-gaming-warning/10 border-gaming-warning/30'
                        : 'bg-gaming-info/10 border-gaming-info/30'
                }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2 rounded-full 
                      ${
                        type === 'success'
                          ? 'bg-gaming-success/20'
                          : type === 'error'
                            ? 'bg-gaming-error/20'
                            : type === 'warning'
                              ? 'bg-gaming-warning/20'
                              : 'bg-gaming-info/20'
                      }`}
          />
          <p className="text-white/90 font-medium">{displayMessage}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white/90 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </motion.div>
  );
};

export default Toast;
