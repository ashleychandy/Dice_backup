import { motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import { formatTokenAmount, _parseTokenAmount } from '../../utils/formatting';
import Input from '../ui/Input';
import { ethers as _ethers } from 'ethers';

const QuickButton = ({ onClick, disabled, children, active = false }) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    whileHover={!disabled && { scale: 1.05, y: -2 }}
    whileTap={!disabled && { scale: 0.95 }}
    className={`
      px-3 py-2 rounded-md text-sm font-medium
      shadow-sm backdrop-blur-sm
      transition-all duration-200
      ${
        active
          ? 'bg-green-600 text-white shadow-md shadow-green-600/30'
          : 'bg-green-500/20 text-green-700 hover:bg-green-500/30 border border-green-500/20 hover:border-green-600/50'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    {children}
  </motion.button>
);

const BetInput = ({
  value,
  onChange,
  min = '1',
  userBalance = '0',
  disabled = false,
  lastBetAmount = null,
  onRepeatLastBet = null,
  children,
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [error, setError] = useState('');

  // Convert wei value to display value
  useEffect(() => {
    try {
      if (!value || value === '0') {
        setDisplayValue('');
      } else {
        // Only update display value from props if it's different from current input
        // This prevents overriding user input
        let formatted = formatTokenAmount(value, 0);

        // Ensure formatted is a clean string with no extra characters
        formatted = formatted.replace(/[^0-9]/g, '');

        if (displayValue !== formatted) {
          setDisplayValue(formatted);
        }
      }
    } catch (err) {
      /* Silently handle formatting errors */
    }
  }, [value, displayValue]);

  // Validate the input and update error state
  const validateInput = useCallback(
    input => {
      if (!input) return { isValid: true };

      // Verify input is a valid whole number
      if (!/^\d+$/.test(input)) {
        return {
          isValid: false,
          error: 'Only whole numbers are allowed',
        };
      }

      try {
        // Convert input to BigInt with 18 decimals (wei)
        const amount = BigInt(input) * BigInt(10) ** BigInt(18);

        // Parse min value properly ensuring it's always BigInt
        const minAmount =
          typeof min === 'string'
            ? BigInt(min)
            : typeof min === 'number'
              ? BigInt(Math.floor(min))
              : typeof min === 'bigint'
                ? min
                : BigInt(1);

        // Check if amount is below minimum
        if (amount < minAmount) {
          return {
            isValid: false,
            error: `Minimum bet is ${formatTokenAmount(minAmount)} GAMA`,
          };
        }

        // Safely convert userBalance to BigInt
        let balanceAmount;
        try {
          if (typeof userBalance === 'bigint') {
            // Already a BigInt, use directly
            balanceAmount = userBalance;
          } else if (typeof userBalance === 'string') {
            // Convert string to BigInt, handle empty string
            balanceAmount =
              userBalance === '' ? BigInt(0) : BigInt(userBalance);
          } else if (typeof userBalance === 'number') {
            // Convert number to BigInt, handle potential floating point
            balanceAmount = BigInt(Math.floor(userBalance));
          } else if (
            userBalance &&
            typeof userBalance.toString === 'function'
          ) {
            // Convert object to BigInt via toString
            const balanceStr = userBalance.toString();
            balanceAmount = balanceStr === '' ? BigInt(0) : BigInt(balanceStr);
          } else {
            // Unable to convert, use 0
            balanceAmount = BigInt(0);
          }
        } catch (error) {
          balanceAmount = BigInt(0);
        }

        // Ensure both values are BigInt before comparison
        const betAmountBigInt = BigInt(amount.toString());
        const userBalanceBigInt = BigInt(balanceAmount.toString());

        // Compare using BigInt values
        if (betAmountBigInt > userBalanceBigInt) {
          return {
            isValid: false,
            error: 'Insufficient balance',
          };
        }

        return { isValid: true };
      } catch (err) {
        return {
          isValid: false,
          error: 'Invalid amount',
        };
      }
    },
    [min, userBalance]
  );

  // Handle input changes - simplified
  const handleInputChange = e => {
    const input = e.target.value;

    // Only allow digits
    if (input !== '' && !/^\d+$/.test(input)) {
      return;
    }

    // Update the displayed value immediately
    setDisplayValue(input);

    if (input === '') {
      // Handle empty input
      onChange(BigInt(0));
      setError('');
    } else {
      try {
        // Convert to BigInt with 18 decimals (wei)
        const amount = BigInt(input) * BigInt(10) ** BigInt(18);

        // Validate
        const validation = validateInput(input);

        if (!validation.isValid) {
          setError(validation.error);
        } else {
          setError('');
        }

        // Update parent
        onChange(amount);
      } catch (err) {
        setError('Invalid amount');
      }
    }
  };

  // Handle double/half amount
  const handleDoubleAmount = () => {
    if (disabled) return;

    try {
      let currentAmount;
      if (!displayValue || displayValue === '') {
        currentAmount = BigInt(0);
      } else {
        // Parse the current display value directly
        currentAmount = BigInt(displayValue) * BigInt(10) ** BigInt(18);
      }

      // Double the current amount
      const newAmount = currentAmount * BigInt(2);

      // Format for display - ensure it's a clean string
      let formatted = formatTokenAmount(newAmount, 0);
      formatted = formatted.replace(/[^0-9]/g, '');

      // Update local display value immediately
      setDisplayValue(formatted);

      // Immediately update parent with BigInt value
      onChange(newAmount);

      const validation = validateInput(formatted);
      if (!validation.isValid) {
        setError(validation.error);
      } else {
        setError('');
      }
    } catch (err) {
      /* Silently handle calculation errors */
    }
  };

  const handleHalfAmount = () => {
    if (disabled) return;

    try {
      if (!displayValue || displayValue === '') {
        return;
      }

      // Parse the current display value directly
      const currentAmount = BigInt(displayValue) * BigInt(10) ** BigInt(18);

      // Halve the current amount, ensuring it's not less than minimum
      // Note: Integer division will automatically round down
      const newAmount = currentAmount / BigInt(2);

      // Format for display - ensure it's a clean string
      let formatted = formatTokenAmount(newAmount, 0);
      formatted = formatted.replace(/[^0-9]/g, '');

      // Update local display value immediately
      setDisplayValue(formatted);

      // Immediately update parent with BigInt value
      onChange(newAmount);

      const validation = validateInput(formatted);
      if (!validation.isValid) {
        setError(validation.error);
      } else {
        setError('');
      }
    } catch (err) {
      /* Silently handle calculation errors */
    }
  };

  // Handle repeat last bet
  const handleRepeatLastBet = () => {
    if (disabled || !lastBetAmount || !onRepeatLastBet) return;

    try {
      // Format for display - ensure it's a clean string
      let formatted = formatTokenAmount(lastBetAmount, 0);
      formatted = formatted.replace(/[^0-9]/g, '');

      // Update local display value immediately
      setDisplayValue(formatted);

      // Validate using the formatted value
      const validation = validateInput(formatted);
      if (!validation.isValid) {
        setError(validation.error);
        // Still update the value but don't trigger onRepeatLastBet
        onChange(lastBetAmount);
      } else {
        setError('');

        // Immediately update parent with BigInt value
        onChange(lastBetAmount);

        // Trigger the repeat bet function if provided
        onRepeatLastBet();
      }
    } catch (err) {
      /* Silently handle calculation errors */
    }
  };

  // Format balance for display (can show decimals, but bet is whole number)
  // const formattedBalance = formatTokenAmount(userBalance, 4);

  return (
    <div className="space-y-4">
      <div>
        <Input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          placeholder="Enter bet amount"
          disabled={disabled}
          error={error}
          className="w-full"
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <QuickButton
            onClick={handleHalfAmount}
            disabled={disabled || !value || value === '0'}
          >
            ½
          </QuickButton>
          <QuickButton
            onClick={handleDoubleAmount}
            disabled={disabled || !value || value === '0'}
          >
            2×
          </QuickButton>
          {lastBetAmount && onRepeatLastBet && (
            <QuickButton onClick={handleRepeatLastBet} disabled={disabled}>
              Repeat
            </QuickButton>
          )}
        </div>
        {children}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default BetInput;
