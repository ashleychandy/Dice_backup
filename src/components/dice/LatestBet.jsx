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
  faCircle,
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

  // Base styles for the card with glass morphism effect
  const baseCardStyle =
    'w-full bg-white/90 backdrop-blur-sm rounded-md shadow-sm border-0 p-3.5 relative';

  // Animation variants with refined micro-interactions
  const cardVariants = {
    initial: { opacity: 0, y: 10, scale: 0.98 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.2, ease: 'easeOut' },
    },
    hover: {
      y: -2,
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      transition: { duration: 0.1 },
    },
  };

  // Component for card header with pill-shaped status indicator
  const CardHeader = ({
    title = 'Latest Roll',
    icon = faDice,
    color = 'text-gray-400',
    status = null,
  }) => (
    <div className="flex items-center justify-between mb-2.5">
      <h2 className="text-sm font-medium text-gray-600">{title}</h2>
      <div className="flex items-center">
        {status && (
          <span
            className={`text-xs ${status.color} rounded-full px-1.5 py-0.5 mr-2 border border-current flex items-center`}
          >
            <FontAwesomeIcon icon={faCircle} className="text-[8px] mr-0.5" />
            {status.label}
          </span>
        )}
        <FontAwesomeIcon icon={icon} className={`${color} text-sm`} />
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
        className={`${baseCardStyle}`}
        style={{ borderLeft: '3px solid #10b981' }}
      >
        <CardHeader title="Welcome!" icon={faDice} color="text-emerald-400" />
        <div className="flex items-center space-x-3.5">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-md p-2.5 flex items-center justify-center w-10 h-10">
            <FontAwesomeIcon
              icon={faDice}
              className="text-emerald-500 text-lg"
            />
          </div>
          <div>
            <h3 className="font-medium text-gray-700 text-sm mb-1">
              Place First Bet
            </h3>
            <p className="text-gray-400 text-xs">Results appear here</p>
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
        className={`${baseCardStyle}`}
        style={{ borderLeft: '3px solid #60a5fa' }}
      >
        <CardHeader
          title="Connect Wallet"
          icon={faWallet}
          color="text-blue-400"
          status={{ label: 'Required', color: 'text-blue-400' }}
        />
        <div className="flex items-center space-x-3.5">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-md p-2.5 flex items-center justify-center w-10 h-10">
            <FontAwesomeIcon
              icon={faWallet}
              className="text-blue-400 text-lg"
            />
          </div>
          <div>
            <h3 className="font-medium text-gray-700 text-sm mb-1">
              Wallet Required
            </h3>
            <p className="text-gray-400 text-xs">Connect to play</p>
          </div>
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
          bg: 'from-indigo-50 to-indigo-100/50',
          text: 'text-indigo-500',
          icon: faSync,
          accent: '#6366f1',
          status: 'Refunded',
        }
      : {
          bg: 'from-amber-50 to-amber-100/50',
          text: 'text-amber-500',
          icon: faRandom,
          accent: '#f59e0b',
          status: 'Stopped',
        };

    return (
      <motion.div
        initial="initial"
        animate="animate"
        whileHover="hover"
        variants={cardVariants}
        className={`${baseCardStyle}`}
        style={{ borderLeft: `3px solid ${colorObj.accent}` }}
      >
        <CardHeader
          title={isRecovered ? 'Recovered' : 'Stopped'}
          icon={colorObj.icon}
          color={colorObj.text}
          status={{ label: colorObj.status, color: colorObj.text }}
        />

        <div className="flex items-center space-x-3.5">
          <div
            className={`bg-gradient-to-br ${colorObj.bg} rounded-md p-2.5 flex items-center justify-center w-10 h-10`}
          >
            <FontAwesomeIcon
              icon={colorObj.icon}
              className={`${colorObj.text} text-lg`}
            />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-500 font-mono">
                #{data.chosenNumber || '?'}
              </span>
              <span
                className={`text-xs ${colorObj.text} px-2 py-0.5 rounded-full bg-white border border-current/20`}
              >
                {formatAmount(refundAmount)}
                <span className="opacity-60 text-xs ml-0.5">GAMA</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {isRecovered ? 'Refunded due to delay' : 'Admin stopped game'}
            </p>
          </div>
        </div>

        {data.timestamp && (
          <div className="mt-2 text-right text-xs text-gray-400">
            {new Date(data.timestamp * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
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
        className={`${baseCardStyle}`}
        style={{ borderLeft: '3px solid #60a5fa' }}
      >
        <CardHeader title="Loading" icon={faSpinner} color="text-blue-400" />
        <div className="flex items-center space-x-3.5">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-md p-2.5 flex items-center justify-center w-10 h-10 relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            >
              <FontAwesomeIcon
                icon={faSpinner}
                className="text-blue-400 text-lg"
              />
            </motion.div>
            <motion.div
              className="absolute inset-0 rounded-md bg-blue-400/10"
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center mb-1.5">
              <motion.div
                className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <motion.div
                  className="h-full bg-blue-400"
                  animate={{ width: ['0%', '100%', '0%'] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
            </div>
            <p className="text-gray-500 text-xs">Loading bet history</p>
          </div>
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
        className={`${baseCardStyle}`}
        style={{ borderLeft: '3px solid #9ca3af' }}
      >
        <CardHeader title="No History" icon={faHistory} color="text-gray-400" />
        <div className="flex items-center space-x-3.5">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-md p-2.5 flex items-center justify-center w-10 h-10">
            <FontAwesomeIcon
              icon={faHistory}
              className="text-gray-400 text-lg"
            />
          </div>
          <div>
            <h3 className="font-medium text-gray-700 text-sm mb-1">
              No Bets Yet
            </h3>
            <p className="text-gray-400 text-xs">Place a bet to play!</p>
          </div>
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
        className={`${baseCardStyle}`}
        style={{ borderLeft: '3px solid #a855f7' }}
      >
        <CardHeader
          title="Processing"
          icon={faSpinner}
          color="text-purple-500"
          status={{ label: 'VRF', color: 'text-purple-500' }}
        />

        <div className="flex items-start space-x-3.5">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-md p-2.5 flex items-center justify-center w-10 h-10 relative">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="h-8 w-8 bg-white rounded-full flex items-center justify-center border border-purple-100"
            >
              <span className="font-mono text-sm text-purple-600">
                {chosenNumber || gameStatus?.chosenNumber || '?'}
              </span>
            </motion.div>
            <motion.div
              className="absolute inset-0 rounded-md bg-purple-400/10"
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-500 flex items-center">
                <span className="font-mono">
                  {formatAmount(pendingBetAmount)}
                </span>
                <span className="opacity-60 text-xs ml-0.5">GAMA</span>
              </span>
              <motion.div
                className="flex items-center"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <span className="text-[10px] h-1.5 w-1.5 bg-purple-500 rounded-full mr-0.5"></span>
                <span className="text-[10px] h-1.5 w-1.5 bg-purple-500 rounded-full mr-0.5"></span>
                <span className="text-[10px] h-1.5 w-1.5 bg-purple-500 rounded-full"></span>
              </motion.div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <motion.div
                  animate={{
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                  }}
                  className="text-xs text-purple-400 mr-1"
                >
                  ⏳
                </motion.div>
                <span className="text-sm text-purple-500 font-medium">
                  Rolling...
                </span>
              </div>
              {showExtendedInfo && (
                <span className="text-xs text-gray-400 font-mono">
                  {elapsedSeconds}s
                </span>
              )}
            </div>
          </div>
        </div>

        {latestHistoryBet && (
          <div className="mt-2 pt-1.5 border-t border-gray-100/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center">
                <span className="h-1.5 w-1.5 bg-gray-300 rounded-full mr-1"></span>
                Last Bet
              </span>
              <div className="flex items-center">
                <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center mr-1.5 text-xs font-mono font-medium border border-gray-100 text-gray-700">
                  {latestHistoryBet.rolledNumber >= 1 &&
                  latestHistoryBet.rolledNumber <= 6
                    ? latestHistoryBet.rolledNumber
                    : '?'}
                </div>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${latestHistoryBet.isWin ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'}`}
                >
                  {latestHistoryBet.isWin ? 'Won' : 'Lost'}
                </span>
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
          bg: 'from-emerald-50 to-emerald-100/50',
          text: 'text-emerald-500',
          icon: faTrophy,
          accent: '#10b981',
          status: 'Win',
        }
      : {
          bg: 'from-rose-50 to-rose-100/50',
          text: 'text-rose-500',
          icon: faDice,
          accent: '#f43f5e',
          status: 'Loss',
        };

    return (
      <motion.div
        initial="initial"
        animate="animate"
        whileHover="hover"
        variants={cardVariants}
        className={`${baseCardStyle}`}
        style={{ borderLeft: `3px solid ${colorScheme.accent}` }}
      >
        <CardHeader
          title={isWin ? 'Winner' : 'Try Again'}
          icon={colorScheme.icon}
          color={colorScheme.text}
          status={{ label: colorScheme.status, color: colorScheme.text }}
        />

        <div className="flex items-center space-x-4 mb-2">
          <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm">
            <span className="text-base text-gray-700 font-mono">
              {chosenNum}
            </span>
          </div>

          <motion.div
            className="h-0.5 w-3 bg-gray-200"
            initial={{ width: 0 }}
            animate={{ width: 12 }}
            transition={{ duration: 0.2 }}
          />

          <div
            className={`h-8 w-8 bg-gradient-to-br ${colorScheme.bg} rounded-full flex items-center justify-center relative shadow-sm`}
          >
            <span className={`text-base ${colorScheme.text} font-mono`}>
              {rolledNum}
            </span>
            {isWin && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-emerald-400"
                initial={{ opacity: 0, scale: 1.3 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </div>

          <div className="flex-1 flex justify-end">
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className={`text-sm font-medium ${colorScheme.text} bg-white border rounded-full px-2.5 py-0.5 flex items-center shadow-sm ${isWin ? 'border-emerald-200' : 'border-rose-200'}`}
            >
              {isWin ? (
                <>
                  <span className="mr-0.5 text-xs">+</span>
                  <span className="font-mono">{formatAmount(payout)}</span>
                </>
              ) : (
                'No Win'
              )}
            </motion.div>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm text-gray-500">
          <div className="flex items-center">
            <span className="h-1.5 w-1.5 bg-gray-300 rounded-full mr-1.5"></span>
            <span>
              Bet: <span className="font-mono">{formatAmount(amount)}</span>{' '}
              GAMA
            </span>
          </div>

          {data.timestamp && (
            <div className="text-xs text-gray-400 font-mono">
              {new Date(data.timestamp * 1000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
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
      className={`${baseCardStyle}`}
      style={{ borderLeft: '3px solid #9ca3af' }}
    >
      <CardHeader />
      <div className="flex items-center space-x-3.5">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-md p-2.5 flex items-center justify-center w-10 h-10">
          <FontAwesomeIcon icon={faDice} className="text-gray-300 text-lg" />
        </div>
        <div>
          <p className="text-gray-500 text-sm">No bet history available</p>
        </div>
      </div>
    </motion.div>
  );
};

export default LatestBet;
