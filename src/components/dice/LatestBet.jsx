import React, { useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { useBetHistory } from '../../hooks/useBetHistory';
import { useDiceContract } from '../../hooks/useDiceContract';

const LatestBet = ({ result, chosenNumber, betAmount }) => {
  // Get the dice contract
  const { contract: diceContract } = useDiceContract();

  // Use the bet history hook to fetch game history (including the most recent bet)
  const { betHistory, isLoading } = useBetHistory({
    pageSize: 1, // We only need the most recent bet
    autoRefresh: true, // Auto refresh to get the latest data
    diceContract,
  });

  // Get the latest completed bet from history
  const latestHistoryBet = useMemo(() => {
    if (!betHistory || betHistory.length === 0) return null;
    return betHistory[0]; // First item is the most recent bet
  }, [betHistory]);

  const formatAmount = amount => {
    if (!amount || amount === '0') return '0';
    try {
      return ethers.formatEther(amount.toString()).slice(0, 6);
    } catch (e) {
      console.error('Error formatting amount:', e);
      return '0';
    }
  };

  // Check if we're waiting for VRF
  const isWaitingForVrf =
    result && (result.vrfPending || (result.isPending && !result.rolledNumber));

  // If we have an ongoing bet and a history bet, show both
  if (isWaitingForVrf && latestHistoryBet) {
    const historyRolledNum = latestHistoryBet.rolledNumber;
    const historyChosenNum = latestHistoryBet.chosenNumber;
    const isHistoryWin = latestHistoryBet.isWin;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white rounded-xl border-2 border-secondary-200 p-4 shadow-lg"
      >
        <div className="text-center mb-2 flex justify-between items-center">
          <span className="font-bold text-secondary-800">Latest Roll</span>
          <div className="flex items-center">
            <motion.div
              className="w-2 h-2 rounded-full bg-purple-600 mr-1"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <span className="text-xs text-purple-600">New bet in progress</span>
          </div>
        </div>

        {/* Show the last completed bet from history */}
        <div className="flex justify-between items-center text-sm text-secondary-600 mb-2">
          <span className="font-medium">Rolled: {historyRolledNum}</span>
          <span className="text-base">
            {isHistoryWin ? (
              <span className="text-gaming-success">🎉 Won!</span>
            ) : (
              <span className="text-gaming-error">😔 Lost</span>
            )}
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="font-bold text-lg text-secondary-800">
              {formatAmount(latestHistoryBet.amount)} GAMA
            </div>
            <div className="text-sm text-secondary-600">
              Chosen: {historyChosenNum}
            </div>
          </div>
          <div
            className={`text-lg font-bold ${
              isHistoryWin ? 'text-gaming-success' : 'text-gaming-error'
            }`}
          >
            {isHistoryWin ? (
              <>+{formatAmount(latestHistoryBet.payout)} GAMA</>
            ) : (
              'No Win'
            )}
          </div>
        </div>

        {/* Show current bet status in a subdued section */}
        <div className="mt-3 pt-3 border-t border-secondary-100">
          <div className="flex items-center justify-center mb-1">
            <motion.div
              className="w-2 h-2 rounded-full bg-purple-600 mr-1"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <span className="text-sm text-purple-600 font-medium">
              Waiting for VRF...
            </span>
          </div>
          <div className="flex justify-between text-xs text-secondary-500">
            <span>Bet: {formatAmount(betAmount)} GAMA</span>
            <span>Chosen: {chosenNumber || '-'}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // If we're waiting for VRF and have no history, show the waiting state
  if (isWaitingForVrf) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white rounded-xl border-2 border-secondary-200 p-4 shadow-lg"
      >
        <div className="text-center mb-2">
          <span className="font-bold text-secondary-800">Latest Roll</span>
        </div>
        <div className="flex flex-col justify-center items-center py-4">
          <div className="flex items-center mb-2">
            <motion.div
              className="w-3 h-3 rounded-full bg-purple-600 mr-2"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <span className="text-purple-600 font-medium">
              Waiting for VRF...
            </span>
          </div>
          <span className="text-secondary-600 text-sm text-center">
            Your bet of {formatAmount(betAmount)} GAMA is being processed
          </span>
          <span className="text-secondary-600 text-sm mt-1">
            Chosen number: {chosenNumber || '-'}
          </span>
        </div>
      </motion.div>
    );
  }

  // If we have a valid result, show it
  if (result && typeof result.rolledNumber !== 'undefined' && !isLoading) {
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
            <div className="text-sm text-secondary-600">
              Chosen: {chosenNum}
            </div>
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
  }

  // If no current result but we have history, show the latest bet from history
  if (latestHistoryBet && !isLoading) {
    const historyRolledNum = latestHistoryBet.rolledNumber;
    const historyChosenNum = latestHistoryBet.chosenNumber;
    const isHistoryWin = latestHistoryBet.isWin;

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
          <span className="font-medium">Rolled: {historyRolledNum}</span>
          <span className="text-base">
            {isHistoryWin ? (
              <span className="text-gaming-success">🎉 Won!</span>
            ) : (
              <span className="text-gaming-error">😔 Lost</span>
            )}
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="font-bold text-lg text-secondary-800">
              {formatAmount(latestHistoryBet.amount)} GAMA
            </div>
            <div className="text-sm text-secondary-600">
              Chosen: {historyChosenNum}
            </div>
          </div>
          <div
            className={`text-lg font-bold ${
              isHistoryWin ? 'text-gaming-success' : 'text-gaming-error'
            }`}
          >
            {isHistoryWin ? (
              <>+{formatAmount(latestHistoryBet.payout)} GAMA</>
            ) : (
              'No Win'
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white rounded-xl border-2 border-secondary-200 p-4 shadow-lg"
      >
        <div className="text-center mb-2">
          <span className="font-bold text-secondary-800">Latest Roll</span>
        </div>
        <div className="flex justify-center items-center py-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full"
          />
          <span className="ml-2 text-secondary-600">Loading history...</span>
        </div>
      </motion.div>
    );
  }

  // Fallback/empty state
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
          Place a bet to see your roll result
        </span>
      </div>
    </motion.div>
  );
};

export default LatestBet;
