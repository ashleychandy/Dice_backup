import React, { useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { usePollingService } from '../../services/pollingService.jsx';
import { useWallet } from '../wallet/WalletProvider.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDice,
  faTrophy,
  faRandom,
  faSync,
} from '@fortawesome/free-solid-svg-icons';

const LatestBet = ({ result, chosenNumber, betAmount }) => {
  // Use the polling service to get bet history data and game status
  const {
    betHistory: allBets,
    isLoading,
    gameStatus,
    isNewUser,
  } = usePollingService();
  const { account, isWalletConnected } = useWallet();

  // Get the latest completed bet from history - only if not a new user
  const latestHistoryBet = useMemo(() => {
    // Skip processing for new users
    if (isNewUser || !allBets || allBets.length === 0) return null;
    return allBets[0]; // First item is the most recent bet
  }, [allBets, isNewUser]);

  // Add debugging logs to help diagnose issues
  useEffect(() => {
    console.log('LatestBet component received:', {
      result,
      chosenNumber,
      betAmount: betAmount ? betAmount.toString() : null,
      latestHistoryBet,
      gameStatus,
      isNewUser,
    });
  }, [
    result,
    chosenNumber,
    betAmount,
    latestHistoryBet,
    gameStatus,
    isNewUser,
  ]);

  // Add detailed debugging for props
  useEffect(() => {
    console.log('LatestBet component props:', {
      resultObj: result ? { ...result } : null,
      resultKeys: result ? Object.keys(result) : [],
      chosenNumber,
      betAmount: betAmount ? betAmount.toString() : null,
      latestHistoryBet: latestHistoryBet ? { ...latestHistoryBet } : null,
      latestHistoryKeys: latestHistoryBet ? Object.keys(latestHistoryBet) : [],
      isNewUser,
    });
  }, [result, chosenNumber, betAmount, latestHistoryBet, isNewUser]);

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
    // If new user, they're not waiting for VRF
    if (isNewUser) return false;

    if (!gameStatus) return false;

    // Active game + request exists = waiting for VRF
    const isActive = gameStatus.isActive;
    const requestExists = gameStatus.requestExists;
    const requestFulfilled = gameStatus.requestFulfilled;

    console.log('VRF status check:', {
      isActive,
      requestExists,
      requestFulfilled,
    });

    // Waiting for VRF if the game is active and the request exists but isn't fulfilled
    return isActive && requestExists && !requestFulfilled;
  }, [gameStatus, isNewUser]);

  // Check if the current game or latest bet is recovered or force stopped
  const isSpecialResult = useMemo(() => {
    // Check if the latest history bet has a special result type
    if (latestHistoryBet && latestHistoryBet.resultType) {
      return (
        latestHistoryBet.resultType === 'recovered' ||
        latestHistoryBet.resultType === 'force_stopped'
      );
    }

    // Check if the result has a special rolledNumber value
    if (result && result.rolledNumber !== undefined) {
      const rolledNum = Number(result.rolledNumber);
      return rolledNum === 254 || rolledNum === 255; // RESULT_FORCE_STOPPED or RESULT_RECOVERED
    }

    return false;
  }, [latestHistoryBet, result]);

  // Get the special result type if applicable
  const specialResultType = useMemo(() => {
    if (!isSpecialResult) return null;

    // Check latest history bet
    if (latestHistoryBet && latestHistoryBet.resultType) {
      return latestHistoryBet.resultType;
    }

    // Check result
    if (result && result.rolledNumber !== undefined) {
      const rolledNum = Number(result.rolledNumber);
      if (rolledNum === 254) return 'force_stopped';
      if (rolledNum === 255) return 'recovered';
    }

    return null;
  }, [isSpecialResult, latestHistoryBet, result]);

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
    // For new users, return null to show welcome message
    if (isNewUser) {
      return null;
    }

    // For special results like RECOVERED or FORCE_STOPPED, prioritize them
    if (isSpecialResult) {
      if (latestHistoryBet) {
        return {
          source: 'special',
          data: latestHistoryBet,
          type: specialResultType,
        };
      }
      if (result) {
        return {
          source: 'special',
          data: result,
          type: specialResultType,
        };
      }
    }

    // If no active game in contract, don't show pending status
    if (!gameStatus?.isActive && latestHistoryBet) {
      return {
        source: 'history',
        data: latestHistoryBet,
      };
    }

    // First check if latest history bet matches our current bet - this takes highest priority
    if (
      latestHistoryBet &&
      isCurrentBetResult(latestHistoryBet, chosenNumber, betAmount)
    ) {
      return {
        source: 'history',
        data: latestHistoryBet,
      };
    }

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
    isNewUser,
    isSpecialResult,
    specialResultType,
  ]);

  // Log the display result for debugging
  useEffect(() => {
    console.log('Display result decision:', displayResult);
  }, [displayResult]);

  // Show welcome message for new users
  if (isNewUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white rounded-xl border-2 border-[#22AD74]/20 p-4 shadow-lg relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#22AD74]/10 rounded-full blur-xl" />
        <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-[#22AD74]/5 rounded-full blur-xl" />

        <div className="text-center mb-3 relative z-10">
          <span className="font-bold text-secondary-800 text-lg">
            Latest Roll
          </span>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center py-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 10, 0] }}
            transition={{ type: 'spring', damping: 10, stiffness: 100 }}
            className="w-16 h-16 bg-[#22AD74]/10 rounded-full flex items-center justify-center mb-3"
          >
            <FontAwesomeIcon
              icon={faDice}
              className="text-[#22AD74] text-3xl"
            />
          </motion.div>

          <div className="text-center">
            <h3 className="font-medium text-secondary-700 mb-1">
              Place Your First Bet
            </h3>
            <p className="text-secondary-500 text-sm mb-3">
              Your roll results will appear here
            </p>
            <div className="inline-block bg-[#22AD74]/10 text-[#22AD74] text-xs font-medium px-3 py-1 rounded-full">
              <FontAwesomeIcon icon={faTrophy} className="mr-1" />
              <span>Ready to play!</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

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
          <span className="text-secondary-600">
            Connect your wallet to play
          </span>
        </div>
      </motion.div>
    );
  }

  // Display special result (recovered or force stopped)
  if (displayResult?.source === 'special') {
    const data = displayResult.data;
    const isRecovered = displayResult.type === 'recovered';
    const isForceStopped = displayResult.type === 'force_stopped';
    const refundAmount = data.amount || '0';

    // Determine color scheme based on type
    const colorScheme = isRecovered ? 'indigo' : 'amber';
    const icon = isRecovered ? faSync : faRandom;
    const title = isRecovered ? 'Game Recovered' : 'Game Force Stopped';
    const description = isRecovered
      ? 'Your bet has been refunded due to network delays'
      : 'Your bet was forced to stop by an administrator';

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white rounded-xl border-2 border-secondary-200 p-4 shadow-lg relative overflow-hidden"
      >
        {/* Custom background color based on type */}
        <div
          className={`absolute -top-10 -right-10 w-24 h-24 bg-${colorScheme}-500/20 rounded-full blur-xl`}
        />
        <div
          className={`absolute -bottom-12 -left-12 w-28 h-28 bg-${colorScheme}-500/10 rounded-full blur-xl`}
        />

        <div className="text-center mb-3">
          <span className="font-bold text-secondary-800 text-lg">
            Latest Roll
          </span>
        </div>

        {/* Status Card */}
        <div className="flex flex-col items-center relative z-10 my-1">
          <div
            className={`w-full mb-4 bg-gradient-to-br from-${colorScheme}-50 to-${colorScheme}-100 rounded-xl p-3 border border-${colorScheme}-200 relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-white/40" />
            <div className="relative z-10">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-12 h-12 relative">
                    <motion.div
                      className={`absolute inset-0 rounded-full bg-${colorScheme}-100`}
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: 0, duration: 2 }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FontAwesomeIcon
                        icon={icon}
                        className={`text-${colorScheme}-700 text-2xl`}
                      />
                    </div>
                  </div>
                  <div className="ml-3">
                    <div
                      className={`text-sm font-medium text-${colorScheme}-700`}
                    >
                      {title}
                    </div>
                    <div className={`text-xs text-${colorScheme}-600`}>
                      Chosen number: {data.chosenNumber || 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full bg-white rounded-lg p-3 border border-secondary-200 text-sm">
            <div className="text-center mb-3">
              <div className="text-secondary-600 text-sm mb-1">
                {description}
              </div>
              <div className="flex flex-col items-center">
                <div className="font-medium text-secondary-700">
                  Refund Amount
                </div>
                <div className="text-xl font-bold text-secondary-800">
                  {formatAmount(refundAmount)} GAMA
                </div>
              </div>
            </div>

            <div
              className={`px-3 py-2 rounded-lg bg-${colorScheme}-50 border border-${colorScheme}-100 text-${colorScheme}-700 text-sm text-center`}
            >
              {isRecovered
                ? 'Your bet has been automatically refunded'
                : 'This game has been manually stopped by an administrator'}
            </div>
          </div>
        </div>

        {/* Timestamp if available */}
        {data.timestamp && (
          <div className="mt-3 text-xs text-secondary-500 text-right relative z-10">
            {new Date(data.timestamp * 1000).toLocaleString()}
          </div>
        )}
      </motion.div>
    );
  }

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
        className="w-full bg-white rounded-xl border-2 border-secondary-200 p-4 shadow-lg relative overflow-hidden"
      >
        {/* Purple glow effects */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/20 rounded-full blur-xl" />
        <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-purple-500/10 rounded-full blur-xl" />

        <div className="text-center mb-3">
          <span className="font-bold text-secondary-800 text-lg">
            Latest Roll
          </span>
        </div>

        {/* VRF Status Card */}
        <div className="flex flex-col items-center relative z-10 my-1">
          <div className="w-full mb-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border border-purple-200 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/40" />
            <div className="relative z-10">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-12 h-12 relative">
                    <motion.div
                      className="absolute inset-0 rounded-full bg-purple-100"
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-2xl font-bold text-purple-700">
                        {chosenNumber || gameStatus?.chosenNumber || '?'}
                      </div>
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-purple-700">
                      Waiting for Random Number
                    </div>
                    <div className="text-xs text-purple-600">
                      Chosen number:{' '}
                      {chosenNumber || gameStatus?.chosenNumber || 'Unknown'}
                    </div>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: 'linear',
                  }}
                >
                  <svg
                    className="w-6 h-6 text-purple-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="w-full bg-white rounded-lg p-3 border border-secondary-200 text-sm">
            <div className="text-center mb-1">
              <div className="font-medium text-secondary-700">Bet Amount</div>
              <div className="text-xl font-bold text-secondary-800 mb-1">
                {formatAmount(pendingBetAmount)} GAMA
              </div>
            </div>

            <div className="flex items-center justify-center mt-1">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex items-center text-purple-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span className="text-xs font-medium">
                  Getting secure random number from Chainlink VRF
                </span>
              </motion.div>
            </div>

            {showExtendedInfo && (
              <div className="mt-2 pt-2 border-t border-secondary-100 text-center text-xs text-secondary-500">
                <div>Taking longer than usual...</div>
                <div className="mt-1">Waiting for {elapsedSeconds} seconds</div>
              </div>
            )}
          </div>
        </div>

        {latestHistoryBet && (
          <div className="mt-4 pt-4 border-t border-secondary-200">
            <div className="flex items-center mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-secondary-500 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm font-medium text-secondary-700">
                Last Completed Bet
              </div>
            </div>

            <div className="bg-gradient-to-r from-secondary-50 to-secondary-100 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-secondary-200 flex items-center justify-center mr-2 font-bold text-secondary-700">
                    {latestHistoryBet.rolledNumber >= 1 &&
                    latestHistoryBet.rolledNumber <= 6
                      ? latestHistoryBet.rolledNumber
                      : latestHistoryBet.resultType === 'recovered'
                        ? 'R'
                        : latestHistoryBet.resultType === 'force_stopped'
                          ? 'F'
                          : '?'}
                  </div>
                  <div>
                    <div className="text-xs text-secondary-600">
                      {latestHistoryBet.resultType === 'recovered'
                        ? 'Recovered'
                        : latestHistoryBet.resultType === 'force_stopped'
                          ? 'Stopped'
                          : 'Rolled'}
                    </div>
                  </div>
                </div>
                <div>
                  {latestHistoryBet.isWin ? (
                    <span className="text-gaming-success text-sm font-medium px-2 py-1 bg-gaming-success/10 rounded-full">
                      Won
                    </span>
                  ) : latestHistoryBet.resultType === 'recovered' ? (
                    <span className="text-indigo-600 text-sm font-medium px-2 py-1 bg-indigo-100/50 rounded-full">
                      Refunded
                    </span>
                  ) : latestHistoryBet.resultType === 'force_stopped' ? (
                    <span className="text-amber-600 text-sm font-medium px-2 py-1 bg-amber-100/50 rounded-full">
                      Refunded
                    </span>
                  ) : (
                    <span className="text-gaming-error text-sm font-medium px-2 py-1 bg-gaming-error/10 rounded-full">
                      Lost
                    </span>
                  )}
                </div>
              </div>
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

    // Determine background style based on win/loss
    const resultBgGradient = isWin
      ? 'from-gaming-success/5 to-gaming-success/10'
      : 'from-gaming-error/5 to-gaming-error/10';

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white rounded-xl border-2 border-secondary-200 p-4 shadow-lg relative overflow-hidden"
      >
        {/* Background gradient effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${resultBgGradient} opacity-50`}
        />

        <div className="text-center mb-3 relative z-10">
          <span className="font-bold text-secondary-800 text-lg">
            Latest Roll
          </span>
        </div>

        <div className="flex items-center justify-center space-x-8 my-4 relative z-10">
          {/* Chosen Number */}
          <div className="text-center">
            <div className="text-xs text-secondary-600 mb-1">You Chose</div>
            <div className="w-14 h-14 rounded-lg bg-white shadow-md border border-secondary-200 flex items-center justify-center">
              <span className="text-2xl font-bold text-secondary-800">
                {chosenNum}
              </span>
            </div>
          </div>

          {/* Result Number */}
          <div className="text-center">
            <div className="text-xs text-secondary-600 mb-1">Rolled</div>
            <div
              className={`w-14 h-14 rounded-lg ${
                isWin
                  ? 'bg-gaming-success/20 border-gaming-success/30'
                  : 'bg-gaming-error/20 border-gaming-error/30'
              } shadow-md border flex items-center justify-center`}
            >
              <span
                className={`text-2xl font-bold ${
                  isWin ? 'text-gaming-success' : 'text-gaming-error'
                }`}
              >
                {rolledNum}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-center my-3 relative z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`text-lg font-bold px-3 py-1.5 rounded-lg ${
              isWin
                ? 'bg-gaming-success/20 text-gaming-success'
                : 'bg-gaming-error/20 text-gaming-error'
            }`}
          >
            {isWin ? (
              <span className="flex items-center">
                <span className="mr-1">🎉</span> Won!
              </span>
            ) : (
              <span className="flex items-center">
                <span className="mr-1">😔</span> Lost
              </span>
            )}
          </motion.div>
        </div>

        {/* Bet Details */}
        <div className="relative z-10 bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-secondary-200">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-secondary-600">Bet Amount</div>
              <div className="font-bold text-lg text-secondary-800">
                {formatAmount(amount)} GAMA
              </div>
            </div>
            <div className="h-10 border-r border-secondary-200 mx-2"></div>
            <div>
              <div className="text-sm text-secondary-600">
                {isWin ? 'Payout' : 'Result'}
              </div>
              <div
                className={`text-lg font-bold ${
                  isWin ? 'text-gaming-success' : 'text-gaming-error'
                }`}
              >
                {isWin ? <>+{formatAmount(payout)} GAMA</> : 'No Win'}
              </div>
            </div>
          </div>
        </div>

        {/* Timestamp - would need to add this data */}
        {data.timestamp && (
          <div className="mt-3 text-xs text-secondary-500 text-right relative z-10">
            {new Date(data.timestamp * 1000).toLocaleString()}
          </div>
        )}
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
