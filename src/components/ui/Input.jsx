import React from 'react';

const Input = ({
  label,
  id,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  className = '',
  leftIcon,
  rightIcon,
  disabled = false,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-white/80 text-sm font-medium mb-2"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary-500">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`
            input-gaming w-full
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${
              error
                ? 'border-gaming-error/50 focus:ring-gaming-error/50 focus:border-gaming-error'
                : ''
            }
            ${disabled ? 'opacity-70 cursor-not-allowed' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-500">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-gaming-error">{error}</p>}
    </div>
  );
};

export default Input;
