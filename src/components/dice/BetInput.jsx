import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Button from '../ui/Button';
import Input from '../ui/Input';
import {
  formatTokenAmount,
  parseTokenAmount,
  calculatePercentage,
} from '../../utils/formatting';

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
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [error, setError] = useState('');
  const [activePercentage, setActivePercentage] = useState(null);

  // Convert wei value to display value
  useEffect(() => {
    try {
      if (!value || value === '0') {
        setDisplayValue('');
        setActivePercentage(null);
      } else {
        // Only update display value from props if it's different from current input
        // This prevents overriding user input
        const formatted = formatTokenAmount(value, 0);
        if (displayValue !== formatted) {
          console.log('Updating display value from props:', {
            value: value.toString(),
            formatted,
            currentDisplay: displayValue,
          });
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
        console.log('Invalid input format (non-whole number):', input);
        return {
          isValid: false,
          error: 'Only whole numbers are allowed',
        };
      }

      try {
        console.log('Validating input:', input);

        // For direct validation from the input field, convert to BigInt
        let amount;
        if (input.includes('e')) {
          // Handle scientific notation
          amount = BigInt(Math.floor(Number(input)));
        } else {
          // Parse the whole number directly
          amount = BigInt(input) * BigInt(10) ** BigInt(18);
        }
        console.log('Parsed amount for validation:', amount.toString());

        // Check if amount is below minimum
        const minAmount = BigInt(min);
        if (amount < minAmount) {
          console.log('Amount below minimum:', {
            amount: amount.toString(),
            min: minAmount.toString(),
          });
          return {
            isValid: false,
            error: `Minimum bet is ${formatTokenAmount(min)} GAMA`,
          };
        }

        // Check if amount exceeds balance
        const balanceAmount = BigInt(userBalance);
        if (amount > balanceAmount) {
          console.log('Insufficient balance:', {
            amount: amount.toString(),
            balance: balanceAmount.toString(),
          });
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
    setActivePercentage(null);

    try {
      // Immediately validate and update parent state
      validateAndUpdateAmount(input);
    } catch (err) {
      console.error('Error processing input change:', err);
    }
  };

  // Handle quick amount buttons
  const handleQuickAmount = percentage => {
    if (disabled || !userBalance) return;

    try {
      // Calculate percentage and round to the nearest whole number
      const amount = calculatePercentage(userBalance, percentage);
      const formatted = formatTokenAmount(amount);

      // Update local display value immediately
      setDisplayValue(formatted);
      setActivePercentage(percentage);

      // Immediately update parent with BigInt value
      onChange(amount);

      // Check for any validation errors
      const validation = validateInput(formatted);
      if (!validation.isValid) {
        setError(validation.error);
      } else {
        setError('');
      }
    } catch (err) {
      console.error('Error calculating quick amount:', err);
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
      setActivePercentage(null);

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
      setActivePercentage(null);

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

  // Handle plus/minus adjustment buttons
  const handleAdjustAmount = increment => {
    if (disabled) return;

    try {
      let currentAmount;
      if (!displayValue || displayValue === '') {
        currentAmount = BigInt(0);
      } else {
        currentAmount = parseTokenAmount(displayValue);
      }

      // Calculate adjustment - use 1 as minimum adjustment for whole numbers
      let adjustment;
      if (currentAmount === BigInt(0)) {
        adjustment = BigInt(1) * BigInt(10) ** BigInt(18); // 1 token
      } else {
        adjustment = calculatePercentage(currentAmount, 10);
        if (adjustment === BigInt(0)) {
          adjustment = BigInt(1) * BigInt(10) ** BigInt(18); // 1 token
        }
      }

      // Calculate new amount
      let newAmount;
      if (increment) {
        newAmount = currentAmount + adjustment;
      } else {
        newAmount =
          currentAmount > adjustment ? currentAmount - adjustment : BigInt(0);
      }

      // Format as whole number
      const formatted = formatTokenAmount(newAmount);

      // Update local display value immediately
      setDisplayValue(formatted);
      setActivePercentage(null);

      // Immediately update parent with BigInt value
      onChange(newAmount);

      const validation = validateInput(formatted);
      if (!validation.isValid) {
        setError(validation.error);
      } else {
        setError('');
      }
    } catch (err) {
      console.error('Error adjusting amount:', err);
    }
  };

  // Handle repeat last bet
  const handleRepeatLastBet = () => {
    if (disabled || !lastBetAmount || !onRepeatLastBet) return;

    try {
      const formatted = formatTokenAmount(lastBetAmount);

      // Update local display value immediately
      setDisplayValue(formatted);
      setActivePercentage(null);

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
  const formattedBalance = formatTokenAmount(userBalance, 4);

  return (
    <div className="space-y-4">
      <div className="relative bg-white p-4 rounded-lg border border-green-200">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              label={
                <div className="flex justify-between">
                  <span>Bet Amount (GAMA)</span>
                  <span className="text-xs text-secondary-600">
                    Balance:{' '}
                    <span className="text-green-600">{formattedBalance}</span>
                  </span>
                </div>
              }
              type="text"
              value={displayValue}
              onChange={handleInputChange}
              placeholder="0.0"
              disabled={disabled}
              error={error}
              className="w-full"
            />
          </div>
          <div className="mt-8 flex-shrink-0 flex flex-col space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAdjustAmount(true)}
              disabled={disabled}
              aria-label="Increase bet amount"
              className="text-green-600 hover:bg-green-500/10 hover:border-green-600"
            >
              +
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAdjustAmount(false)}
              disabled={disabled || !displayValue}
              aria-label="Decrease bet amount"
              className="text-green-600 hover:bg-green-500/10 hover:border-green-600"
            >
              -
            </Button>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-red-900/80 text-red-200 text-xs rounded-full"
          >
            {error}
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        <QuickButton
          onClick={() => handleQuickAmount(0.1)}
          disabled={disabled}
          active={activePercentage === 0.1}
        >
          10%
        </QuickButton>
        <QuickButton
          onClick={() => handleQuickAmount(0.25)}
          disabled={disabled}
          active={activePercentage === 0.25}
        >
          25%
        </QuickButton>
        <QuickButton
          onClick={() => handleQuickAmount(0.5)}
          disabled={disabled}
          active={activePercentage === 0.5}
        >
          50%
        </QuickButton>
        <QuickButton
          onClick={() => handleQuickAmount(0.75)}
          disabled={disabled}
          active={activePercentage === 0.75}
        >
          75%
        </QuickButton>
        <QuickButton
          onClick={() => handleQuickAmount(1)}
          disabled={disabled}
          active={activePercentage === 1}
        >
          Max
        </QuickButton>
      </div>

      <div className="flex flex-wrap gap-2">
        <QuickButton
          onClick={handleDoubleAmount}
          disabled={disabled || !displayValue}
        >
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
            Double
          </div>
        </QuickButton>
        <QuickButton
          onClick={handleHalfAmount}
          disabled={disabled || !displayValue}
        >
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8z"
                clipRule="evenodd"
              />
            </svg>
            Half
          </div>
        </QuickButton>
        {lastBetAmount && onRepeatLastBet && (
          <QuickButton onClick={handleRepeatLastBet} disabled={disabled}>
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              Repeat
            </div>
          </QuickButton>
        )}
      </div>
    </div>
  );
};

export default BetInput;
