import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStatus } from '../../hooks/useGameStatus';
import { useGameRecovery } from '../../hooks/useGameRecovery';

const VrfRecoveryModal = ({ isOpen, onClose }) => {
  const {
    gameStatus,
    isLoading: statusLoading,
    error: statusError,
    refetch,
  } = useGameStatus();
  const { recoverGame, isRecovering, recoveryError } = useGameRecovery({
    onSuccess: () => {
      refetch();
      onClose();
    },
  });

  // Timer for progress
  const [activeGameTimer, setActiveGameTimer] = useState(0);
  useEffect(() => {
    let interval;
    if (gameStatus?.isActive) {
      interval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const lastPlayed = gameStatus?.lastPlayTimestamp;
        if (lastPlayed > 0) {
          const elapsed = now - lastPlayed;
          setActiveGameTimer(elapsed);
        }
      }, 1000);
    } else {
      setActiveGameTimer(0);
    }
    return () => clearInterval(interval);
  }, [gameStatus?.isActive, gameStatus?.lastPlayTimestamp]);

  const recoveryTimeoutPeriod = 3600; // 1 hour in seconds
  let recoveryProgressPercentage = 0;
  if (recoveryTimeoutPeriod > 0 && activeGameTimer > 0) {
    recoveryProgressPercentage = Math.min(
      100,
      (activeGameTimer / recoveryTimeoutPeriod) * 100
    );
  }

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
              {gameStatus?.recoveryEligible
                ? 'Your game is now eligible for recovery. You can recover your bet now.'
                : 'Your game is in progress. You can recover your bet after the waiting period completes.'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Recovery becomes available after 1 hour and 300 blocks have passed
            </p>
          </div>
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-secondary-400">
                  Recovery eligibility:
                </span>
                <span className="text-secondary-400">
                  {gameStatus?.recoveryEligible
                    ? 'Available'
                    : `${recoveryProgressPercentage}%`}
                </span>
              </div>
              <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gaming-primary to-yellow-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${recoveryProgressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
              onClick={onClose}
              disabled={isRecovering}
            >
              Close
            </button>
            <button
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
              onClick={recoverGame}
              disabled={!gameStatus?.recoveryEligible || isRecovering}
            >
              {isRecovering ? 'Recovering...' : 'Recover Game'}
            </button>
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
