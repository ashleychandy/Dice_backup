import { motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import { formatTokenAmount, parseTokenAmount } from '../../utils/formatting';
import Input from '../ui/Input';

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
        const formatted = formatTokenAmount(value, 0);
        if (displayValue !== formatted) {
          setDisplayValue(formatted);
        }
      }
    } catch (err) {
      console.error('Error formatting value:', err);
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
        // For direct validation from the input field, convert to BigInt
        let amount;
        if (input.includes('e')) {
          // Handle scientific notation
          amount = BigInt(Math.floor(Number(input)));
        } else {
          // Parse the whole number directly
          amount = BigInt(input) * BigInt(10) ** BigInt(18);
        }

        // Check if amount is below minimum
        const minAmount = BigInt(min);
        if (amount < minAmount) {
          return {
            isValid: false,
            error: `Minimum bet is ${formatTokenAmount(min)} GAMA`,
          };
        }

        // Check if amount exceeds balance
        const balanceAmount = BigInt(userBalance);
        if (amount > balanceAmount) {
          return {
            isValid: false,
            error: 'Insufficient balance',
          };
        }

        return { isValid: true };
      } catch (err) {
        console.error('Error in validation:', err);
        return {
          isValid: false,
          error: 'Invalid amount',
        };
      }
    },
    [min, userBalance]
  );

  // Remove the debounced validation function and provide a direct one
  const validateAndUpdateAmount = useCallback(
    input => {
      try {
        if (!input) {
          onChange(BigInt(0));
          setError('');
          return;
        }

        // Convert input to BigInt
        const amount = BigInt(input) * BigInt(10) ** BigInt(18);

        // Validate the input
        const validation = validateInput(input);

        // Update the error state based on validation
        if (!validation.isValid) {
          setError(validation.error);
        } else {
          setError('');
        }

        // Always update parent state to ensure instant UI response
        onChange(amount);
      } catch (err) {
        console.error('Error in validateAndUpdateAmount:', err);
        setError('Invalid amount');
      }
    },
    [onChange, validateInput]
  );

  // Handle input changes
  const handleInputChange = e => {
    const input = e.target.value;

    // Validate empty input
    if (!input) {
      setDisplayValue('');
      onChange(BigInt(0));
      setError('');
      return;
    }

    // Only allow whole numbers without decimal points
    if (!/^\d+$/.test(input)) {
      return;
    }

    // Update local display value immediately
    setDisplayValue(input);

    try {
      // Immediately validate and update parent state
      validateAndUpdateAmount(input);
    } catch (err) {
      console.error('Error processing input change:', err);
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
        currentAmount = parseTokenAmount(displayValue);
      }

      // Double the current amount
      const newAmount = currentAmount * BigInt(2);

      // Format as whole number
      const formatted = formatTokenAmount(newAmount);

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
      console.error('Error doubling amount:', err);
    }
  };

  const handleHalfAmount = () => {
    if (disabled) return;

    try {
      let currentAmount;
      if (!displayValue || displayValue === '') {
        return;
      } else {
        currentAmount = parseTokenAmount(displayValue);
      }

      // Halve the current amount, ensuring it's not less than minimum
      // Note: Integer division will automatically round down
      const newAmount = currentAmount / BigInt(2);

      // Format as whole number
      const formatted = formatTokenAmount(newAmount);

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
      console.error('Error halving amount:', err);
    }
  };

  // Handle repeat last bet
  const handleRepeatLastBet = () => {
    if (disabled || !lastBetAmount || !onRepeatLastBet) return;

    try {
      const formatted = formatTokenAmount(lastBetAmount);

      // Update local display value immediately
      setDisplayValue(formatted);

      // Immediately update parent with BigInt value
      onChange(lastBetAmount);

      const validation = validateInput(formatted);
      if (!validation.isValid) {
        setError(validation.error);
      } else {
        setError('');
        // Trigger the repeat bet function if provided
        onRepeatLastBet();
      }
    } catch (err) {
      console.error('Error repeating last bet:', err);
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
