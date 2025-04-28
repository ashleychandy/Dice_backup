import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { formatEther } from 'ethers';
import { RESULT_FORCE_STOPPED, RESULT_RECOVERED } from '../../constants/game';

// Helper to generate color classes based on game result
const getAccentColor = game => {
  const rolledNumber = Number(game.rolledNumber);
  const chosenNumber = Number(game.chosenNumber);

  // Win
  if (rolledNumber === chosenNumber && rolledNumber >= 1 && rolledNumber <= 6) {
    return 'border-green-500 text-green-500';
  }
  // Loss
  else if (
    rolledNumber !== chosenNumber &&
    rolledNumber >= 1 &&
    rolledNumber <= 6
  ) {
    return 'border-gray-400 text-gray-400';
  }
  // Special cases
  else if (rolledNumber === RESULT_FORCE_STOPPED) {
    return 'border-yellow-500 text-yellow-500';
  } else if (rolledNumber === RESULT_RECOVERED) {
    return 'border-blue-500 text-blue-500';
  } else {
    return 'border-gray-400 text-gray-400';
  }
};

// Get formatted date
const getFormattedDate = timestamp => {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp * 1000);
  return formatDistanceToNow(date, { addSuffix: true });
};

// Get result text
const getResultText = game => {
  const rolledNumber = Number(game.rolledNumber);
  const chosenNumber = Number(game.chosenNumber);

  if (rolledNumber === chosenNumber && rolledNumber >= 1 && rolledNumber <= 6) {
    return 'Win';
  } else if (
    rolledNumber !== chosenNumber &&
    rolledNumber >= 1 &&
    rolledNumber <= 6
  ) {
    return 'Loss';
  } else if (rolledNumber === RESULT_FORCE_STOPPED) {
    return 'Stopped';
  } else if (rolledNumber === RESULT_RECOVERED) {
    return 'Recovered';
  } else {
    return 'Unknown';
  }
};

const GameHistoryItem = ({ game, index }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  // Animate in with a staggered delay based on index
  const animationDelay = index * 0.05;

  const resultText = getResultText(game);
  const accentColor = getAccentColor(game);
  const rolledNumber = Number(game.rolledNumber);
  const chosenNumber = Number(game.chosenNumber);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay, duration: 0.2 }}
      className={`bg-white border rounded-md shadow-sm overflow-hidden transition-colors duration-150 ${accentColor}`}
    >
      {/* Main content row */}
      <div className="p-2 cursor-pointer" onClick={toggleExpand}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {/* Dice Number */}
            <div className="flex flex-col items-center justify-center">
              <div
                className={`flex items-center justify-center w-7 h-7 text-sm font-bold rounded-full border-2 ${accentColor} bg-white`}
              >
                {rolledNumber >= 1 && rolledNumber <= 6 ? rolledNumber : '?'}
              </div>
              <div className="text-2xs text-gray-500 mt-0.5">Rolled</div>
            </div>

            {/* Text details */}
            <div>
              <div className="text-xs font-medium text-gray-800">
                {chosenNumber >= 1 && chosenNumber <= 6
                  ? `Bet on ${chosenNumber}`
                  : 'Bet'}
                <span className="text-2xs text-gray-500 ml-1.5">
                  {getFormattedDate(game.timestamp)}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                {formatEther(game.betAmount || '0').substring(0, 8)} XDC
              </div>
            </div>
          </div>

          {/* Result indicator */}
          <div className="flex items-center space-x-2">
            <div className={`text-xs font-medium ${accentColor}`}>
              {resultText}
            </div>
            <FontAwesomeIcon
              icon={expanded ? faChevronUp : faChevronDown}
              className="text-gray-400 text-xs"
            />
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
            className="bg-gray-50 border-t border-gray-100"
          >
            <div className="p-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div>
                  <span className="text-gray-500">Game ID:</span>{' '}
                  <span className="text-gray-700">{game.gameId || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Payout:</span>{' '}
                  <span className="text-gray-700">
                    {game.payout
                      ? `${formatEther(game.payout).substring(0, 8)} XDC`
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Player:</span>{' '}
                  <span className="text-gray-700 text-2xs break-all">
                    {game.player
                      ? `${game.player.substring(0, 6)}...${game.player.substring(38)}`
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Block:</span>{' '}
                  <span className="text-gray-700">
                    {game.blockNumber || '-'}
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
