import React from 'react';
import { motion } from 'framer-motion';

const DiceNumber = ({ number, selected, onClick, disabled }) => {
  // All dice numbers will use green colors
  const greenColor = {
    bg: 'from-green-500 to-green-700',
    border: 'border-green-300',
    shadow: 'shadow-green-500/30',
  };

  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileHover={!disabled && { scale: 1.05, y: -3 }}
      whileTap={!disabled && { scale: 0.95 }}
      animate={selected ? { y: -4 } : { y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={() => onClick(number)}
      className={`
        relative w-full aspect-square rounded-xl
        flex items-center justify-center
        font-bold text-2xl
        transition-all duration-300
        border-2
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        ${
          selected
            ? `bg-gradient-to-br ${greenColor.bg} text-white border-white shadow-lg ${greenColor.shadow}`
            : 'bg-green-50 text-green-700 border-green-200 hover:border-green-400'
        }
      `}
    >
      {/* Dice face */}
      <span className="relative z-10">{number}</span>

      {/* Glow effect when selected */}
      {selected && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-white opacity-20"
          animate={{ opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Removed dice dot patterns */}
    </motion.button>
  );
};

const NumberSelector = ({ value, onChange, disabled = false }) => {
  const numbers = [1, 2, 3, 4, 5, 6];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-secondary-700 text-sm font-medium">
          Choose Your Lucky Number:
        </label>
        {value && (
          <div className="text-sm font-medium px-3 py-1 rounded-full bg-green-500/20 text-green-600 border border-green-500/30">
            Selected: {value}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {numbers.map(number => (
          <DiceNumber
            key={number}
            number={number}
            selected={value === number}
            onClick={onChange}
            disabled={disabled}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center text-xs text-secondary-600"
      >
        Select one number from 1 to 6. If the dice rolls your number, you win!
      </motion.div>
    </div>
  );
};

export default NumberSelector;
