import { ethers } from 'ethers';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useRef, useState, useEffect } from 'react';
import { useDiceNumber } from '../../hooks/useDiceNumber';

/**
 * Enhanced Dice Visualizer Component with improved animations, visual feedback, and error handling
 */
const DiceVisualizer = ({ chosenNumber, isRolling = false, result = null }) => {
  const timeoutRefs = useRef([]);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const prevResultRef = useRef(null);
  const vrfStartTimeRef = useRef(null);
  const maxVrfDurationRef = useRef(null);

  // Use the custom hook to handle dice number state with error handling
  const {
    displayNumber,
    betOutcome,
    showResultAnimation,
    showConfetti,
    processingVrf,
    getSpecialResultText,
    setProcessingVrf,
  } = useDiceNumber(result, chosenNumber, isRolling);

  // Start a safety timer for VRF animation (max 15 seconds)
  useEffect(() => {
    // Clear all existing timeouts to avoid race conditions
    const clearAllTimeouts = () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };

    // If the component starts rolling, start processing VRF
    if (isRolling && !processingVrf) {
      clearAllTimeouts();
      setProcessingVrf(true);
      vrfStartTimeRef.current = Date.now();

      // Set a safety timeout to clear the VRF processing state after 15 seconds
      // This will automatically show a timeout message
      const timeoutId = setTimeout(() => {
        // Only clear if we're still processing (result not received)
        if (!result || !result.requestFulfilled) {
          setProcessingVrf(false);
        }
      }, 15000);

      timeoutRefs.current.push(timeoutId);
    }

    // If we receive a result, stop processing VRF
    if (result && (result.requestFulfilled || result.rolledNumber)) {
      clearAllTimeouts();

      // Give a slight delay before clearing the VRF processing state
      // This allows animations to complete
      const timeoutId = setTimeout(() => {
        setProcessingVrf(false);
      }, 1000);

      timeoutRefs.current.push(timeoutId);
    }

    // Cleanup function to clear all timeouts when unmounting
    return () => {
      clearAllTimeouts();
    };
  }, [isRolling, result, processingVrf, setProcessingVrf]);

  // Show a timeout message if VRF processing takes too long
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
        console.error(`Invalid dice number: ${displayNumber}`);
        setHasError(true);
        setErrorMessage(`Invalid dice number: ${displayNumber}`);
      } else {
        // Reset error state if everything is valid
        setHasError(false);
        setErrorMessage('');
      }
    } catch (error) {
      console.error('Error in DiceVisualizer:', error);
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
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
          {renderDot('w-10 h-10')}
        </div>
      ),
      2: (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-6 gap-2">
          <div className="flex items-start justify-start">
            {renderDot('w-6 h-6')}
          </div>
          <div></div>
          <div></div>
          <div className="flex items-end justify-end">
            {renderDot('w-6 h-6')}
          </div>
        </div>
      ),
      3: (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-6 gap-1">
          <div className="flex items-start justify-start">
            {renderDot('w-6 h-6')}
          </div>
          <div></div>
          <div></div>
          <div></div>
          <div className="flex items-center justify-center">
            {renderDot('w-6 h-6')}
          </div>
          <div></div>
          <div></div>
          <div></div>
          <div className="flex items-end justify-end">
            {renderDot('w-6 h-6')}
          </div>
        </div>
      ),
      4: (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-6 gap-4">
          <div className="flex items-start justify-start">
            {renderDot('w-6 h-6')}
          </div>
          <div className="flex items-start justify-end">
            {renderDot('w-6 h-6')}
          </div>
          <div className="flex items-end justify-start">
            {renderDot('w-6 h-6')}
          </div>
          <div className="flex items-end justify-end">
            {renderDot('w-6 h-6')}
          </div>
        </div>
      ),
      5: (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-6 gap-2">
          <div className="flex items-start justify-start">
            {renderDot('w-6 h-6')}
          </div>
          <div></div>
          <div className="flex items-start justify-end">
            {renderDot('w-6 h-6')}
          </div>
          <div></div>
          <div className="flex items-center justify-center">
            {renderDot('w-7 h-7')}
          </div>
          <div></div>
          <div className="flex items-end justify-start">
            {renderDot('w-6 h-6')}
          </div>
          <div></div>
          <div className="flex items-end justify-end">
            {renderDot('w-6 h-6')}
          </div>
        </div>
      ),
      6: (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 p-6 gap-3">
          <div className="flex items-start justify-start">
            {renderDot('w-6 h-6')}
          </div>
          <div className="flex items-start justify-end">
            {renderDot('w-6 h-6')}
          </div>
          <div className="flex items-center justify-start">
            {renderDot('w-6 h-6')}
          </div>
          <div className="flex items-center justify-end">
            {renderDot('w-6 h-6')}
          </div>
          <div className="flex items-end justify-start">
            {renderDot('w-6 h-6')}
          </div>
          <div className="flex items-end justify-end">
            {renderDot('w-6 h-6')}
          </div>
        </div>
      ),
    };

    return dotConfigurations[safeNumber] || dotConfigurations[1];
  };

  // Rolling animation variants
  const rollingVariants = {
    rolling: {
      rotate: [0, 360],
      scale: [1, 0.9, 1],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        ease: 'linear',
      },
    },
    static: {
      rotate: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
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

  // Check if there's a valid result to display
  const hasValidResult =
    result && result.rolledNumber >= 1 && result.rolledNumber <= 6;

  // Determine if the dice should be rolling - fixed logic to properly stop on valid results
  const shouldRoll =
    (isRolling || processingVrf) &&
    !(
      result &&
      (result.requestFulfilled ||
        (result.rolledNumber >= 1 && result.rolledNumber <= 6))
    );

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
      className="dice-container"
      role="img"
      aria-label={`Dice showing number ${displayNumber || 1}`}
    >
      {/* Main Dice */}
      <motion.div
        className="dice-face"
        variants={rollingVariants}
        animate={shouldRoll ? 'rolling' : 'static'}
      >
        {renderDiceFace(displayNumber)}
      </motion.div>

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

      {/* VRF Loading Indicator - Only show for a maximum of 10 seconds */}
      {processingVrf && vrfElapsed <= 10 && (
        <motion.div
          className="absolute top-2 left-2 right-2 text-sm px-3 py-2 rounded-full bg-purple-600 text-white flex items-center justify-center"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <div className="mr-2 h-3 w-3 rounded-full bg-white animate-pulse"></div>
          Waiting for VRF {vrfElapsed > 3 ? `(${vrfElapsed}s)` : ''}
        </motion.div>
      )}

      {/* Timeout message after 10 seconds of VRF waiting */}
      {processingVrf && vrfElapsed > 10 && (
        <motion.div
          className="absolute top-2 left-2 right-2 text-sm px-3 py-2 rounded-full bg-amber-600 text-white flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="mr-2 h-3 w-3 rounded-full bg-white animate-pulse"></div>
          VRF timeout - check history for result
        </motion.div>
      )}
    </div>
  );
};

export default DiceVisualizer;
