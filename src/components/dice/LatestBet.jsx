import React, { useMemo } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { usePollingService } from '../../services/pollingService.jsx';
import { useWallet } from '../wallet/WalletProvider.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDice,
  faTrophy,
  faRandom,
  faSync,
  faClock,
  faWallet,
  faHistory,
  faSpinner,
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

  const formatAmount = amount => {
    if (!amount || amount === '0') return '0';
    try {
      // Get only the whole number part
      return ethers.formatEther(amount.toString()).split('.')[0];
    } catch (e) {
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
      // Silently handle comparison errors
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

  // Base card style for all states
  const baseCardStyle =
    'w-full bg-white rounded-2xl border border-gray-100 p-5 shadow-lg relative overflow-hidden transition-all duration-300';

  // Animation variants
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
    hover: {
      y: -5,
      boxShadow:
        '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      transition: {
        duration: 0.3,
      },
    },
  };

  // Component for card header
  const CardHeader = ({ title = 'Latest Roll' }) => (
    <div className="flex items-center justify-between mb-4 relative z-10">
      <h2 className="text-lg font-bold text-gray-800 tracking-tight">
        {title}
      </h2>
      <div className="h-7 w-7 rounded-full bg-gray-50 flex items-center justify-center">
        <FontAwesomeIcon icon={faDice} className="text-gray-400 text-sm" />
      </div>
    </div>
  );

  // Show welcome message for new users
  if (isNewUser) {
    return (
      <motion.div
        initial="initial"
        animate="animate"
        whileHover="hover"
        variants={cardVariants}
        className={`${baseCardStyle} border-emerald-100`}
      >
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-100 rounded-full blur-xl opacity-40" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-emerald-50 rounded-full blur-xl opacity-30" />

        <CardHeader title="Welcome!" />

        <div className="relative z-10 flex flex-col items-center justify-center py-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 15, 0] }}
            transition={{ type: 'spring', damping: 12, stiffness: 100 }}
            className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-3"
          >
            <FontAwesomeIcon
              icon={faDice}
              className="text-emerald-500 text-2xl"
            />
          </motion.div>

          <div className="text-center">
            <h3 className="font-semibold text-gray-800 mb-2 text-base">
              Place Your First Bet
            </h3>
            <p className="text-gray-500 text-sm mb-3">
              Your roll results will appear here after you play
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block bg-emerald-50 text-emerald-600 text-xs font-medium px-3 py-1.5 rounded-lg"
            >
              <FontAwesomeIcon icon={faTrophy} className="mr-1.5" />
              <span>Ready to play!</span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show message when no wallet is connected
  if (!isWalletConnected || !account) {
    return (
      <motion.div
        initial="initial"
        animate="animate"
        whileHover="hover"
        variants={cardVariants}
        className={baseCardStyle}
      >
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-blue-50 rounded-full blur-xl opacity-40" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-blue-50 rounded-full blur-xl opacity-30" />

        <CardHeader />

        <div className="flex flex-col justify-center items-center py-4 relative z-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-3"
          >
            <FontAwesomeIcon
              icon={faWallet}
              className="text-blue-400 text-2xl"
            />
          </motion.div>
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            Connect Wallet
          </h3>
          <p className="text-gray-500 text-center text-sm max-w-xs">
            Connect your wallet to start playing
          </p>
        </div>
      </motion.div>
    );
  }

  // Display special result (recovered or force stopped)
  if (displayResult?.source === 'special') {
    const data = displayResult.data;
    const isRecovered = displayResult.type === 'recovered';
    const _isForceStopped = displayResult.type === 'force_stopped';
    const refundAmount = data.amount || '0';

    // Determine color scheme based on type
    const colorObj = isRecovered
      ? {
          bg: 'bg-indigo-50',
          text: 'text-indigo-600',
          border: 'border-indigo-100',
          icon: faSync,
        }
      : {
          bg: 'bg-amber-50',
          text: 'text-amber-600',
          border: 'border-amber-100',
          icon: faRandom,
        };

    const title = isRecovered ? 'Game Recovered' : 'Game Force Stopped';
    const description = isRecovered
      ? 'Your bet has been refunded due to network delays'
      : 'Your bet was forced to stop by an administrator';

    return (
      <motion.div
        initial="initial"
        animate="animate"
        whileHover="hover"
        variants={cardVariants}
        className={`${baseCardStyle} ${colorObj.border}`}
      >
        {/* Subtle gradient background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-70" />
        <div
          className={`absolute -top-10 -right-10 w-32 h-32 ${colorObj.bg} rounded-full blur-xl opacity-50`}
        />
        <div
          className={`absolute -bottom-16 -left-16 w-36 h-36 ${colorObj.bg} rounded-full blur-xl opacity-30`}
        />

        <CardHeader />

        {/* Status Card */}
        <div className="flex flex-col items-center relative z-10 space-y-4">
          <div
            className={`w-full p-3 ${colorObj.bg} rounded-xl border ${colorObj.border} relative`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 relative">
                  <motion.div
                    className={`absolute inset-0 rounded-full ${colorObj.bg}`}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: 0, duration: 2 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={colorObj.icon}
                      className={`${colorObj.text} text-xl`}
                    />
                  </div>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-base font-semibold ${colorObj.text}`}>
                  {title}
                </h3>
                <div className="text-gray-500 text-xs">
                  Chosen number:{' '}
                  <span className="font-medium">
                    {data.chosenNumber || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <div className="text-center mb-2">
              <p className="text-gray-600 text-sm mb-2">{description}</p>
              <div className="space-y-1">
                <span className="block text-xs text-gray-500">
                  Refund Amount
                </span>
                <span className="text-xl font-bold text-gray-800">
                  {formatAmount(refundAmount)} GAMA
                </span>
              </div>
            </div>

            <div
              className={`p-2 rounded-lg ${colorObj.bg} ${colorObj.border} ${colorObj.text} text-xs text-center mt-3 font-medium`}
            >
              {isRecovered
                ? 'Your bet has been automatically refunded'
                : 'This game has been manually stopped by an administrator'}
            </div>
          </div>
        </div>

        {/* Timestamp if available */}
        {data.timestamp && (
          <div className="mt-3 flex items-center justify-end text-xs text-gray-400 relative z-10">
            <FontAwesomeIcon icon={faClock} className="mr-1" />
            <time dateTime={new Date(data.timestamp * 1000).toISOString()}>
              {new Date(data.timestamp * 1000).toLocaleString()}
            </time>
          </div>
        )}
      </motion.div>
    );
  }

  // Show loading state
  if (isLoading && !displayResult) {
    return (
      <motion.div
        initial="initial"
        animate="animate"
        variants={cardVariants}
        className={baseCardStyle}
      >
        <CardHeader />
        <div className="flex flex-col justify-center items-center py-6 relative z-10">
          <motion.div
            animate={{
              rotate: 360,
              transition: {
                repeat: Infinity,
                duration: 1.5,
                ease: 'linear',
              },
            }}
            className="w-8 h-8 mb-3 text-blue-500"
          >
            <FontAwesomeIcon icon={faSpinner} className="w-8 h-8" />
          </motion.div>
          <p className="text-gray-500 text-sm">Loading bet history...</p>
        </div>
      </motion.div>
    );
  }

  // Show empty state for connected users with no history
  if (!displayResult && !isLoading && isWalletConnected && account) {
    return (
      <motion.div
        initial="initial"
        animate="animate"
        whileHover="hover"
        variants={cardVariants}
        className={baseCardStyle}
      >
        <CardHeader />
        <div className="flex flex-col justify-center items-center py-5 relative z-10">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
            <FontAwesomeIcon
              icon={faHistory}
              className="text-gray-400 text-xl"
            />
          </div>
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            No History
          </h3>
          <p className="text-gray-500 text-center text-sm max-w-xs">
            Place your first bet to start playing!
          </p>
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
        initial="initial"
        animate="animate"
        whileHover="hover"
        variants={cardVariants}
        className={`${baseCardStyle} border-purple-100`}
      >
        {/* Modern gradient background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-purple-50/30 to-white opacity-70" />
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-100 rounded-full blur-xl opacity-40" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-purple-100 rounded-full blur-xl opacity-30" />

        <CardHeader />

        {/* VRF Status Card */}
        <div className="flex flex-col items-center relative z-10 space-y-3">
          <motion.div
            className="w-full p-3 bg-purple-50 rounded-xl border border-purple-100"
            animate={{
              boxShadow: [
                '0 0 0 rgba(168, 85, 247, 0)',
                '0 0 15px rgba(168, 85, 247, 0.3)',
                '0 0 0 rgba(168, 85, 247, 0)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-12 h-12 relative">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-purple-100"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-xl font-bold text-purple-600">
                      {chosenNumber || gameStatus?.chosenNumber || '?'}
                    </div>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-base font-semibold text-purple-700">
                    Processing Roll
                  </h3>
                  <div className="text-purple-600 text-xs">
                    Chosen number:{' '}
                    <span className="font-medium">
                      {chosenNumber || gameStatus?.chosenNumber || 'Unknown'}
                    </span>
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
                className="text-purple-500"
              >
                <svg
                  className="w-5 h-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-label="Loading"
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
          </motion.div>

          <div className="w-full bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <div className="text-center mb-2">
              <div className="space-y-1">
                <span className="block text-xs text-gray-500">Bet Amount</span>
                <span className="text-xl font-bold text-gray-800">
                  {formatAmount(pendingBetAmount)} GAMA
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center mt-2">
              <motion.div
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex items-center bg-purple-50 text-purple-600 px-3 py-1.5 rounded-full"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 mr-1.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span className="text-xs font-medium">
                  Getting random number from VRF
                </span>
              </motion.div>
            </div>

            {showExtendedInfo && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-center text-xs text-gray-500">
                  <FontAwesomeIcon
                    icon={faClock}
                    className="mr-1.5 text-gray-400"
                  />
                  <span>Waiting for {elapsedSeconds} seconds</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {latestHistoryBet && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center mb-2">
              <FontAwesomeIcon
                icon={faHistory}
                className="text-gray-400 mr-1.5 text-xs"
              />
              <h3 className="text-xs font-medium text-gray-700">
                Last Completed Bet
              </h3>
            </div>

            <div className="bg-gray-50 rounded-xl p-2.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center mr-2 font-bold text-gray-700 border border-gray-100">
                    {latestHistoryBet.rolledNumber >= 1 &&
                    latestHistoryBet.rolledNumber <= 6
                      ? latestHistoryBet.rolledNumber
                      : latestHistoryBet.resultType === 'recovered'
                        ? 'R'
                        : latestHistoryBet.resultType === 'force_stopped'
                          ? 'F'
                          : '?'}
                  </div>
                  <div className="text-xs text-gray-600">
                    {latestHistoryBet.resultType === 'recovered'
                      ? 'Recovered'
                      : latestHistoryBet.resultType === 'force_stopped'
                        ? 'Stopped'
                        : 'Rolled'}
                  </div>
                </div>
                <div>
                  {latestHistoryBet.isWin ? (
                    <span className="text-emerald-600 text-xs font-medium px-2 py-0.5 bg-emerald-50 rounded-full">
                      Won
                    </span>
                  ) : latestHistoryBet.resultType === 'recovered' ? (
                    <span className="text-indigo-600 text-xs font-medium px-2 py-0.5 bg-indigo-50 rounded-full">
                      Refunded
                    </span>
                  ) : latestHistoryBet.resultType === 'force_stopped' ? (
                    <span className="text-amber-600 text-xs font-medium px-2 py-0.5 bg-amber-50 rounded-full">
                      Refunded
                    </span>
                  ) : (
                    <span className="text-rose-600 text-xs font-medium px-2 py-0.5 bg-rose-50 rounded-full">
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

    // Color scheme based on win/loss
    const colorScheme = isWin
      ? {
          bg: 'bg-emerald-50',
          bgFaint: 'bg-emerald-50/30',
          text: 'text-emerald-600',
          border: 'border-emerald-100',
          emoji: '🎉',
        }
      : {
          bg: 'bg-rose-50',
          bgFaint: 'bg-rose-50/30',
          text: 'text-rose-600',
          border: 'border-rose-100',
          emoji: '😔',
        };

    return (
      <motion.div
        initial="initial"
        animate="animate"
        whileHover="hover"
        variants={cardVariants}
        className={`${baseCardStyle} ${isWin ? 'border-emerald-100' : 'border-rose-100'}`}
      >
        {/* Subtle background effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-br from-white via-${isWin ? 'emerald' : 'rose'}-50/10 to-white`}
        />
        <div
          className={`absolute -top-10 -right-10 w-32 h-32 ${colorScheme.bgFaint} rounded-full blur-xl opacity-70`}
        />
        <div
          className={`absolute -bottom-16 -left-16 w-36 h-36 ${colorScheme.bgFaint} rounded-full blur-xl opacity-50`}
        />

        <CardHeader />

        <div className="flex flex-col space-y-3 relative z-10">
          <div className="flex justify-center items-center space-x-6">
            {/* Chosen Number */}
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">You Chose</div>
              <div className="w-14 h-14 rounded-lg bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-800">
                  {chosenNum}
                </span>
              </div>
            </div>

            {/* Arrow indicator */}
            <div className="text-gray-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </div>

            {/* Result Number */}
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Rolled</div>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={`w-14 h-14 rounded-lg ${colorScheme.bg} ${colorScheme.border} shadow-sm border flex items-center justify-center`}
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                <span className={`text-xl font-bold ${colorScheme.text}`}>
                  {rolledNum}
                </span>
              </motion.div>
            </div>
          </div>

          <div className="flex justify-center my-1">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className={`text-base font-semibold px-4 py-1.5 rounded-lg ${colorScheme.bg} ${colorScheme.text}`}
            >
              <span className="flex items-center">
                <span className="mr-1.5">{colorScheme.emoji}</span>
                {isWin ? 'You Won!' : 'You Lost'}
              </span>
            </motion.div>
          </div>

          {/* Bet Details */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-0.5">Bet Amount</div>
                <div className="font-bold text-base text-gray-800 flex items-center">
                  <span>{formatAmount(amount)}</span>
                  <span className="ml-1 text-gray-500 text-xs">GAMA</span>
                </div>
              </div>
              <div className="h-10 w-px bg-gray-100 mx-3"></div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-0.5">
                  {isWin ? 'Payout' : 'Result'}
                </div>
                <div
                  className={`font-bold text-base flex items-center ${colorScheme.text}`}
                >
                  {isWin ? (
                    <>
                      <span>+{formatAmount(payout)}</span>
                      <span className="ml-1 text-xs font-normal opacity-70">
                        GAMA
                      </span>
                    </>
                  ) : (
                    <span>No Win</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Timestamp - would need to add this data */}
          {data.timestamp && (
            <div className="flex items-center justify-end text-xs text-gray-400">
              <FontAwesomeIcon icon={faClock} className="mr-1" />
              <time dateTime={new Date(data.timestamp * 1000).toISOString()}>
                {new Date(data.timestamp * 1000).toLocaleString()}
              </time>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Fallback if nothing else matches
  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover="hover"
      variants={cardVariants}
      className={baseCardStyle}
    >
      <CardHeader />
      <div className="flex flex-col justify-center items-center py-6 relative z-10">
        <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-3">
          <FontAwesomeIcon icon={faDice} className="text-gray-300 text-xl" />
        </div>
        <p className="text-gray-500 text-sm">No bet history available</p>
      </div>
    </motion.div>
  );
};

export default LatestBet;
