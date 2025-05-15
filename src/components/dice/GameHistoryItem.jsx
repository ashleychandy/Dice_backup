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
  faRandom,
  faCheckCircle,
  faTimesCircle,
  faSync,
  faHourglassHalf,
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
      return 'text-purple-600'; // Changed from blue to purple for VRF
    case 'STOPPED':
      return 'text-amber-600'; // Changed from yellow to amber for better contrast
    case 'RECOVERED':
      return 'text-indigo-600'; // Changed from purple to indigo
    default:
      return 'text-gray-600';
  }
};

// Get background colors and gradients for the card
const getCardStyles = resultType => {
  switch (resultType) {
    case 'WIN':
      return {
        background:
          'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
        icon: 'text-green-500',
        badge: 'bg-green-100 text-green-700',
        shadow: 'shadow-green-200/50',
      };
    case 'LOSS':
      return {
        background: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
        icon: 'text-red-500',
        badge: 'bg-red-100 text-red-700',
        shadow: 'shadow-red-200/50',
      };
    case 'PENDING':
      return {
        background:
          'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200',
        icon: 'text-purple-500',
        badge: 'bg-purple-100 text-purple-700',
        shadow: 'shadow-purple-200/50',
      };
    case 'STOPPED':
      return {
        background:
          'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200',
        icon: 'text-amber-500',
        badge: 'bg-amber-100 text-amber-700',
        shadow: 'shadow-amber-200/50',
      };
    case 'RECOVERED':
      return {
        background:
          'bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200',
        icon: 'text-indigo-500',
        badge: 'bg-indigo-100 text-indigo-700',
        shadow: 'shadow-indigo-200/50',
      };
    default:
      return {
        background: 'bg-gradient-to-br from-white to-gray-100 border-gray-200',
        icon: 'text-gray-500',
        badge: 'bg-gray-100 text-gray-700',
        shadow: 'shadow-gray-200/50',
      };
  }
};

