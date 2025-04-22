import React from 'react';
import { motion } from 'framer-motion';

const variants = {
  primary: 'bg-green-600 hover:bg-green-700 text-white',
  secondary: 'bg-secondary-800 hover:bg-secondary-700 text-white',
  danger: 'bg-gaming-error hover:bg-gaming-error/90 text-white',
  success: 'bg-gaming-success hover:bg-gaming-success/90 text-white',
  warning: 'bg-gaming-warning hover:bg-gaming-warning/90 text-white',
  info: 'bg-gaming-info hover:bg-gaming-info/90 text-white',
  ghost: 'bg-transparent hover:bg-secondary-800 text-white',
  outline:
    'bg-transparent border border-secondary-700 hover:border-green-600 text-white',
};

const sizes = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
  xl: 'px-8 py-4 text-xl',
};

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
  const baseClasses =
    'rounded-lg font-medium transition-all duration-300 inline-flex items-center justify-center';
  const disabledClasses = 'disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = variants[variant] || variants.primary;
  const sizeClasses = sizes[size] || sizes.md;

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
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${disabledClasses} ${className}`}
      disabled={isLoading || disabled}
      onClick={onClick}
      {...animationProps}
      {...props}
    >
      {isLoading && (
        <svg
          className="w-5 h-5 mr-2 animate-spin"
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
