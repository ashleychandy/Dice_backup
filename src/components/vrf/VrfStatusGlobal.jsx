import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRandom,
  faHistory,
  faRecycle,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import { usePollingService } from '../../services/pollingService.jsx';
import { useGameRecovery } from '../../hooks/useGameRecovery.js';

const VrfStatusGlobal = ({ onOpenRecovery }) => {
  const { gameStatus } = usePollingService();
  const { GAME_TIMEOUT } = useGameRecovery();
  const [shouldShow, setShouldShow] = useState(false);
  const [vrfElapsed, setVrfElapsed] = useState(0);
  const vrfStartTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const [resultJustReceived, setResultJustReceived] = useState(false);
  const timerRef = useRef(null);
  const prevGameStatusRef = useRef(null);

  // Check if recovery timeout has been reached
  const isRecoveryTimeoutReached = vrfElapsed >= GAME_TIMEOUT;

  // Calculate progress percentage (capped at 100%)
  const progressPercentage = Math.min(100, (vrfElapsed / GAME_TIMEOUT) * 100);

  // Format elapsed time in a human-readable way
  const formatElapsedTime = () => {
    if (resultJustReceived) return 'Complete';
    if (!vrfElapsed) return '0s';

    // If past the recovery timeout, don't show raw time
    if (isRecoveryTimeoutReached || gameStatus?.recoveryEligible) {
      return 'Recovery ready';
    }

    const minutes = Math.floor(vrfElapsed / 60);
    const seconds = vrfElapsed % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Handle VRF status changes
  useEffect(() => {
    // Check if the game status actually changed to avoid unnecessary updates
    const statusChanged =
      !prevGameStatusRef.current ||
      prevGameStatusRef.current.isActive !== gameStatus?.isActive ||
      prevGameStatusRef.current.requestProcessed !==
        gameStatus?.requestProcessed;

    // Update previous status reference
    prevGameStatusRef.current = gameStatus;

    if (!statusChanged) return;

    // Clear any existing timer to avoid conflicts
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // CASE 1: Active game with pending VRF verification
    if (
      gameStatus?.isActive &&
      gameStatus?.requestExists &&
      !gameStatus?.requestProcessed
    ) {
      setShouldShow(true);
      setResultJustReceived(false);

      // Set start time if not already set
      if (!vrfStartTimeRef.current && gameStatus?.lastPlayTimestamp) {
        vrfStartTimeRef.current = gameStatus.lastPlayTimestamp * 1000;
      } else if (!vrfStartTimeRef.current) {
        vrfStartTimeRef.current = Date.now();
      }
    }
    // CASE 2: Active game but VRF verification just completed
    else if (
      gameStatus?.isActive &&
      gameStatus?.requestProcessed &&
      shouldShow
    ) {
      setResultJustReceived(true);

      // Show success state for 3 seconds, then hide
      timerRef.current = setTimeout(() => {
        setShouldShow(false);
        setResultJustReceived(false);
        vrfStartTimeRef.current = null;
        timerRef.current = null;
      }, 3000);
    }
    // CASE 3: No active game or explicit reset
    else if (!gameStatus?.isActive) {
      setShouldShow(false);
      setResultJustReceived(false);
      vrfStartTimeRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [gameStatus, shouldShow]);

  // Update elapsed time counter
  useEffect(() => {
    if (shouldShow && vrfStartTimeRef.current && !resultJustReceived) {
      // Initial calculation
      setVrfElapsed(Math.floor((Date.now() - vrfStartTimeRef.current) / 1000));

      // Update every second
      intervalRef.current = setInterval(() => {
        setVrfElapsed(
          Math.floor((Date.now() - vrfStartTimeRef.current) / 1000)
        );
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [shouldShow, resultJustReceived]);

  // Get status message based on elapsed time and recovery eligibility
  const getStatusMessage = () => {
    if (resultJustReceived) {
      return 'Roll result has arrived!';
    } else if (gameStatus?.recoveryEligible || isRecoveryTimeoutReached) {
      return 'Your roll result can now be recovered';
    } else if (vrfElapsed > 60) {
      return 'Still awaiting VRF verification...';
    } else if (vrfElapsed > 20) {
      return 'Verifying your roll (taking longer than usual)...';
    } else {
      return 'Verifying your roll...';
    }
  };

  // Determine color based on elapsed time
  const getStatusColor = () => {
    if (resultJustReceived) {
      return 'from-green-500/90 to-green-600/90';
    } else if (gameStatus?.recoveryEligible || isRecoveryTimeoutReached) {
      return 'from-purple-600/90 to-purple-800/90';
    } else if (vrfElapsed > 60) {
      return 'from-purple-800/90 to-purple-900/90';
    } else if (vrfElapsed > 20) {
      return 'from-purple-700/90 to-purple-800/90';
    } else {
      return 'from-purple-600/90 to-purple-700/90';
    }
  };

  // Function to smoothly scroll to game history section
  const scrollToHistory = () => {
    // Find the game history element
    const historyElement = document.querySelector(
      '[data-section="game-history"]'
    );

    if (historyElement) {
      // Scroll smoothly to the element
      historyElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20, x: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-20 right-4 z-30 max-w-xs w-auto md:w-80 shadow-xl"
        >
          <div
            className={`rounded-xl overflow-hidden bg-gradient-to-r ${getStatusColor()} backdrop-blur-sm border border-white/10`}
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center text-white">
                <motion.div
                  animate={{
                    rotate: resultJustReceived ? 0 : [0, 360],
                    scale: resultJustReceived ? 1.2 : [1, 1.2, 1],
                  }}
                  transition={{
                    rotate: { duration: 5, repeat: Infinity, ease: 'linear' },
                    scale: {
                      duration: resultJustReceived ? 0.5 : 2,
                      repeat: resultJustReceived ? 0 : Infinity,
                      repeatType: 'reverse',
                    },
                  }}
                  className="mr-2 text-white opacity-80"
                >
                  {resultJustReceived ||
                  gameStatus?.recoveryEligible ||
                  isRecoveryTimeoutReached ? (
                    <FontAwesomeIcon icon={faCheckCircle} />
                  ) : (
                    <FontAwesomeIcon icon={faRandom} />
                  )}
                </motion.div>
                <span className="font-medium">VRF Status</span>
              </div>
              <div className="text-xs text-white/80 bg-white/10 px-2 py-0.5 rounded-full">
                {formatElapsedTime()}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-white/10">
              <motion.div
                className="h-full bg-white"
                initial={{ width: '0%' }}
                animate={{
                  width: resultJustReceived ? '100%' : `${progressPercentage}%`,
                }}
                transition={{ type: 'tween', duration: 0.5 }}
              />
            </div>

            {/* Content */}
            <div className="px-4 py-3">
              <p className="text-white text-sm">{getStatusMessage()}</p>
              <div className="mt-1 text-xs text-white/70">
                Request ID:{' '}
                {gameStatus?.requestId
                  ? `${gameStatus.requestId.slice(0, 8)}...`
                  : 'Pending'}
              </div>
            </div>

            {/* Action buttons - show after 10s or when result received */}
            {(vrfElapsed > 10 ||
              gameStatus?.recoveryEligible ||
              isRecoveryTimeoutReached ||
              resultJustReceived) && (
              <div className="border-t border-white/10 mt-1">
                <div className="grid grid-cols-2 divide-x divide-white/10">
                  <button
                    onClick={scrollToHistory}
                    className="py-2 text-xs text-white/90 hover:bg-white/10 transition-colors flex items-center justify-center"
                  >
                    <FontAwesomeIcon icon={faHistory} className="mr-1" />
                    View History
                  </button>
                  {!resultJustReceived && (
                    <button
                      onClick={onOpenRecovery}
                      className="py-2 text-xs text-white/90 hover:bg-white/10 transition-colors flex items-center justify-center"
                    >
                      <FontAwesomeIcon icon={faRecycle} className="mr-1" />
                      {gameStatus?.recoveryEligible || isRecoveryTimeoutReached
                        ? 'Recover Now'
                        : 'Recovery Options'}
                    </button>
                  )}
                  {resultJustReceived && (
                    <button
                      onClick={scrollToHistory}
                      className="py-2 text-xs text-white/90 hover:bg-white/10 transition-colors flex items-center justify-center"
                    >
                      <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                      See Results
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VrfStatusGlobal;
