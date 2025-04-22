import React from 'react';
import { motion } from 'framer-motion';
import {
  formatTokenAmount,
  formatTimestamp,
  formatDiceResult,
} from '../../utils/formatting';

const GameHistoryItem = ({ game, index }) => {
  // Define constants for special result codes (matching contract)
  const RESULT_FORCE_STOPPED = 254;
  const RESULT_RECOVERED = 255;

  // Convert string values to appropriate types
  const chosenNumber = Number(game.chosenNumber);
  const rolledNumber = Number(game.rolledNumber);

  // Determine game result states
  const isWin =
    rolledNumber === chosenNumber && rolledNumber >= 1 && rolledNumber <= 6;
  const isRecovered = rolledNumber === RESULT_RECOVERED;
  const isForceStopped = rolledNumber === RESULT_FORCE_STOPPED;
  const isSpecialResult = isRecovered || isForceStopped || rolledNumber > 250;

  // Safe formatting of dice results with better handling of special cases
  const getFormattedRolledNumber = () => {
    if (rolledNumber === RESULT_RECOVERED) return '♻️';
    if (rolledNumber === RESULT_FORCE_STOPPED) return '⚠️';
    if (rolledNumber > 250) return '⚠️';
    if (rolledNumber >= 1 && rolledNumber <= 6) return rolledNumber.toString();
    return '?';
  };

  const getFormattedChosenNumber = () => {
    if (chosenNumber >= 1 && chosenNumber <= 6) return chosenNumber.toString();
    return '?';
  };

  // Background color based on game result
  const getBgColor = () => {
    if (isRecovered) return 'bg-blue-500/10 hover:bg-blue-500/20';
    if (isForceStopped) return 'bg-yellow-500/10 hover:bg-yellow-500/20';
    return isWin
      ? 'bg-gaming-success/10 hover:bg-gaming-success/20'
      : 'bg-gaming-error/10 hover:bg-gaming-error/20';
  };

  // Border color based on game result
  const getBorderColor = () => {
    if (isRecovered) return 'border-blue-500 bg-blue-500/20';
    if (isForceStopped) return 'border-yellow-500 bg-yellow-500/20';
    return isWin
      ? 'border-gaming-success bg-gaming-success/20'
      : 'border-gaming-error bg-gaming-error/20';
  };

  // Text color based on game result
  const getTextColor = () => {
    if (isRecovered) return 'text-blue-500';
    if (isForceStopped) return 'text-yellow-500';
    return isWin ? 'text-gaming-success' : 'text-gaming-error';
  };

  // Game result message with improved handling of special cases
  const getResultMessage = () => {
    if (isRecovered) return 'Game was recovered successfully';
    if (isForceStopped) return 'Game was force stopped by admin';
    if (rolledNumber > 250) return 'Game encountered an issue and was resolved';

    // Normal game case
    return (
      <>
        You bet on{' '}
        <span className="font-bold text-gaming-primary">
          {getFormattedChosenNumber()}
        </span>{' '}
        and rolled a{' '}
        <span className={`font-bold ${getTextColor()}`}>
          {getFormattedRolledNumber()}
        </span>
      </>
    );
  };

  // Financial result message with better handling of amounts
  const getFinancialResult = () => {
    if (isSpecialResult) {
      if (game.payout && game.payout !== '0') {
        return `Refunded ${formatTokenAmount(game.payout, 2)} GAMA`;
      }
      return 'No refund processed';
    }

    return isWin
      ? `+${formatTokenAmount(game.payout, 2)} GAMA`
      : `-${formatTokenAmount(game.amount, 2)} GAMA`;
  };

  // Get win multiplier for wins (payout / amount)
  const getMultiplier = () => {
    if (!isWin || isSpecialResult) return null;

    try {
      // Only calculate if both values are valid and non-zero
      if (
        !game.amount ||
        !game.payout ||
        game.amount === '0' ||
        game.payout === '0'
      ) {
        return null;
      }

      const amount = BigInt(game.amount);
      const payout = BigInt(game.payout);

      if (amount <= 0) return null;

      // Calculate multiplier as a floating point
      const multiplier = Number(payout) / Number(amount);
      return multiplier.toFixed(1) + 'x';
    } catch (e) {
      return null;
    }
  };

  // Format timestamp with reliable fallback formatting
  const getFormattedTime = () => {
    if (!game.timestamp) return 'Unknown time';

    try {
      return formatTimestamp(game.timestamp);
    } catch (e) {
      return 'Recent game';
    }
  };

  // Get amount wagered with safe formatting
  const getWageredAmount = () => {
    if (!game.amount || game.amount === '0') {
      // For special cases, we might not have the exact amount
      if (isSpecialResult) {
        return 'Variable amount';
      }
      return '0 GAMA';
    }

    try {
      return formatTokenAmount(game.amount, 2) + ' GAMA';
    } catch (e) {
      return 'Unknown amount';
    }
  };

  const multiplier = getMultiplier();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`history-item ${getBgColor()} p-4 rounded-xl border border-transparent hover:border-white/10 shadow-sm hover:shadow-md transition-all duration-300`}
      style={{ minHeight: '80px' }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white border-2 
              ${getBorderColor()}`}
          >
            {getFormattedRolledNumber()}
          </div>
          <div>
            <p className="font-semibold text-white">{getResultMessage()}</p>
            <p className="text-sm text-secondary-400">{getFormattedTime()}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end">
            <p className={`font-bold text-lg ${getTextColor()}`}>
              {getFinancialResult()}
            </p>

            {multiplier && (
              <span className="ml-2 bg-white/10 text-xs px-2 py-1 rounded-full text-white">
                {multiplier}
              </span>
            )}
          </div>

          <p className="text-xs text-secondary-400">
            Bet: {getWageredAmount()}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default GameHistoryItem;
