import React, { useState, useEffect, useCallback } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import {
  formatTokenAmount,
  parseTokenAmount,
  calculatePercentage,
} from '../../utils/formatting';

const BetInput = ({
  value,
  onChange,
  min = '1',
  userBalance = '0',
  disabled = false,
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [error, setError] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');

  // Convert wei value to display value
  useEffect(() => {
    try {
      if (!value || value === '0') {
        setDisplayValue('');
      } else {
        const formatted = formatTokenAmount(value, 6);
        setDisplayValue(formatted);
      }
    } catch (err) {
      console.error('Error formatting value:', err);
    }
  }, [value]);

  // Validate the input and update error state
  const validateInput = useCallback(
    input => {
      if (!input) return { isValid: true };

      try {
        const amount = parseTokenAmount(input);

        // Check if amount is below minimum
        if (amount < parseTokenAmount(min)) {
          return {
            isValid: false,
            error: `Minimum bet is ${formatTokenAmount(min)} GAMA`,
          };
        }

        // Check if amount exceeds balance
        if (amount > BigInt(userBalance)) {
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

  const handleInputValidation = useCallback(
    input => {
      try {
        const amount = parseTokenAmount(input);
        const validation = validateInput(input);

        if (validation.isValid) {
          onChange(amount);
          setError('');
        } else {
          onChange(amount);
          setError(validation.error);
        }
      } catch (err) {
        setError('Invalid amount');
      }
    },
    [onChange, validateInput]
  );

  // Debounce input changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (debouncedInput !== displayValue) {
        handleInputValidation(debouncedInput);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [debouncedInput, displayValue, handleInputValidation]);

  // Handle input changes
  const handleInputChange = e => {
    const input = e.target.value;
    setDisplayValue(input);

    // Validate empty input
    if (!input) {
      onChange(BigInt(0));
      setError('');
      return;
    }

    // Only allow numeric input with a single decimal point
    if (!/^[0-9]*\.?[0-9]*$/.test(input)) {
      return;
    }

    setDebouncedInput(input);
  };

  // Handle quick amount buttons
  const handleQuickAmount = percentage => {
    if (disabled || !userBalance) return;

    try {
      const amount = calculatePercentage(userBalance, percentage);
      const formatted = formatTokenAmount(amount, 6);

      setDisplayValue(formatted);
      onChange(amount);

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

      // Calculate adjustment (10% of value or minimum 0.01)
      let adjustment;
      if (currentAmount === BigInt(0)) {
        adjustment = parseTokenAmount('0.01');
      } else {
        adjustment = calculatePercentage(currentAmount, 10);
        if (adjustment === BigInt(0)) {
          adjustment = parseTokenAmount('0.01');
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

      // Format and update
      const formatted = formatTokenAmount(newAmount, 6);
      setDisplayValue(formatted);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          label="Bet Amount (GAMA)"
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          placeholder="0.0"
          disabled={disabled}
          error={error}
        />
        <div className="mt-8 flex-shrink-0 flex flex-col space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAdjustAmount(true)}
            disabled={disabled}
            aria-label="Increase bet amount"
          >
            +
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAdjustAmount(false)}
            disabled={disabled || !displayValue}
            aria-label="Decrease bet amount"
          >
            -
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickAmount(0.1)}
          disabled={disabled}
        >
          10%
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickAmount(0.25)}
          disabled={disabled}
        >
          25%
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickAmount(0.5)}
          disabled={disabled}
        >
          50%
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickAmount(0.75)}
          disabled={disabled}
        >
          75%
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickAmount(1)}
          disabled={disabled}
        >
          Max
        </Button>
      </div>
    </div>
  );
};

export default BetInput;
