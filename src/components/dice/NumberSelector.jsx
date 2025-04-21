import React from 'react';
import { motion } from 'framer-motion';

const NumberSelector = ({ value, onChange, disabled = false }) => {
  const numbers = [1, 2, 3, 4, 5, 6];

  return (
    <div className="space-y-2">
      <label className="block text-white/80 text-sm font-medium">
        Choose Number:
      </label>
      <div className="grid grid-cols-6 gap-2">
        {numbers.map(number => (
          <motion.button
            key={number}
            type="button"
            disabled={disabled}
            whileHover={!disabled && { scale: 1.1 }}
            whileTap={!disabled && { scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            onClick={() => onChange(number)}
            className={`
              number-button ${
                value === number ? 'border-gaming-primary shadow-glow' : ''
              }
              ${
                disabled
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:border-gaming-primary/70 hover:shadow-md'
              }
            `}
          >
            {number}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default NumberSelector;
