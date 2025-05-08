import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faChevronUp,
  faDice,
  faClock,
  faCoins,
} from '@fortawesome/free-solid-svg-icons';
import { formatEther } from 'ethers';

// Helper function to get result type
const getResultType = game => {
  if (game.resultType === 'normal') {
    const rolledNumber = Number(game.rolledNumber);
    const chosenNumber = Number(game.chosenNumber);
    if (rolledNumber === chosenNumber) {
      return 'WIN';
    }
    return 'LOSS';
  } else if (
    game.resultType === 'unknown' ||
    game.isPending ||
    !game.requestFulfilled
  ) {
    return 'PENDING';
  } else if (game.resultType === 'force_stopped' || game.rolledNumber === 254) {
    return 'STOPPED';
  } else if (game.resultType === 'recovered' || game.rolledNumber === 255) {
    return 'RECOVERED';
  }
  return 'UNKNOWN';
};

// Get text color for result
const getResultStyles = resultType => {
  switch (resultType) {
    case 'WIN':
      return 'text-green-600';
    case 'LOSS':
      return 'text-red-600';
    case 'PENDING':
      return 'text-blue-600';
    case 'STOPPED':
      return 'text-yellow-600';
    case 'RECOVERED':
      return 'text-purple-600';
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
    case 'PENDING':
      return 'bg-blue-50 border-blue-100';
    case 'STOPPED':
      return 'bg-yellow-50 border-yellow-100';
    case 'RECOVERED':
      return 'bg-purple-50 border-purple-100';
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
  try {
    const value = parseFloat(amount);
    if (isNaN(value)) return '0';

    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }

    if (value < 0.01) {
      return '<0.01';
    }

    return value.toFixed(2);
  } catch (error) {
    console.error('Error formatting amount:', error);
    return '0';
  }
};

const GameHistoryItem = ({ game, index, compact = false }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    if (!compact) {
      setExpanded(!expanded);
    }
  };

  const resultType = getResultType(game);
  const resultStyles = getResultStyles(resultType);
  const cardBackground = getCardBackground(resultType);

  const rolledNumber = Number(game.rolledNumber);
  const chosenNumber = Number(game.chosenNumber);

  // Safe amount formatting
  const betAmount = formatEther(
    BigInt(game.amount?.toString() || '0').toString()
  );
  const formattedBetAmount = formatAmount(betAmount);
  const payout = formatEther(BigInt(game.payout?.toString() || '0').toString());
  const formattedPayout = resultType === 'WIN' ? formatAmount(payout) : '0';
  const formattedDate = getFormattedDate(game.timestamp);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
        className={`rounded-lg border shadow-sm overflow-hidden ${cardBackground} hover:shadow-md transition-all h-full`}
      >
        <div className="p-3 h-full flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5">
              <FontAwesomeIcon
                icon={faDice}
                className="text-secondary-400 w-3 h-3"
              />
              <span className="text-xs font-medium text-secondary-500">
                {chosenNumber >= 1 && chosenNumber <= 6
                  ? `Chosen: ${chosenNumber}`
                  : ''}
              </span>
            </div>
            <div
              className={`text-xs font-bold ${resultStyles} px-2 py-0.5 rounded-full bg-opacity-10`}
            >
              {resultType}
            </div>
          </div>

          <div className="flex items-center justify-between flex-grow mb-2">
            <div className="text-3xl font-bold text-secondary-800 flex items-center gap-2">
              {rolledNumber >= 1 && rolledNumber <= 6 ? rolledNumber : '?'}
              {resultType === 'WIN' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full"
                >
                  WIN!
                </motion.div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-auto">
            <div className="flex items-center gap-1 text-xs">
              <FontAwesomeIcon
                icon={faCoins}
                className="text-secondary-400 w-3 h-3"
              />
              <span className="text-secondary-600">{formattedBetAmount}</span>
            </div>
            <div className="flex items-center gap-1 text-xs justify-end">
              {resultType === 'WIN' ? (
                <span className="text-green-600 font-medium">
                  +{formattedPayout}
                </span>
              ) : (
                <span className="text-secondary-400">{formattedDate}</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className={`rounded-lg border shadow-sm overflow-hidden ${cardBackground} hover:shadow-md transition-all`}
    >
      <div className="p-4 cursor-pointer select-none" onClick={toggleExpand}>
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`text-4xl font-bold ${
                  resultType === 'WIN' ? 'text-green-600' : 'text-secondary-800'
                }`}
              >
                {rolledNumber >= 1 && rolledNumber <= 6 ? rolledNumber : '?'}
              </div>
              <div className="text-xs text-secondary-500 mt-1">Rolled</div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="font-medium text-secondary-800">
                Chosen:{' '}
                {chosenNumber >= 1 && chosenNumber <= 6 ? chosenNumber : '?'}
              </div>
              <div className="flex items-center gap-2 text-xs text-secondary-500">
                <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                {formattedDate}
              </div>
            </div>
          </div>

          <div className="text-right flex flex-col items-end gap-1">
            <div
              className={`
              font-bold px-2 py-0.5 rounded-full text-sm
              ${
                resultType === 'WIN'
                  ? 'bg-green-100 text-green-700'
                  : resultType === 'LOSS'
                    ? 'bg-red-100 text-red-700'
                    : resultType === 'PENDING'
                      ? 'bg-blue-100 text-blue-700'
                      : resultType === 'STOPPED'
                        ? 'bg-yellow-100 text-yellow-700'
                        : resultType === 'RECOVERED'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
              }
            `}
            >
              {resultType}
            </div>
            <div className="text-secondary-800 font-medium flex items-center gap-1">
              <FontAwesomeIcon
                icon={faCoins}
                className="w-3 h-3 text-secondary-400"
              />
              {formattedBetAmount} GAMA
            </div>
            {resultType === 'WIN' && (
              <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                +{formattedPayout} GAMA
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 pt-4 border-t border-gray-200"
            >
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-secondary-500 mb-1">Game Details</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={resultStyles}>{resultType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bet Amount:</span>
                      <span>{formattedBetAmount} GAMA</span>
                    </div>
                    {resultType === 'WIN' && (
                      <div className="flex justify-between">
                        <span>Payout:</span>
                        <span className="text-green-600">
                          +{formattedPayout} GAMA
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Time:</span>
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-secondary-500 mb-1">Result Details</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Chosen Number:</span>
                      <span>{chosenNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rolled Number:</span>
                      <span>
                        {rolledNumber >= 1 && rolledNumber <= 6
                          ? rolledNumber
                          : '?'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Result Type:</span>
                      <span>{game.resultType}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center mt-2">
          <button
            onClick={toggleExpand}
            className="text-secondary-400 hover:text-secondary-600 transition-colors"
          >
            <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default GameHistoryItem;
