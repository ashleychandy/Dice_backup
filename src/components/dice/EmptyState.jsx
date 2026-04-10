import React from 'react';
import { motion } from 'framer-motion';

const EmptyState = ({ message, icon = '🎲', customIcon }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4 }}
    className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-secondary-200 shadow-sm"
  >
    {customIcon ? (
      customIcon
    ) : (
      <div className="w-16 h-16 mb-4 rounded-full bg-secondary-100 flex items-center justify-center">
        <span className="text-2xl">{icon}</span>
      </div>
    )}
    <h3 className="text-lg font-medium text-secondary-800 mb-2">
      No Game History
    </h3>
    <p className="text-sm text-secondary-600 max-w-md">
      {message || 'Your dice game history will appear here after you play.'}
    </p>
    <div className="mt-4 p-3 bg-secondary-50 rounded-lg text-sm text-secondary-600 max-w-xs">
      <p>Ready to play? Choose a number and place your bet to get started!</p>
    </div>
  </motion.div>
);

export default EmptyState;
