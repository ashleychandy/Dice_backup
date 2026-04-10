import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameRecovery } from '../../hooks/useGameRecovery';
import { usePollingService } from '../../services/pollingService.jsx';
import { ethers } from 'ethers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';

const VrfRecoveryModal = ({ isOpen, onClose }) => {
  const { gameStatus, refreshData } = usePollingService();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const { recoverGame, isRecovering, recoveryError, GAME_TIMEOUT } =
    useGameRecovery({
      onSuccess: () => {
        refreshData();
        onClose();
      },
    });

  // Function to handle manual refresh with visual indicator
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    // Add a small delay to make the refresh indicator visible
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Timer for progress - only updates UI, doesn't poll data
  const [activeGameTimer, setActiveGameTimer] = useState(0);
  useEffect(() => {
    let interval;

    // Only start UI timer if modal is open and we have an active game
    if (isOpen && gameStatus?.isActive) {
      const lastPlayed = gameStatus?.lastPlayTimestamp;

      // Set initial timer value
      if (lastPlayed > 0) {
        const now = Math.floor(Date.now() / 1000);
        setActiveGameTimer(now - lastPlayed);
      } else {
        // If no timestamp available, reset timer
        setActiveGameTimer(0);
      }

      // Update the UI timer every second
      interval = setInterval(() => {
        setActiveGameTimer(prev => prev + 1);
      }, 1000);
    } else if (!gameStatus?.isActive) {
      // No active game, reset timer
      setActiveGameTimer(0);
    }

    return () => clearInterval(interval);
  }, [isOpen, gameStatus?.isActive, gameStatus?.lastPlayTimestamp]);

  const recoveryTimeoutPeriod = GAME_TIMEOUT || 3600; // 1 hour in seconds
  let recoveryProgressPercentage = 0;
  if (recoveryTimeoutPeriod > 0 && activeGameTimer > 0) {
    recoveryProgressPercentage = Math.min(
      100,
      (activeGameTimer / recoveryTimeoutPeriod) * 100
    );
  }

  // Format time remaining for recovery
  const formatTimeRemaining = () => {
    if (!gameStatus?.isActive || gameStatus?.recoveryEligible) {
      return null;
    }

    const secondsRemaining = Math.max(
      0,
      recoveryTimeoutPeriod - activeGameTimer
    );
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format time elapsed in a friendly way (hh:mm:ss)
  const formatTimeElapsed = seconds => {
    if (!seconds) return 'Unknown';

    // If recovery is eligible, don't show raw time
    if (gameStatus?.recoveryEligible) {
      return 'Ready for recovery';
    }

    // Format as hours:minutes:seconds
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Function to copy the request ID to clipboard
  const copyRequestId = () => {
    if (gameStatus?.requestId) {
      navigator.clipboard.writeText(gameStatus.requestId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Function to format a long request ID for display
  const formatRequestId = id => {
    if (!id) return 'None';
    if (id.length <= 14) return id;
    return `${id.slice(0, 6)}...${id.slice(-6)}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center isolation-auto overflow-hidden"
      >
        {/* Fixed overlay to prevent clicks on the betting board */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        {/* Modal container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative z-[110] bg-white/90 backdrop-blur-md rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl isolate max-h-[80vh]"
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-purple-500/20 rounded-full blur-xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-purple-500/10 rounded-full blur-xl" />
          <div className="flex justify-between items-center mb-6 relative">
            <h2 className="text-2xl font-bold text-gray-900">Roll Status</h2>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="text-sm bg-gray-100/80 hover:bg-gray-200 text-gray-600 py-1 px-3 rounded-lg flex items-center"
            >
              {isRefreshing ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Refreshing...
                </span>
              ) : (
                <span>Refresh Status</span>
              )}
            </button>
          </div>
          <div className="text-center mb-6">
            <p className="text-gray-600 mt-2">
              {!gameStatus?.isActive
                ? "You don't have any active bets that need recovery."
                : gameStatus?.recoveryEligible
                  ? 'Your bet can now be recovered. You can safely recover your tokens.'
                  : 'Your bet is still being processed. Recovery becomes available after the waiting period.'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Recovery is available after the required verification period
            </p>
          </div>
          <div className="space-y-4 mb-6">
            {gameStatus?.isActive && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-secondary-400">Recovery progress:</span>
                  <span className="text-secondary-400">
                    {gameStatus?.recoveryEligible ||
                    activeGameTimer >= recoveryTimeoutPeriod
                      ? 'Recover now'
                      : formatTimeRemaining()
                        ? `Time remaining: ${formatTimeRemaining()}`
                        : `${Math.floor(recoveryProgressPercentage)}%`}
                  </span>
                </div>
                <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500/80 to-purple-700/80 transition-all duration-1000 ease-linear"
                    style={{ width: `${recoveryProgressPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Game Status Information */}
            {gameStatus?.isActive && (
              <div className="mt-4 text-sm text-gray-600 border border-gray-200/80 rounded-lg p-3 bg-white/50">
                <div className="grid grid-cols-2 gap-2">
                  <div>Bet Number:</div>
                  <div className="font-medium">
                    {gameStatus?.chosenNumber || 'Unknown'}
                  </div>

                  <div>Bet Amount:</div>
                  <div className="font-medium">
                    {gameStatus?.amount
                      ? `${Number(ethers.formatEther(gameStatus.amount)).toFixed(2)} Tokens`
                      : 'Unknown'}
                  </div>

                  <div>Verification:</div>
                  <div className="font-medium">
                    {gameStatus?.requestProcessed
                      ? 'Completed'
                      : gameStatus?.recoveryEligible
                        ? 'Ready for recovery'
                        : 'In progress'}
                  </div>

                  <div>Recovery Available:</div>
                  <div className="font-medium">
                    {gameStatus?.recoveryEligible ? 'Yes' : 'Not yet'}
                  </div>
                </div>

                <div className="mt-2 text-right">
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    {showDebug
                      ? 'Hide Technical Details'
                      : 'Show Technical Details'}
                  </button>
                </div>

                {showDebug && (
                  <div className="mt-2 text-xs border-t pt-2 border-gray-200 max-h-[20vh] overflow-y-auto overflow-x-hidden pr-2 scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent">
                    <h4 className="font-medium mb-1">Technical Details:</h4>
                    <div className="grid grid-cols-2 gap-1">
                      <div>Request ID:</div>
                      <div className="text-gray-700 flex items-center">
                        <span className="truncate">
                          {formatRequestId(gameStatus?.requestId)}
                        </span>
                        {gameStatus?.requestId && (
                          <button
                            onClick={copyRequestId}
                            className="ml-1 text-purple-600 hover:text-purple-800"
                            title={
                              isCopied ? 'Copied!' : 'Copy full request ID'
                            }
                          >
                            <FontAwesomeIcon icon={faCopy} />
                          </button>
                        )}
                      </div>

                      <div>Request Exists:</div>
                      <div
                        className={
                          gameStatus?.requestExists
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {gameStatus?.requestExists ? 'Yes' : 'No'}
                      </div>

                      <div>Request Processed:</div>
                      <div
                        className={
                          gameStatus?.requestProcessed
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }
                      >
                        {gameStatus?.requestProcessed ? 'Yes' : 'No'}
                      </div>

                      <div>Timestamp:</div>
                      <div>
                        {gameStatus?.lastPlayTimestamp
                          ? new Date(
                              gameStatus.lastPlayTimestamp * 1000
                            ).toLocaleString()
                          : 'Unknown'}
                      </div>

                      <div>Time Elapsed:</div>
                      <div>{formatTimeElapsed(activeGameTimer)}</div>

                      <div>Time Required:</div>
                      <div>{GAME_TIMEOUT || 3600}s (1 hour)</div>
                    </div>
                    <p className="mt-2 text-purple-700">
                      <strong>Note:</strong> Recovery becomes available after:
                      1) Block threshold passed, 2) Time threshold passed, 3)
                      Request verification exists
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 rounded bg-gray-200/80 text-gray-700 hover:bg-gray-300"
              onClick={onClose}
              disabled={isRecovering}
            >
              Close
            </button>
            {gameStatus?.isActive && (
              <button
                className="px-4 py-2 rounded bg-purple-600/80 text-white hover:bg-purple-700 disabled:bg-gray-400/80"
                onClick={recoverGame}
                disabled={
                  !(
                    gameStatus?.recoveryEligible ||
                    activeGameTimer >= recoveryTimeoutPeriod
                  ) || isRecovering
                }
              >
                {isRecovering ? 'Recovering...' : 'Recover Bet'}
              </button>
            )}
          </div>
          {recoveryError && (
            <div className="text-purple-800 bg-purple-100/50 p-2 rounded-lg mt-2 text-xs">
              {recoveryError.message}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VrfRecoveryModal;
