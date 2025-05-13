import React, { useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { usePollingService } from '../../services/pollingService.jsx';
import { useWallet } from '../wallet/WalletProvider.jsx';

const LatestBet = ({ result, chosenNumber, betAmount }) => {
  // Use the polling service to get bet history data and game status
  const { betHistory: allBets, isLoading, gameStatus } = usePollingService();
  const { account, isWalletConnected } = useWallet();

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
      gameStatus,
    });
  }, [result, chosenNumber, betAmount, latestHistoryBet, gameStatus]);

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
    // First check contract state - this is the source of truth
    if (
      gameStatus?.isActive &&
      gameStatus?.requestExists &&
      !gameStatus?.requestProcessed
    ) {
      return true;
    }

    // If no result at all, we're not waiting
    if (!result) return false;

    // Check if we have an explicit VRF pending flag
    if (result.vrfPending) return true;

    // Check if the result is pending and we're expecting verification
    if (
      (result.isPending || result.pendingVerification) &&
      !result.rolledNumber
    )
      return true;

    // If the result indicates a request is in progress but not fulfilled
    if (result.requestId && !result.requestFulfilled) return true;

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
  }, [result, latestHistoryBet, chosenNumber, gameStatus]);

  // Add debug logging for VRF status
  useEffect(() => {
    console.log('VRF status check:', {
      resultExists: !!result,
      gameStatus,
      vrfPending: result?.vrfPending,
      isPending: result?.isPending,
      rolledNumber: result?.rolledNumber,
      isCompleted: result?.isCompleted,
      isWaitingForVrf,
    });
  }, [result, isWaitingForVrf, gameStatus]);

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
    // If waiting for VRF based on contract state
    if (isWaitingForVrf) {
      return {
        source: 'pending',
        data: result || {
          chosenNumber: gameStatus?.chosenNumber,
          amount: gameStatus?.amount,
          timestamp: gameStatus?.lastPlayTimestamp,
        },
      };
    }

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

    // Default to history if available
    if (latestHistoryBet) {
      return {
        source: 'history',
        data: latestHistoryBet,
      };
    }

    // No valid result to display
    return null;
  }, [
    result,
    latestHistoryBet,
    isWaitingForVrf,
    chosenNumber,
    betAmount,
    gameStatus,
  ]);

  // Log the display result for debugging
  useEffect(() => {
    console.log('Display result decision:', displayResult);
  }, [displayResult]);

  // Show welcome message for new users when no wallet is connected
  if (!isWalletConnected || !account) {
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
          <img
            src="/assets/dice-welcome.svg"
            alt="Dice"
            className="w-12 h-12 mb-3"
            onError={e => {
              e.target.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='10' fill='%23f0f0f0'/%3E%3Ccircle cx='25' cy='25' r='8' fill='%2322AD74'/%3E%3Ccircle cx='75' cy='25' r='8' fill='%2322AD74'/%3E%3Ccircle cx='25' cy='75' r='8' fill='%2322AD74'/%3E%3Ccircle cx='75' cy='75' r='8' fill='%2322AD74'/%3E%3Ccircle cx='50' cy='50' r='8' fill='%2322AD74'/%3E%3C/svg%3E";
            }}
          />
          <span className="text-secondary-700 text-center">
            Connect your wallet to start playing
          </span>
          <span className="text-secondary-500 text-sm mt-2">
            Your recent rolls will appear here
          </span>
        </div>
      </motion.div>
    );
  }

  // If no data is available but wallet is connected, show a loading state
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

  // Show empty state for connected users with no history
  if (!displayResult && !isLoading && isWalletConnected && account) {
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
          <img
            src="/assets/dice-empty.svg"
            alt="No bets"
            className="w-12 h-12 mb-3"
            onError={e => {
              e.target.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='10' fill='%23f0f0f0'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='16' text-anchor='middle' fill='%23666'%3ENo Data%3C/text%3E%3C/svg%3E";
            }}
          />
          <span className="text-secondary-600">No bet history available</span>
          <span className="text-secondary-500 text-sm mt-2">
            Place your first bet to start playing!
          </span>
        </div>
      </motion.div>
    );
  }

  // Show pending VRF result
  if (displayResult?.source === 'pending') {
    const pendingBetAmount = betAmount || gameStatus?.amount || '0';
    // Use game status timestamp if available, or current time
    const pendingStartTime =
      result?.timestamp ||
      gameStatus?.lastPlayTimestamp ||
      Math.floor(Date.now() / 1000);
    const currentTime = Math.floor(Date.now() / 1000);
    const elapsedSeconds = currentTime - pendingStartTime;
    const showExtendedInfo = elapsedSeconds > 10;

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
            <span
              className={`${
                showExtendedInfo ? 'text-purple-700' : 'text-purple-600'
              } font-medium`}
            >
              {showExtendedInfo
                ? 'Verification in progress...'
                : 'Verifying your roll...'}
            </span>
          </div>
          <span className="text-secondary-600 text-sm text-center">
            Your bet of {formatAmount(pendingBetAmount)} GAMA is being processed
          </span>
          <span className="text-secondary-600 text-sm mt-1">
            Chosen number:{' '}
            {displayResult.data.chosenNumber ||
              chosenNumber ||
              gameStatus?.chosenNumber ||
              '-'}
          </span>
          {showExtendedInfo && (
            <span className="text-purple-700/80 text-xs mt-2 text-center bg-purple-100/50 px-2 py-1 rounded-full">
              Taking longer than usual. You can check game history or recovery
              options.
            </span>
          )}
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
