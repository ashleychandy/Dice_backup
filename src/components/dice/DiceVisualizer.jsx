import { ethers } from 'ethers';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useRef, useState, useEffect } from 'react';
import { useDiceNumber } from '../../hooks/useDiceNumber';
import { usePollingService } from '../../services/pollingService.jsx';

/**
 * Enhanced Dice Visualizer Component with improved animations, visual feedback, and error handling
 */
const DiceVisualizer = ({ chosenNumber, isRolling = false, result = null }) => {
  const timeoutRefs = useRef([]);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const prevResultRef = useRef(null);
  const vrfStartTimeRef = useRef(null);

  // Manage dice rolling state directly
  const [shouldRollDice, setShouldRollDice] = useState(false);

  // Use polling service to get current game status
  const { gameStatus } = usePollingService();

  // Use the custom hook to handle dice number state with error handling
  const {
    displayNumber,
    betOutcome,
    showResultAnimation,
    showConfetti,
    processingVrf,
    setProcessingVrf,
  } = useDiceNumber(result, chosenNumber, isRolling);

  // Direct control of dice rolling
  useEffect(() => {
    // Start rolling
    if (isRolling && !result) {
      setShouldRollDice(true);
      setProcessingVrf(true);
    }

    // Stop rolling only when we have a conclusive result
    if (
      result &&
      ((result.rolledNumber >= 1 && result.rolledNumber <= 6) ||
        result.requestFulfilled === true ||
        result.vrfComplete === true)
    ) {
      setShouldRollDice(false);
      setProcessingVrf(false);
    }
    // For pending VRF results, keep processing state active
    else if (result && result.vrfPending) {
      setShouldRollDice(true);
      setProcessingVrf(true);
    }

    // Stop rolling when blockchain says request is processed
    if (gameStatus?.requestProcessed) {
      setShouldRollDice(false);
      setProcessingVrf(false);
    }
  }, [isRolling, processingVrf, result, gameStatus, setProcessingVrf]);

  // Maximum animation duration of 10 seconds (reduced from 15)
  useEffect(() => {
    let maxDurationTimer;
    if (shouldRollDice) {
      // Force stop the dice roll after 10 seconds maximum
      maxDurationTimer = setTimeout(() => {
        setShouldRollDice(false);
        setProcessingVrf(false);
      }, 10000);
    }

    return () => {
      if (maxDurationTimer) {
        clearTimeout(maxDurationTimer);
      }
    };
  }, [shouldRollDice, setProcessingVrf]);

  // Check contract state on component load to maintain VRF status
  useEffect(() => {
    // If there's an active game with a pending request, show VRF processing
    if (
      gameStatus?.isActive &&
      gameStatus?.requestExists &&
      !gameStatus?.requestProcessed
    ) {
      setProcessingVrf(true);
      setShouldRollDice(true);

      // Set the start time to the game's timestamp if available, or current time
      if (!vrfStartTimeRef.current && gameStatus?.lastPlayTimestamp) {
        const startTime = gameStatus.lastPlayTimestamp * 1000;
        vrfStartTimeRef.current = startTime;
      }
    } else if (gameStatus?.requestProcessed) {
      // If blockchain says request is processed, stop processing and rolling
      setProcessingVrf(false);
      setShouldRollDice(false);
    }
  }, [gameStatus, setProcessingVrf]);

  // Show elapsed time counter for VRF processing
  const vrfElapsed = vrfStartTimeRef.current
    ? Math.floor((Date.now() - vrfStartTimeRef.current) / 1000)
    : 0;

  // Keep track of last result to avoid re-rendering issues
  useEffect(() => {
    if (
      result &&
      JSON.stringify(result) !== JSON.stringify(prevResultRef.current)
    ) {
      prevResultRef.current = result;
      // When we get a new result, stop rolling
      setShouldRollDice(false);
    }
  }, [result]);

  // Cleanup on unmount
  useEffect(() => {
    // Clear all timeouts
    const clearAllTimeouts = () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };

    return () => {
      clearAllTimeouts();
    };
  }, []);

  // Error handling for any potential rendering issues
  useEffect(() => {
    try {
      // Validate displayNumber is a number between 1-6
      if (
        displayNumber &&
        (displayNumber < 1 || displayNumber > 6 || isNaN(displayNumber))
      ) {
        setHasError(true);
        setErrorMessage(`Invalid dice number: ${displayNumber}`);
      } else {
        // Reset error state if everything is valid
        setHasError(false);
        setErrorMessage('');
      }
    } catch (error) {
      setHasError(true);
      setErrorMessage(error.message || 'Error rendering dice');
    }
  }, [displayNumber]);

  // Function to render a dot in the dice with enhanced styling
  const renderDot = (size = 'w-5 h-5') => (
    <motion.div
      className={`${size} dice-dot`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 250,
        damping: 15,
        duration: 0.3,
      }}
      style={{
        backgroundColor: 'white',
        boxShadow: '0 0 3px rgba(0,0,0,0.2)',
      }}
    />
  );

  // Function to render the dice face based on number
  const renderDiceFace = number => {
    // Default to 1 for invalid numbers to prevent UI errors
    const safeNumber = number >= 1 && number <= 6 ? number : 1;

    // Configuration for dot positions based on dice number
    const dotConfigurations = {
      1: (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          {renderDot('w-12 h-12')}
        </div>
      ),
      2: (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-6 gap-2">
          <div className="flex items-start justify-start">
            {renderDot('w-8 h-8')}
          </div>
          <div></div>
          <div></div>
          <div className="flex items-end justify-end">
            {renderDot('w-8 h-8')}
          </div>
        </div>
      ),
      3: (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-6 gap-1">
          <div className="flex items-start justify-start">
            {renderDot('w-8 h-8')}
          </div>
          <div></div>
          <div></div>
          <div></div>
          <div className="flex items-center justify-center">
            {renderDot('w-8 h-8')}
          </div>
          <div></div>
          <div></div>
          <div></div>
          <div className="flex items-end justify-end">
            {renderDot('w-8 h-8')}
          </div>
        </div>
      ),
      4: (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-6 gap-4">
          <div className="flex items-start justify-start">
            {renderDot('w-8 h-8')}
          </div>
          <div className="flex items-start justify-end">
            {renderDot('w-8 h-8')}
          </div>
          <div className="flex items-end justify-start">
            {renderDot('w-8 h-8')}
          </div>
          <div className="flex items-end justify-end">
            {renderDot('w-8 h-8')}
          </div>
        </div>
      ),
      5: (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-6 gap-2">
          <div className="flex items-start justify-start">
            {renderDot('w-8 h-8')}
          </div>
          <div></div>
          <div className="flex items-start justify-end">
            {renderDot('w-8 h-8')}
          </div>
          <div></div>
          <div className="flex items-center justify-center">
            {renderDot('w-9 h-9')}
          </div>
          <div></div>
          <div className="flex items-end justify-start">
            {renderDot('w-8 h-8')}
          </div>
          <div></div>
          <div className="flex items-end justify-end">
            {renderDot('w-8 h-8')}
          </div>
        </div>
      ),
      6: (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 p-6 gap-3">
          <div className="flex items-start justify-start">
            {renderDot('w-8 h-8')}
          </div>
          <div className="flex items-start justify-end">
            {renderDot('w-8 h-8')}
          </div>
          <div className="flex items-center justify-start">
            {renderDot('w-8 h-8')}
          </div>
          <div className="flex items-center justify-end">
            {renderDot('w-8 h-8')}
          </div>
          <div className="flex items-end justify-start">
            {renderDot('w-8 h-8')}
          </div>
          <div className="flex items-end justify-end">
            {renderDot('w-8 h-8')}
          </div>
        </div>
      ),
    };

    return dotConfigurations[safeNumber] || dotConfigurations[1];
  };

  // Rolling animation variants - even slower motion for better visibility
  const rollingVariants = {
    rolling: {
      rotate: [-5, 5, -3, 3, 0],
      scale: [1, 0.97, 1.02, 0.98, 1],
      transition: {
        duration: 4, // Even slower animation
        repeat: 3, // 4 seconds x 3 repeats = 12 seconds (plus a small buffer)
        ease: 'easeInOut',
        repeatType: 'mirror',
        maxDuration: 15, // Maximum duration of 15 seconds
      },
    },
    static: {
      rotate: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
        duration: 0.3,
      },
    },
  };

  // Result animation variants
  const resultVariants = {
    initial: { opacity: 0, scale: 0.8, y: 20 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: -20,
      transition: { duration: 0.3 },
    },
  };

  // Fallback UI for error state
  if (hasError) {
    return (
      <div className="dice-container flex items-center justify-center bg-red-100 border border-red-300 rounded-lg p-4">
        <div className="text-red-700 text-center">
          <p className="font-medium">Error displaying dice</p>
          <p className="text-sm">{errorMessage || 'Please try again'}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center"
      style={{ perspective: '1000px' }}
    >
      {/* Main Dice */}
      <motion.div
        className="dice-face"
        variants={rollingVariants}
        animate={shouldRollDice ? 'rolling' : 'static'}
        data-rolling={shouldRollDice ? 'true' : 'false'}
      >
        {renderDiceFace(displayNumber)}
      </motion.div>

      {/* Shadow */}
      <motion.div
        className="w-28 h-5 rounded-full bg-black/15 mt-4 blur-sm"
        animate={{
          scale: shouldRollDice ? [0.95, 1.05, 0.95] : 1,
          opacity: shouldRollDice ? 0.5 : 0.3,
        }}
        transition={{
          repeat: shouldRollDice ? 3 : 0, // Match the dice animation repeat count
          duration: shouldRollDice ? 4 : 0.3, // Match the dice animation duration
          repeatType: 'mirror',
          maxDuration: 15, // Maximum duration of 15 seconds
        }}
      />

      {/* Confetti Animation */}
      {showConfetti && <div className="absolute inset-0 pointer-events-none" />}

      {/* Result Notification */}
      <AnimatePresence>
        {showResultAnimation &&
          betOutcome &&
          (!processingVrf || vrfElapsed > 10) && (
            <motion.div
              className={`result-notification ${
                betOutcome === 'win'
                  ? 'bg-green-600'
                  : betOutcome === 'lose'
                    ? 'bg-red-600'
                    : 'bg-gray-600'
              }`}
              variants={resultVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {betOutcome === 'win' && (
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold">You Won!</span>
                  <span className="text-sm">
                    {result?.payout
                      ? `${ethers.formatEther(result.payout)} Tokens`
                      : ''}
                  </span>
                </div>
              )}

              {betOutcome === 'lose' && <span>You Lost</span>}

              {betOutcome === 'recovered' && <span>Game Recovered</span>}

              {betOutcome === 'stopped' && <span>Game Stopped</span>}

              {betOutcome === 'unknown' && vrfElapsed > 10 && (
                <span>Result Unavailable</span>
              )}
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default DiceVisualizer;
