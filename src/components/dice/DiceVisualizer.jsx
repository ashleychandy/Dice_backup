import { motion } from 'framer-motion';
import React, { useRef, useState, useEffect } from 'react';
import { useDiceNumber } from '../../hooks/useDiceNumber';
import { usePollingService } from '../../services/pollingService.jsx';

/**
 * Simplified Dice Visualizer Component focused only on dice display
 */
const DiceVisualizer = ({ chosenNumber, isRolling = false, result = null }) => {
  const timeoutRefs = useRef([]);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const prevResultRef = useRef(null);
  const vrfStartTimeRef = useRef(null);
  const prevNumberRef = useRef(null);

  // Manage dice rolling state directly
  const [shouldRollDice, setShouldRollDice] = useState(false);

  // We now manage processing state internally rather than from the hook
  const [processingVrf, setProcessingVrf] = useState(false);

  // Use polling service to get current game status
  const { gameStatus } = usePollingService();

  // Use the custom hook to handle dice number state with error handling
  // Only using displayNumber from the hook now
  const { displayNumber } = useDiceNumber(result, chosenNumber, isRolling);

  // Track number changes to trigger dot animations
  const [animationKey, setAnimationKey] = useState(0);

  // Reset animation key when display number changes
  useEffect(() => {
    if (displayNumber !== prevNumberRef.current && !shouldRollDice) {
      prevNumberRef.current = displayNumber;
      setAnimationKey(prevKey => prevKey + 1);
    }
  }, [displayNumber, shouldRollDice]);

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
  }, [isRolling, processingVrf, result, gameStatus]);

  // Maximum animation duration of 10 seconds
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
  }, [shouldRollDice]);

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
  }, [gameStatus]);

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

  // Function to render a dot in the dice with enhanced animations
  const renderDot = (size = 'w-5 h-5', index = 0) => (
    <motion.div
      key={`dot-${animationKey}-${index}`}
      className={`${size} dice-dot`}
      initial={{ scale: 0, opacity: 0 }}
      animate={
        shouldRollDice
          ? {
              // Slow, smooth blinking animation during rolling state
              opacity: [0.5, 1, 0.5],
              scale: [0.9, 1, 0.9],
              boxShadow: [
                '0 0 2px rgba(255,255,255,0.4)',
                '0 0 8px rgba(255,255,255,0.8)',
                '0 0 2px rgba(255,255,255,0.4)',
              ],
            }
          : {
              scale: 1,
              opacity: 1,
              rotate: [0, 10, -10, 5, -5, 0],
              backgroundColor: [
                'rgba(255,255,255,0.8)',
                '#ffffff',
                '#f8f8f8',
                '#ffffff',
              ],
            }
      }
      transition={
        shouldRollDice
          ? {
              // Slow, smooth transition for rolling state
              repeat: Infinity,
              duration: 2.5 + index * 0.4, // Varied timing for each dot
              repeatType: 'reverse',
              ease: 'easeInOut',
            }
          : {
              type: 'spring',
              stiffness: 250,
              damping: 15,
              duration: 0.4,
              delay: index * 0.06, // Staggered animation
              backgroundColor: { duration: 0.8, ease: 'easeInOut' },
            }
      }
      style={{
        backgroundColor: 'white',
        boxShadow: shouldRollDice
          ? '0 0 5px rgba(255,255,255,0.6)'
          : '0 0 3px rgba(0,0,0,0.2)',
        borderRadius: '50%',
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
          {renderDot('w-12 h-12', 0)}
        </div>
      ),
      2: (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-6 gap-2">
          <div className="flex items-start justify-start">
            {renderDot('w-8 h-8', 0)}
          </div>
          <div></div>
          <div></div>
          <div className="flex items-end justify-end">
            {renderDot('w-8 h-8', 1)}
          </div>
        </div>
      ),
      3: (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-6 gap-1">
          <div className="flex items-start justify-start">
            {renderDot('w-8 h-8', 0)}
          </div>
          <div></div>
          <div></div>
          <div></div>
          <div className="flex items-center justify-center">
            {renderDot('w-8 h-8', 1)}
          </div>
          <div></div>
          <div></div>
          <div></div>
          <div className="flex items-end justify-end">
            {renderDot('w-8 h-8', 2)}
          </div>
        </div>
      ),
      4: (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-6 gap-4">
          <div className="flex items-start justify-start">
            {renderDot('w-8 h-8', 0)}
          </div>
          <div className="flex items-start justify-end">
            {renderDot('w-8 h-8', 1)}
          </div>
          <div className="flex items-end justify-start">
            {renderDot('w-8 h-8', 2)}
          </div>
          <div className="flex items-end justify-end">
            {renderDot('w-8 h-8', 3)}
          </div>
        </div>
      ),
      5: (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-6 gap-2">
          <div className="flex items-start justify-start">
            {renderDot('w-8 h-8', 0)}
          </div>
          <div></div>
          <div className="flex items-start justify-end">
            {renderDot('w-8 h-8', 1)}
          </div>
          <div></div>
          <div className="flex items-center justify-center">
            {renderDot('w-9 h-9', 2)}
          </div>
          <div></div>
          <div className="flex items-end justify-start">
            {renderDot('w-8 h-8', 3)}
          </div>
          <div></div>
          <div className="flex items-end justify-end">
            {renderDot('w-8 h-8', 4)}
          </div>
        </div>
      ),
      6: (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 p-6 gap-3">
          <div className="flex items-start justify-start">
            {renderDot('w-8 h-8', 0)}
          </div>
          <div className="flex items-start justify-end">
            {renderDot('w-8 h-8', 1)}
          </div>
          <div className="flex items-center justify-start">
            {renderDot('w-8 h-8', 2)}
          </div>
          <div className="flex items-center justify-end">
            {renderDot('w-8 h-8', 3)}
          </div>
          <div className="flex items-end justify-start">
            {renderDot('w-8 h-8', 4)}
          </div>
          <div className="flex items-end justify-end">
            {renderDot('w-8 h-8', 5)}
          </div>
        </div>
      ),
    };

    return dotConfigurations[safeNumber] || dotConfigurations[1];
  };

  // Rolling animation variants
  const rollingVariants = {
    rolling: {
      rotate: [-5, 5, -3, 3, 0],
      scale: [1, 0.97, 1.02, 0.98, 1],
      transition: {
        duration: 4,
        repeat: 3,
        ease: 'easeInOut',
        repeatType: 'mirror',
        maxDuration: 15,
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
    </div>
  );
};

export default DiceVisualizer;
