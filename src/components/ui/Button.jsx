import React from 'react';
import { motion } from 'framer-motion';

const variantClasses = {
  primary: 'bg-gaming-primary text-white hover:bg-gaming-primary-dark',
  secondary:
    'bg-transparent border border-secondary-700 hover:border-green-600 text-black',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
};

const baseClasses =
  'rounded-lg font-medium transition-all duration-300 ' +
  'inline-flex items-center justify-center';

const disabledClasses = 'disabled:opacity-50 disabled:cursor-not-allowed';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading = false,
  disabled = false,
  withAnimation = true,
  onClick,
  type = 'button',
  ...props
}) => {
  const ButtonComponent = withAnimation ? motion.button : 'button';
  const animationProps = withAnimation
    ? {
        whileHover: { scale: 1.03 },
        whileTap: { scale: 0.98 },
        transition: { type: 'spring', stiffness: 400, damping: 10 },
      }
    : {};

  return (
    <ButtonComponent
      type={type}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabledClasses}
        ${className}
      `}
      disabled={isLoading || disabled}
      onClick={onClick}
      {...animationProps}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {children}
    </ButtonComponent>
  );
};

export default Button;
