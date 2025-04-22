import React from 'react';
import { motion } from 'framer-motion';

const Switch = ({
  id,
  checked = false,
  onChange,
  disabled = false,
  size = 'default',
  ...props
}) => {
  // Define sizes
  const sizes = {
    small: {
      track: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translateX: 16,
    },
    default: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translateX: 20,
    },
    large: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translateX: 28,
    },
  };

  // Get size configuration
  const sizeConfig = sizes[size] || sizes.default;

  return (
    <div className="flex items-center">
      <motion.button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex flex-shrink-0 items-center rounded-full
          transition-colors duration-200 ease-in-out focus:outline-none
          focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-75
          ${sizeConfig.track}
          ${checked ? 'bg-gaming-primary' : 'bg-secondary-800'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        {...props}
      >
        <span className="sr-only">Toggle</span>
        <motion.span
          layout
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
          initial={false}
          animate={{
            translateX: checked ? sizeConfig.translateX : 0,
          }}
          className={`
            ${sizeConfig.thumb}
            rounded-full bg-white shadow-md
            transform ring-0 pointer-events-none
            ${checked ? 'ml-0.5' : 'ml-0.5'}
          `}
        />
      </motion.button>
    </div>
  );
};

export default Switch;
