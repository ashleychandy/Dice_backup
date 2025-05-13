import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRandom,
  faHistory,
  faRecycle,
} from '@fortawesome/free-solid-svg-icons';
import { usePollingService } from '../../services/pollingService.jsx';

const VrfStatusGlobal = ({ onOpenRecovery }) => {
  const { gameStatus } = usePollingService();
  const [shouldShow, setShouldShow] = useState(false);
  const [vrfElapsed, setVrfElapsed] = useState(0);
  const vrfStartTimeRef = useRef(null);
  const intervalRef = useRef(null);

  // Calculate progress percentage (capped at 100% after 2 minutes)
  const progressPercentage = Math.min(100, (vrfElapsed / 120) * 100);

  // Determine if we should show the VRF status
  useEffect(() => {
    if (
      gameStatus?.isActive &&
      gameStatus?.requestExists &&
      !gameStatus?.requestProcessed
    ) {
      setShouldShow(true);

      // Set start time if not already set
      if (!vrfStartTimeRef.current && gameStatus?.lastPlayTimestamp) {
        vrfStartTimeRef.current = gameStatus.lastPlayTimestamp * 1000;
      } else if (!vrfStartTimeRef.current) {
        vrfStartTimeRef.current = Date.now();
      }
    } else {
      // If VRF is complete, keep showing for 3 more seconds
      if (shouldShow) {
        const timer = setTimeout(() => {
          setShouldShow(false);
          vrfStartTimeRef.current = null;
        }, 3000);

        return () => clearTimeout(timer);
      }
    }
  }, [gameStatus, shouldShow]);

  // Update elapsed time counter
  useEffect(() => {
    if (shouldShow && vrfStartTimeRef.current) {
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
  }, [shouldShow]);

  // Get status message based on elapsed time
  const getStatusMessage = () => {
    if (vrfElapsed > 60) {
      return 'Still awaiting VRF verification...';
    } else if (vrfElapsed > 20) {
      return 'Verifying your roll (taking longer than usual)...';
    } else {
      return 'Verifying your roll...';
    }
  };

  // Determine color based on elapsed time
  const getStatusColor = () => {
    if (vrfElapsed > 60) {
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
                    rotate: [0, 360],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    rotate: { duration: 5, repeat: Infinity, ease: 'linear' },
                    scale: {
                      duration: 2,
                      repeat: Infinity,
                      repeatType: 'reverse',
                    },
                  }}
                  className="mr-2 text-white opacity-80"
                >
                  <FontAwesomeIcon icon={faRandom} />
                </motion.div>
                <span className="font-medium">VRF Status</span>
              </div>
              <div className="text-xs text-white/80 bg-white/10 px-2 py-0.5 rounded-full">
                {vrfElapsed}s
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-white/10">
              <motion.div
                className="h-full bg-white"
                initial={{ width: '0%' }}
                animate={{ width: `${progressPercentage}%` }}
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

            {/* Action buttons - show after 10s */}
            {vrfElapsed > 10 && (
              <div className="border-t border-white/10 mt-1">
                <div className="grid grid-cols-2 divide-x divide-white/10">
                  <button
                    onClick={scrollToHistory}
                    className="py-2 text-xs text-white/90 hover:bg-white/10 transition-colors flex items-center justify-center"
                  >
                    <FontAwesomeIcon icon={faHistory} className="mr-1" />
                    View History
                  </button>
                  <button
                    onClick={onOpenRecovery}
                    className="py-2 text-xs text-white/90 hover:bg-white/10 transition-colors flex items-center justify-center"
                  >
                    <FontAwesomeIcon icon={faRecycle} className="mr-1" />
                    Recovery Options
                  </button>
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
