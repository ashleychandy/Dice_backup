import React, { useEffect } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';

const LatestBet = ({ result, chosenNumber, betAmount }) => {
  // Add debugging logs to help diagnose issues
  useEffect(() => {
    console.log('LatestBet component received:', {
      result,
      chosenNumber,
      betAmount: betAmount ? betAmount.toString() : null,
    });
  }, [result, chosenNumber, betAmount]);

  const formatAmount = amount => {
    if (!amount || amount === '0') return '0';
    try {
      return ethers.formatEther(amount.toString()).slice(0, 6);
    } catch (e) {
      console.error('Error formatting amount:', e);
      return '0';
    }
  };

  // If there's no result, show a placeholder state
  if (!result || typeof result.rolledNumber === 'undefined') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white rounded-xl border-2 border-secondary-200 p-4 shadow-lg"
      >
        <div className="text-center mb-2">
          <span className="font-bold text-secondary-800">Latest Roll</span>
        </div>
        <div className="flex justify-center items-center py-4">
          <span className="text-secondary-600">
            Place a bet to see your last roll result
          </span>
        </div>
      </motion.div>
    );
  }

  // Convert numbers to ensure proper comparison
  const rolledNum = parseInt(result.rolledNumber.toString(), 10);
  const chosenNum = parseInt(chosenNumber?.toString() || '0', 10);
  const isWin = rolledNum === chosenNum;

  // Format bet amount - ensure we're using the actual bet amount that was used, not the current input
  const formattedBetAmount = formatAmount(betAmount);
  const formattedPayout = isWin ? formatAmount(result.payout) : '0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-white rounded-xl border-2 border-secondary-200 p-4 shadow-lg"
    >
      <div className="text-center mb-2">
        <span className="font-bold text-secondary-800">Latest Roll</span>
      </div>
      <div className="flex justify-between items-center text-sm text-secondary-600 mb-2">
        <span className="font-medium">Rolled: {rolledNum}</span>
        <span className="text-base">
          {isWin ? (
            <span className="text-gaming-success">🎉 Won!</span>
          ) : (
            <span className="text-gaming-error">😔 Lost</span>
          )}
        </span>
      </div>
      <div className="flex justify-between items-center mb-2">
        <div>
          <div className="font-bold text-lg text-secondary-800">
            {formattedBetAmount} GAMA
          </div>
          <div className="text-sm text-secondary-600">Chosen: {chosenNum}</div>
        </div>
        <div
          className={`text-lg font-bold ${
            isWin ? 'text-gaming-success' : 'text-gaming-error'
          }`}
        >
          {isWin ? <>+{formattedPayout} GAMA</> : 'No Win'}
        </div>
      </div>
    </motion.div>
  );
};

export default LatestBet;
