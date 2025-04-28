import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { formatEther } from 'ethers';
import { RESULT_FORCE_STOPPED, RESULT_RECOVERED } from '../../constants/game';

// Helper function to get result type
const getResultType = game => {
  const rolledNumber = Number(game.rolledNumber);
  const chosenNumber = Number(game.chosenNumber);

  if (rolledNumber === chosenNumber && rolledNumber >= 1 && rolledNumber <= 6) {
    return 'WIN';
  } else if (
    rolledNumber !== chosenNumber &&
    rolledNumber >= 1 &&
    rolledNumber <= 6
  ) {
    return 'LOSS';
  } else if (game.isPending) {
    return 'PENDING';
  } else if (rolledNumber === RESULT_FORCE_STOPPED) {
    return 'STOPPED';
  } else if (rolledNumber === RESULT_RECOVERED) {
    return 'RECOVERED';
  } else {
    return 'EVEN';
  }
};

// Get text color for result
const getResultStyles = resultType => {
  switch (resultType) {
    case 'WIN':
      return 'text-green-600';
    case 'LOSS':
      return 'text-red-600';
    case 'EVEN':
      return 'text-gray-600';
    case 'PENDING':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
};

// Get background color for the card
const getCardBackground = resultType => {
  switch (resultType) {
    case 'WIN':
      return 'bg-green-50 border-green-100';
    case 'LOSS':
      return 'bg-red-50 border-red-100';
    case 'EVEN':
      return 'bg-white border-gray-200';
    case 'PENDING':
      return 'bg-blue-50 border-blue-100';
    default:
      return 'bg-white border-gray-200';
  }
};

// Get formatted date
const getFormattedDate = timestamp => {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp * 1000);
  return formatDistanceToNow(date, { addSuffix: true });
};

// Format bet amount more compactly
const formatAmount = amount => {
  const value = parseFloat(amount);
  if (isNaN(value)) return '0';

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  if (value < 0.01) {
    return '<0.01';
  }

  return value.toFixed(2);
};

const GameHistoryItem = ({ game, index, compact = false }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    if (!compact) {
      setExpanded(!expanded);
    }
  };

  // Animate in with a staggered delay based on index
  const animationDelay = index * 0.03;

  const resultType = getResultType(game);
  const resultStyles = getResultStyles(resultType);
  const cardBackground = getCardBackground(resultType);

  const rolledNumber = Number(game.rolledNumber);
  const chosenNumber = Number(game.chosenNumber);
  const betAmount = formatEther(game.betAmount || '0');
  const formattedBetAmount = formatAmount(betAmount);

  // Format payout with +1 for wins
  const payout = formatEther(game.payout || '0');
  const formattedPayout =
    resultType === 'WIN'
      ? `${formatAmount(payout)} (+1)`
      : formatAmount(payout);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: animationDelay, duration: 0.2 }}
        className={`rounded-lg border shadow-sm overflow-hidden h-full ${cardBackground}`}
      >
        <div className="p-3 h-full flex flex-col">
          {/* Header with result indicator */}
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium text-secondary-500">
              {chosenNumber >= 1 && chosenNumber <= 6 ? `Red` : ''}
            </div>
            <div className={`text-xs font-bold ${resultStyles}`}>
              {resultType}
            </div>
          </div>

          {/* Main content with numbers */}
          <div className="flex items-center justify-between flex-grow mb-2">
            <div className="text-3xl font-bold text-secondary-800">
              {rolledNumber >= 1 && rolledNumber <= 6 ? rolledNumber : 0}
            </div>

            <div className="text-lg font-medium text-secondary-800">
              {chosenNumber >= 1 && chosenNumber <= 6 ? chosenNumber : '?'}
            </div>
          </div>

          {/* Bottom with amount */}
          <div className="flex justify-between items-center mt-auto">
            <div className="text-xs text-secondary-600">
              {formattedBetAmount} GAMA
            </div>
            {resultType === 'WIN' && (
              <div className="text-xs font-medium text-green-600">
                {formattedPayout}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Original expanded version
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay, duration: 0.2 }}
      className={`rounded-lg border shadow-sm overflow-hidden ${cardBackground}`}
    >
      <div className="p-3 cursor-pointer" onClick={toggleExpand}>
        <div className="flex justify-between items-center">
          {/* Left side with rolled number */}
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-secondary-800">
              {rolledNumber >= 1 && rolledNumber <= 6 ? rolledNumber : 0}
            </div>

            <div>
              <div className="font-medium text-secondary-800">
                {chosenNumber >= 1 && chosenNumber <= 6 ? chosenNumber : '?'}
              </div>
              <div className="text-xs text-secondary-500">
                {resultType === 'WIN' || resultType === 'LOSS' ? 'Red' : ''}
              </div>
            </div>
          </div>

          {/* Right side with result and amount */}
          <div className="text-right">
            <div className={`font-bold ${resultStyles}`}>{resultType}</div>
            <div className="text-secondary-800 font-medium">
              {betAmount} GAMA
            </div>
            {resultType === 'WIN' && (
              <div className="text-xs text-green-600 font-medium">
                Total Payout: {payout} (+1)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white/60 border-t"
          >
            <div className="p-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div>
                  <span className="text-secondary-500">Game ID:</span>{' '}
                  <span className="text-secondary-800">
                    {game.gameId || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-500">Timestamp:</span>{' '}
                  <span className="text-secondary-800">
                    {getFormattedDate(game.timestamp)}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-500">Bet Amount:</span>{' '}
                  <span className="text-secondary-800">{betAmount} GAMA</span>
                </div>
                <div>
                  <span className="text-secondary-500">Payout:</span>{' '}
                  <span className="text-secondary-800">
                    {game.payout ? `${payout} GAMA` : '0 GAMA'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GameHistoryItem;
