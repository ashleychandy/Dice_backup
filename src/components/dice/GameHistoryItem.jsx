import React from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

const GameHistoryItem = ({ game, index }) => {
  // Add validation for game numbers
  const validateGameNumber = num => {
    const parsed = Number(num);
    return !isNaN(parsed) && parsed >= 1 && parsed <= 6 ? parsed : '?';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      className={`
        relative p-4 rounded-xl border backdrop-blur-sm
        ${
          game.isWin
            ? 'border-gaming-success/20 bg-gaming-success/5'
            : 'border-gaming-error/20 bg-gaming-error/5'
        }
        hover:transform hover:scale-[1.02] transition-all duration-300
      `}
    >
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <div className="text-lg font-semibold">
            {ethers.formatEther(game.amount)} GAMA
          </div>
          <div className="text-sm text-secondary-400">
            <span
              className={
                game.isWin ? 'text-gaming-success' : 'text-gaming-error'
              }
            >
              {game.isWin ? 'Won' : 'Lost'}
            </span>
            <span className="mx-2">•</span>
            Rolled: {validateGameNumber(game.rolledNumber)} | Chosen:{' '}
            {validateGameNumber(game.chosenNumber)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-secondary-400">
            {new Date(game.timestamp * 1000).toLocaleString()}
          </div>
          <div className="text-xs text-secondary-500 mt-1">
            {game.isWin
              ? `Won ${ethers.formatEther(game.payout)} GAMA`
              : 'No Payout'}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GameHistoryItem;
