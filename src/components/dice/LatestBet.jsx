import React, { useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { usePollingService } from '../../services/pollingService.jsx';

const LatestBet = ({ result, chosenNumber, betAmount }) => {
  // Use the polling service to get bet history data
  const { betHistory: allBets, isLoading } = usePollingService();

  // Get the latest completed bet from history
  const latestHistoryBet = useMemo(() => {
    if (!allBets || allBets.length === 0) return null;
    return allBets[0]; // First item is the most recent bet
  }, [allBets]);

  // Add debugging logs to help diagnose issues
  useEffect(() => {
    console.log('LatestBet component received:', {
      result,
      chosenNumber,
      betAmount: betAmount ? betAmount.toString() : null,
      latestHistoryBet,
    });
  }, [result, chosenNumber, betAmount, latestHistoryBet]);

  // Add detailed debugging for props
  useEffect(() => {
    console.log('LatestBet component props:', {
      resultObj: result ? { ...result } : null,
      resultKeys: result ? Object.keys(result) : [],
      chosenNumber,
      betAmount: betAmount ? betAmount.toString() : null,
      latestHistoryBet: latestHistoryBet ? { ...latestHistoryBet } : null,
      latestHistoryKeys: latestHistoryBet ? Object.keys(latestHistoryBet) : [],
    });
  }, [result, chosenNumber, betAmount, latestHistoryBet]);

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
  const isWaitingForVrf = useMemo(() => {
    // If no result at all, we're not waiting
    if (!result) return false;

    // Check if we have an explicit VRF pending flag
    if (result.vrfPending) return true;

    // Check if the result is pending
    if (result.isPending && !result.rolledNumber) return true;

    // Check if we have a completed result
    if (result.rolledNumber && typeof result.rolledNumber !== 'undefined') {
      // If we have a valid rolled number, we're not waiting
      return false;
    }

    // Check if we have a result in history that matches this bet
    if (
      latestHistoryBet &&
      latestHistoryBet.chosenNumber === chosenNumber &&
      latestHistoryBet.rolledNumber
    ) {
      // We have a result for this bet in history, so we're not waiting
      return false;
    }

    // Default to not waiting if we can't determine
    return false;
  }, [result, latestHistoryBet, chosenNumber]);

  // Add debug logging for VRF status
  useEffect(() => {
    if (result) {
      console.log('VRF status check:', {
        resultExists: !!result,
        vrfPending: result.vrfPending,
        isPending: result.isPending,
        rolledNumber: result.rolledNumber,
        isCompleted: result.isCompleted,
        isWaitingForVrf,
      });
    }
  }, [result, isWaitingForVrf]);

  // Helper function to check if result matches the current bet values
  const isCurrentBetResult = (result, chosenNum, amount) => {
    if (!result || !chosenNum || !amount) return false;

    // Check if chosen number matches
    const resultChosenNum =
      result.chosenNumber || (result.chosen ? Number(result.chosen) : null);
    const chosenMatch = resultChosenNum === Number(chosenNum);

    // For amount, do a rough comparison to avoid precision issues
    let amountMatch = false;
    try {
      const resultAmount = result.amount ? result.amount.toString() : '0';
      const betAmount = amount.toString();
      // Compare only the first few digits to avoid precision issues
      amountMatch = resultAmount.substring(0, 5) === betAmount.substring(0, 5);
    } catch (e) {
      console.error('Error comparing amounts:', e);
    }

    return chosenMatch && amountMatch;
  };

  // Determine the best result to display
  const displayResult = useMemo(() => {
    // If we have a valid result with rolledNumber, use it
    if (
      result &&
      typeof result.rolledNumber !== 'undefined' &&
      result.rolledNumber !== null
    ) {
      return {
        source: 'current',
        data: result,
      };
    }

    // If we have a history bet that matches current bet parameters, use it
    if (
      latestHistoryBet &&
      isCurrentBetResult(latestHistoryBet, chosenNumber, betAmount)
    ) {
      return {
        source: 'history',
        data: latestHistoryBet,
      };
    }

    // If we're not waiting for VRF and have history, show history
    if (!isWaitingForVrf && latestHistoryBet) {
      return {
        source: 'history',
        data: latestHistoryBet,
      };
    }

    // If we're waiting for VRF, return the pending result
    if (isWaitingForVrf) {
      return {
        source: 'pending',
        data: result,
      };
    }

    // Default to history if available
    if (latestHistoryBet) {
      return {
        source: 'history',
        data: latestHistoryBet,
      };
    }

    // No valid result to display
    return null;
  }, [result, latestHistoryBet, isWaitingForVrf, chosenNumber, betAmount]);

  // Log the display result for debugging
  useEffect(() => {
    console.log('Display result decision:', displayResult);
  }, [displayResult]);

  // If no data is available, show a loading state
  if (isLoading && !displayResult) {
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
          <motion.div
            className="w-3 h-3 rounded-full bg-secondary-400 mr-2"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
          <span className="text-secondary-600">Loading bet history...</span>
        </div>
      </motion.div>
    );
  }

  // Show pending VRF result
  if (displayResult?.source === 'pending') {
    const pendingBetAmount = betAmount || '0';

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
            Your bet of {formatAmount(pendingBetAmount)} GAMA is being processed
          </span>
          <span className="text-secondary-600 text-sm mt-1">
            Chosen number: {chosenNumber || '-'}
          </span>
        </div>

        {/* If we also have history, show it below */}
        {latestHistoryBet && (
          <div className="mt-3 pt-3 border-t border-secondary-100">
            <div className="text-xs text-secondary-500 mb-1">
              Last Completed Bet:
            </div>
            <div className="flex justify-between items-center text-sm text-secondary-600">
              <span>Rolled: {latestHistoryBet.rolledNumber}</span>
              <span>
                {latestHistoryBet.isWin ? (
                  <span className="text-gaming-success text-xs">Won</span>
                ) : (
                  <span className="text-gaming-error text-xs">Lost</span>
                )}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // Show completed bet result
  if (
    displayResult?.source === 'current' ||
    displayResult?.source === 'history'
  ) {
    const data = displayResult.data;
    const rolledNum = parseInt(data.rolledNumber?.toString() || '0', 10);
    const chosenNum = parseInt(
      data.chosenNumber?.toString() || chosenNumber?.toString() || '0',
      10
    );
    const isWin = data.isWin || rolledNum === chosenNum;
    const amount = data.amount || betAmount || '0';
    const payout = data.payout || '0';

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
              {formatAmount(amount)} GAMA
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
            {isWin ? <>+{formatAmount(payout)} GAMA</> : 'No Win'}
          </div>
        </div>
      </motion.div>
    );
  }

  // Fallback if nothing else matches
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
        <span className="text-secondary-600">No bet history available</span>
      </div>
    </motion.div>
  );
};

export default LatestBet;