// Get icon for the result type
const getResultIcon = resultType => {
  switch (resultType) {
    case 'WIN':
      return faCheckCircle;
    case 'LOSS':
      return faTimesCircle;
    case 'PENDING':
      return faRandom;
    case 'STOPPED':
      return faHourglassHalf;
    case 'RECOVERED':
      return faSync;
    default:
      return faDice;
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
  const cardStyles = getCardStyles(resultType);
  const resultIcon = getResultIcon(resultType);

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
        whileHover={{
          scale: 1.03,
          boxShadow:
            '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
        className={`rounded-xl border ${cardStyles.background} ${cardStyles.shadow} overflow-hidden hover:shadow-lg transition-all h-full`}
      >
        <div className="p-4 h-full flex flex-col relative">
          {/* Decorative circles for visual appeal */}
          <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-white/20 blur-sm"></div>
          <div className="absolute -bottom-8 -left-8 w-20 h-20 rounded-full bg-white/30 blur-sm"></div>

          {/* Header with status and chosen number */}
          <div className="flex justify-between items-center mb-3 relative z-10">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full ${cardStyles.badge} flex items-center justify-center`}
              >
                <FontAwesomeIcon
                  icon={faDice}
                  className={`${cardStyles.icon} w-3 h-3`}
                />
              </div>
              <span className="text-xs font-medium text-secondary-700">
                {chosenNumber >= 1 && chosenNumber <= 6
                  ? `Chosen: ${chosenNumber}`
                  : ''}
              </span>
            </div>
            <div
              className={`text-xs font-bold ${resultStyles} px-2.5 py-1 rounded-full ${cardStyles.badge} flex items-center gap-1.5`}
            >
              {resultType === 'PENDING' && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-3 h-3"
                >
                  <FontAwesomeIcon icon={resultIcon} className="w-3 h-3" />
                </motion.div>
              )}
              {resultType !== 'PENDING' && (
                <FontAwesomeIcon icon={resultIcon} className="w-3 h-3" />
              )}
              <span>{resultType}</span>
            </div>
          </div>

          {/* Rolled Number Display */}
          <div className="flex items-center justify-between flex-grow mb-3 relative z-10">
            {resultType === 'PENDING' ? (
              <div className="flex flex-col">
                <div className="text-purple-700 text-sm font-medium">
                  Verifying roll...
                </div>
                <div className="mt-1 flex space-x-1">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      repeatType: 'loop',
                      times: [0, 0.5, 1],
                    }}
                    className="w-2 h-2 rounded-full bg-purple-500"
                  />
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      repeatType: 'loop',
                      delay: 0.2,
                      times: [0, 0.5, 1],
                    }}
                    className="w-2 h-2 rounded-full bg-purple-500"
                  />
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      repeatType: 'loop',
                      delay: 0.4,
                      times: [0, 0.5, 1],
                    }}
                    className="w-2 h-2 rounded-full bg-purple-500"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm
                    ${
                      resultType === 'WIN'
                        ? 'bg-green-200 text-green-800'
                        : resultType === 'LOSS'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-secondary-200 text-secondary-800'
                    }`}
                >
                  <span className="text-2xl font-bold">
                    {rolledNumber >= 1 && rolledNumber <= 6
                      ? rolledNumber
                      : '?'}
                  </span>
                </motion.div>
                {resultType === 'WIN' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="flex flex-col items-start"
                  >
                    <div className="text-xs text-green-600 font-medium">
                      Match!
                    </div>
                    <div className="text-green-700 text-sm font-bold">
                      Winner
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {resultType === 'WIN' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, 10, 0, -10, 0] }}
                transition={{
                  scale: { delay: 0.1, duration: 0.4 },
                  rotate: { delay: 0.4, duration: 0.6 },
                }}
                className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-sm flex items-center gap-1"
              >
                <span>+{formattedPayout}</span>
              </motion.div>
            )}
          </div>

          {/* Bottom bar with amount and date */}
          <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-white/40 relative z-10">
            <div className="flex items-center gap-1.5 text-xs">
              <div
                className={`w-5 h-5 rounded-full ${cardStyles.badge} flex items-center justify-center`}
              >
                <FontAwesomeIcon
                  icon={faCoins}
                  className={`${cardStyles.icon} w-2.5 h-2.5`}
                />
              </div>
              <span className="text-secondary-700 font-medium">
                {formattedBetAmount}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs justify-end">
              <div
                className={`w-5 h-5 rounded-full ${cardStyles.badge} flex items-center justify-center`}
              >
                <FontAwesomeIcon
                  icon={faClock}
                  className={`${cardStyles.icon} w-2.5 h-2.5`}
                />
              </div>
              <span className="text-secondary-700">{formattedDate}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Extended display (non-compact)
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className={`rounded-xl border ${cardStyles.background} ${cardStyles.shadow} overflow-hidden hover:shadow-lg transition-all`}
    >
      <div
        className="p-5 cursor-pointer select-none relative"
        onClick={toggleExpand}
      >
        {/* Decorative elements */}
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/20 blur-sm"></div>
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/30 blur-sm"></div>

        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-start gap-4">
            {resultType === 'PENDING' ? (
              <div className="flex flex-col items-center justify-center">
                <motion.div
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className={`w-14 h-14 rounded-full ${cardStyles.badge} flex items-center justify-center`}
                >
                  <FontAwesomeIcon
                    icon={resultIcon}
                    className={`${cardStyles.icon} text-2xl`}
                  />
                </motion.div>
                <div className="text-xs text-purple-700 font-medium mt-1">
                  Verifying
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className={`text-5xl font-bold w-16 h-16 flex items-center justify-center rounded-xl shadow-sm
                    ${
                      resultType === 'WIN'
                        ? 'bg-green-200 text-green-800'
                        : resultType === 'LOSS'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-secondary-200 text-secondary-800'
                    }`}
                >
                  {rolledNumber >= 1 && rolledNumber <= 6 ? rolledNumber : '?'}
                </motion.div>
                <div className="text-xs text-secondary-600 font-medium mt-1">
                  Rolled
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <div className="font-medium text-secondary-800 text-lg">
                Chosen:{' '}
                <span
                  className={`${resultType === 'WIN' ? 'text-green-700 font-bold' : ''}`}
                >
                  {chosenNumber >= 1 && chosenNumber <= 6 ? chosenNumber : '?'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-secondary-600">
                <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                {formattedDate}
              </div>
              <div className="flex items-center gap-2 text-xs text-secondary-600 mt-1">
                <FontAwesomeIcon icon={faCoins} className="w-3 h-3" />
                <span className="font-medium">{formattedBetAmount} GAMA</span>
              </div>
            </div>
          </div>

          <div className="text-right flex flex-col items-end gap-2">
            <div
              className={`
              font-bold px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5
              ${cardStyles.badge}
            `}
            >
              <FontAwesomeIcon icon={resultIcon} className="w-3 h-3" />
              {resultType}
            </div>

            {resultType === 'WIN' && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-bold text-green-600 bg-green-100 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 mt-2"
              >
                <span>+{formattedPayout} GAMA</span>
              </motion.div>
            )}

            <div className="mt-auto pt-2">
              <FontAwesomeIcon
                icon={expanded ? faChevronUp : faChevronDown}
                className="text-secondary-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 border-t border-white/40 pt-4 relative z-10"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                  <div className="text-xs font-medium text-secondary-500 mb-1">
                    Transaction Details
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-secondary-600">
                        Bet Amount:
                      </span>
                      <span className="text-xs font-medium text-secondary-800">
                        {formattedBetAmount} GAMA
                      </span>
                    </div>
                    {resultType === 'WIN' && (
                      <div className="flex justify-between">
                        <span className="text-xs text-secondary-600">
                          Payout:
                        </span>
                        <span className="text-xs font-medium text-green-600">
                          +{formattedPayout} GAMA
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-xs text-secondary-600">
                        Result:
                      </span>
                      <span className={`text-xs font-medium ${resultStyles}`}>
                        {resultType}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                  <div className="text-xs font-medium text-secondary-500 mb-1">
                    Dice Details
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-secondary-600">
                        Chosen Number:
                      </span>
                      <span className="text-xs font-medium text-secondary-800">
                        {chosenNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-secondary-600">
                        Rolled Number:
                      </span>
                      <span className="text-xs font-medium text-secondary-800">
                        {rolledNumber >= 1 && rolledNumber <= 6
                          ? rolledNumber
                          : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-secondary-600">
                        Timestamp:
                      </span>
                      <span className="text-xs font-medium text-secondary-800">
                        {game.timestamp
                          ? new Date(game.timestamp * 1000).toLocaleString()
                          : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default GameHistoryItem;
