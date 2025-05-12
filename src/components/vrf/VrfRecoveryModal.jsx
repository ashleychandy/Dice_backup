import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameRecovery } from '../../hooks/useGameRecovery';
import { usePollingService } from '../../services/pollingService.jsx';

const VrfRecoveryModal = ({ isOpen, onClose }) => {
  const { gameStatus, refreshData } = usePollingService();

  const { recoverGame, isRecovering, recoveryError } = useGameRecovery({
    onSuccess: () => {
      refreshData();
      onClose();
    },
  });

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

  const recoveryTimeoutPeriod = 3600; // 1 hour in seconds
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center isolation-auto"
      >
        {/* Fixed overlay to prevent clicks on the betting board */}
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />
        {/* Modal container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative z-[110] bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl isolate"
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-[#22AD74]/20 rounded-full blur-xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[#22AD74]/10 rounded-full blur-xl" />
          <div className="text-center mb-6 relative">
            <h2 className="text-2xl font-bold text-gray-900">VRF Recovery</h2>
            <p className="text-gray-600 mt-2">
              {!gameStatus?.isActive
                ? "You don't have any active game that needs recovery."
                : gameStatus?.recoveryEligible
                  ? 'Your game is now eligible for recovery. You can recover your bet now.'
                  : 'Your game is in progress. You can recover your bet after the waiting period completes.'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Recovery becomes available after 1 hour and 300 blocks have passed
            </p>
          </div>
          <div className="space-y-4 mb-6">
            {gameStatus?.isActive && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-secondary-400">
                    Recovery eligibility:
                  </span>
                  <span className="text-secondary-400">
                    {gameStatus?.recoveryEligible
                      ? 'Available'
                      : formatTimeRemaining()
                        ? `Time remaining: ${formatTimeRemaining()}`
                        : `${Math.floor(recoveryProgressPercentage)}%`}
                  </span>
                </div>
                <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gaming-primary to-yellow-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${recoveryProgressPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Game Status Information */}
            {gameStatus?.isActive && (
              <div className="mt-4 text-sm text-gray-600 border border-gray-200 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>Bet Number:</div>
                  <div className="font-medium">
                    {gameStatus?.chosenNumber || 'Unknown'}
                  </div>

                  <div>Bet Amount:</div>
                  <div className="font-medium">
                    {gameStatus?.betAmount
                      ? `${parseFloat(gameStatus.betAmount).toFixed(2)} Tokens`
                      : 'Unknown'}
                  </div>

                  <div>VRF Status:</div>
                  <div className="font-medium">
                    {gameStatus?.requestFulfilled
                      ? 'Completed'
                      : gameStatus?.recoveryEligible
                        ? 'Timed Out'
                        : 'Pending'}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
              onClick={onClose}
              disabled={isRecovering}
            >
              Close
            </button>
            {gameStatus?.isActive && (
              <button
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
                onClick={recoverGame}
                disabled={!gameStatus?.recoveryEligible || isRecovering}
              >
                {isRecovering ? 'Recovering...' : 'Recover Game'}
              </button>
            )}
          </div>
          {recoveryError && (
            <div className="text-red-500 mt-2 text-xs">
              {recoveryError.message}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VrfRecoveryModal;
