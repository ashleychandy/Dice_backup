import React from 'react';
import Button from '../ui/Button';

interface DiceControlsProps {
  selectedNumber: number;
  betAmount: string;
  onNumberSelect: (number: number) => void;
  onAmountChange: (amount: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  disabled: boolean;
}

const DiceControls: React.FC<DiceControlsProps> = ({
  selectedNumber,
  betAmount,
  onNumberSelect,
  onAmountChange,
  onSubmit,
  isSubmitting,
  disabled,
}) => {
  // Generate numbers 1-6 for dice
  const numbers = Array.from({ length: 6 }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Select Your Number</h3>
        <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
          {numbers.map(number => (
            <button
              key={number}
              onClick={() => onNumberSelect(number)}
              className={`
                w-full aspect-square rounded-lg text-2xl font-bold
                transition-all duration-200 ease-in-out
                ${
                  selectedNumber === number
                    ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              disabled={disabled}
            >
              {number}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Bet Amount (GAMA)</h3>
        <div className="flex space-x-4">
          <input
            type="text"
            value={betAmount}
            onChange={e => onAmountChange(e.target.value)}
            className={`
              w-full px-4 py-2 text-lg rounded-lg
              border-2 border-gray-300 focus:border-blue-500
              focus:outline-none transition-colors duration-200
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            `}
            placeholder="Enter bet amount"
            disabled={disabled}
          />
          <div className="flex space-x-2">
            {[0.1, 0.5, 1, 5].map(amount => (
              <button
                key={amount}
                onClick={() => onAmountChange(amount.toString())}
                className={`
                  px-3 py-2 rounded-md text-sm font-medium
                  ${
                    disabled
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                `}
                disabled={disabled}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button
        onClick={onSubmit}
        disabled={disabled || isSubmitting}
        loading={isSubmitting}
        className="w-full py-3 text-lg font-semibold"
      >
        {isSubmitting ? 'Placing Bet...' : 'Place Bet'}
      </Button>

      {/* Winning odds and multiplier info */}
      <div className="mt-4 text-sm text-gray-600">
        <p>Odds of winning: 1/6</p>
        <p>Multiplier: 5.8x</p>
        <p className="mt-2 text-xs">
          Note: Each bet requires a transaction confirmation in your wallet
        </p>
      </div>
    </div>
  );
};

export default DiceControls;
