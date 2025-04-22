import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ethers } from 'ethers';

// Special result constants
const RESULT_FORCE_STOPPED = 254;
const RESULT_RECOVERED = 255;

/**
 * Enhanced Dice Visualizer Component with special result handling
 */
const DiceVisualizer = ({ chosenNumber, isRolling = false, result = null }) => {
  // Animation and state management
  const [showResultAnimation, setShowResultAnimation] = useState(false);
  const [betOutcome, setBetOutcome] = useState(null); // 'win', 'lose', 'recovered', 'forceStopped' or null
  const [showConfetti, setShowConfetti] = useState(false);
  const [rollCount, setRollCount] = useState(0);
  const confettiTimeoutsRef = useRef([]);
  const animationTimeoutsRef = useRef([]);

  // Helper function to get a random dice number for animation
  const getRandomDiceNumber = () => Math.floor(Math.random() * 6) + 1;

  // Extract the rolled number from result object if needed
  const rolledNumber = useMemo(() => {
    if (result === null) return null;

    // If result is a number, use it directly
    if (typeof result === 'number') return result;

    // If result is an object with rolledNumber property, use that
    if (result.rolledNumber !== undefined) return result.rolledNumber;

    // Handle other properties that might contain the result
    if (result.result !== undefined) return result.result;

    // Default fallback
    return null;
  }, [result]);

  // Get a random dice number for animation that varies each time
  const randomDiceNumber = useMemo(() => {
    return getRandomDiceNumber();
    // We intentionally only want to recalculate when rollCount changes,
    // which happens during the rolling animation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollCount]);

  // Check if result is a special code
  const isSpecialResult =
    rolledNumber === RESULT_FORCE_STOPPED || rolledNumber === RESULT_RECOVERED;

  // Get dice number to display
  const getDisplayNumber = () => {
    if (rolledNumber !== null) {
      // If we have a result, validate it
      if (rolledNumber >= 1 && rolledNumber <= 6) {
        return rolledNumber; // Normal dice number
      } else if (isSpecialResult) {
        return rolledNumber; // Special result code
      }
      return 1; // Default fallback
    }

    // If no result yet, use chosen number if valid
    if (chosenNumber >= 1 && chosenNumber <= 6) {
      return chosenNumber;
    }

    return 1; // Default fallback
  };

  // Clear all animation timeouts on unmount or when dependencies change
  const clearAllTimeouts = () => {
    confettiTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    animationTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    confettiTimeoutsRef.current = [];
    animationTimeoutsRef.current = [];
  };

  // Rolling animation effect
  useEffect(() => {
    let intervalId;

    if (isRolling) {
      intervalId = setInterval(() => {
        setRollCount(prev => prev + 1);
      }, 150);
    } else {
      setRollCount(0);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRolling]);

  // Win/lose detection and confetti effect with proper cleanup
  useEffect(() => {
    clearAllTimeouts();

    if (rolledNumber !== null && !isRolling) {
      // Determine outcome based on result
      let outcome;

      if (rolledNumber === RESULT_RECOVERED) {
        outcome = 'recovered';
      } else if (rolledNumber === RESULT_FORCE_STOPPED) {
        outcome = 'forceStopped';
      } else {
        // Normal game result
        const isWin = result?.isWin || rolledNumber === chosenNumber;
        outcome = isWin ? 'win' : 'lose';
      }

      // Short delay to show the dice face before showing result animation
      const animationDelay = setTimeout(() => {
        setShowResultAnimation(true);
        setBetOutcome(outcome);

        if (outcome === 'win') {
          setShowConfetti(true);

          // Enhanced confetti effect with smoother particle distribution
          const launchConfetti = () => {
            const colors = ['#00bb11', '#22ddff', '#ffdd00', '#ffffff'];

            if (typeof window !== 'undefined') {
              // Left side burst
              confetti({
                particleCount: Math.min(30, window.innerWidth < 600 ? 15 : 30),
                angle: 60,
                spread: 70,
                origin: { x: 0.2, y: 0.6 },
                colors,
                shapes: ['circle', 'square'],
                gravity: 0.8,
                scalar: window.innerWidth < 600 ? 0.8 : 1.2,
                decay: 0.94,
                disableForReducedMotion: true,
              });

              // Right side burst
              confetti({
                particleCount: Math.min(30, window.innerWidth < 600 ? 15 : 30),
                angle: 120,
                spread: 70,
                origin: { x: 0.8, y: 0.6 },
                colors,
                shapes: ['circle', 'square'],
                gravity: 0.8,
                scalar: window.innerWidth < 600 ? 0.8 : 1.2,
                decay: 0.94,
                disableForReducedMotion: true,
              });

              // Top center burst
              confetti({
                particleCount: Math.min(20, window.innerWidth < 600 ? 10 : 20),
                angle: 90,
                spread: 45,
                origin: { x: 0.5, y: 0.3 },
                colors,
                shapes: ['circle', 'square'],
                gravity: 1,
                scalar: window.innerWidth < 600 ? 0.8 : 1,
                decay: 0.94,
                disableForReducedMotion: true,
              });
            }
          };

          // Sequence of confetti bursts for a more satisfying effect
          launchConfetti();

          // Store timeout IDs for cleanup
          const timeout1 = setTimeout(() => launchConfetti(), 300);
          const timeout2 = setTimeout(() => launchConfetti(), 700);

          confettiTimeoutsRef.current.push(timeout1, timeout2);
        }
      }, 500);

      // Hide animations after a delay
      const hideAnimationsDelay = setTimeout(() => {
        setShowResultAnimation(false);
        setShowConfetti(false);
      }, 4000);

      // Store animation timeout IDs for cleanup
      animationTimeoutsRef.current.push(animationDelay, hideAnimationsDelay);
    } else {
      // Reset animations when not showing a result
      setShowResultAnimation(false);
      setShowConfetti(false);
      setBetOutcome(null);
    }

    // Clean up all timeouts on unmount or when dependencies change
    return clearAllTimeouts;
  }, [result, rolledNumber, chosenNumber, isRolling]);

  // Render a single dot for the dice face
  const renderDot = (size = 'w-2 h-2') => (
    <div className={`${size} dice-dot`} />
  );

  // Render the dice face with dots
  const renderDiceFace = number => {
    // For special results, show a symbol
    if (number === RESULT_RECOVERED) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div className="text-4xl">♻️</div>
        </div>
      );
    } else if (number === RESULT_FORCE_STOPPED) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div className="text-4xl">⚠️</div>
        </div>
      );
    }

    // Regular dice face patterns
    const dotConfigurations = {
      1: (
        <div className="absolute inset-0 flex items-center justify-center">
          {renderDot('w-6 h-6')}
        </div>
      ),
      2: (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-2 grid-rows-2 gap-2 w-full h-full p-4">
            <div className="flex items-start justify-start">
              {renderDot('w-5 h-5')}
            </div>
            <div className="flex items-end justify-end">
              {renderDot('w-5 h-5')}
            </div>
          </div>
        </div>
      ),
      3: (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-3">
            <div className="flex items-start justify-start">
              {renderDot('w-4 h-4')}
            </div>
            <div></div>
            <div className="flex items-start justify-end">
              {renderDot('w-4 h-4')}
            </div>
            <div></div>
            <div className="flex items-center justify-center">
              {renderDot('w-4 h-4')}
            </div>
            <div></div>
            <div className="flex items-end justify-start">
              {renderDot('w-4 h-4')}
            </div>
            <div></div>
            <div className="flex items-end justify-end">
              {renderDot('w-4 h-4')}
            </div>
          </div>
        </div>
      ),
      4: (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-2 grid-rows-2 gap-2 w-full h-full p-4">
            <div className="flex items-start justify-start">
              {renderDot('w-5 h-5')}
            </div>
            <div className="flex items-start justify-end">
              {renderDot('w-5 h-5')}
            </div>
            <div className="flex items-end justify-start">
              {renderDot('w-5 h-5')}
            </div>
            <div className="flex items-end justify-end">
              {renderDot('w-5 h-5')}
            </div>
          </div>
        </div>
      ),
      5: (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-3">
            <div className="flex items-start justify-start">
              {renderDot('w-4 h-4')}
            </div>
            <div></div>
            <div className="flex items-start justify-end">
              {renderDot('w-4 h-4')}
            </div>
            <div></div>
            <div className="flex items-center justify-center">
              {renderDot('w-4 h-4')}
            </div>
            <div></div>
            <div className="flex items-end justify-start">
              {renderDot('w-4 h-4')}
            </div>
            <div></div>
            <div className="flex items-end justify-end">
              {renderDot('w-4 h-4')}
            </div>
          </div>
        </div>
      ),
      6: (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-2 grid-rows-3 gap-2 w-full h-full p-4">
            <div className="flex items-start justify-start">
              {renderDot('w-4 h-4')}
            </div>
            <div className="flex items-start justify-end">
              {renderDot('w-4 h-4')}
            </div>
            <div className="flex items-center justify-start">
              {renderDot('w-4 h-4')}
            </div>
            <div className="flex items-center justify-end">
              {renderDot('w-4 h-4')}
            </div>
            <div className="flex items-end justify-start">
              {renderDot('w-4 h-4')}
            </div>
            <div className="flex items-end justify-end">
              {renderDot('w-4 h-4')}
            </div>
          </div>
        </div>
      ),
    };

    // Return the dot configuration for the number, or default to 1
    return dotConfigurations[number] || dotConfigurations[1];
  };

  // Get text to display for special results
  const getSpecialResultText = () => {
    if (rolledNumber === RESULT_RECOVERED) {
      return 'Game Recovered';
    }
    if (rolledNumber === RESULT_FORCE_STOPPED) {
      return 'Game Stopped';
    }
    return '';
  };

  return (
    <div className="dice-container">
      {/* Main Dice */}
      <motion.div
        initial={{ scale: 1 }}
        animate={{
          scale: isRolling && !rolledNumber ? [1, 0.9, 1.1, 0.95, 1.05, 1] : 1,
          rotate: isRolling && !rolledNumber ? [0, -10, 20, -15, 5, 0] : 0,
        }}
        transition={{
          duration: isRolling ? 0.5 : 0.3,
          ease: 'easeInOut',
          repeat: isRolling && !rolledNumber ? Infinity : 0,
        }}
        className="dice-face"
      >
        {isRolling && !rolledNumber ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {renderDiceFace(randomDiceNumber)}
          </div>
        ) : (
          renderDiceFace(getDisplayNumber())
        )}
      </motion.div>

      {/* Confetti Animation */}
      {showConfetti && <div className="absolute inset-0 pointer-events-none" />}

      {/* Win/Lose Overlay */}
      <AnimatePresence>
        {showResultAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ zIndex: 10 }}
          >
            <div
              className={`text-center p-4 rounded-xl flex flex-col items-center justify-center shadow-xl
                ${
                  betOutcome === 'win'
                    ? 'bg-gaming-success text-white'
                    : betOutcome === 'lose'
                      ? 'bg-gaming-error text-white'
                      : 'bg-blue-500 text-white'
                }`}
              style={{ maxWidth: '80%' }}
            >
              <div className="text-xl md:text-3xl font-bold mb-1">
                {betOutcome === 'win'
                  ? 'Winner!'
                  : betOutcome === 'lose'
                    ? 'Try Again!'
                    : getSpecialResultText()}
              </div>
              <div className="text-sm md:text-base opacity-90">
                {betOutcome === 'win'
                  ? `Congratulations! ${result?.payout ? `+${ethers.formatEther(result.payout).slice(0, 6)} GAMA` : ''}`
                  : betOutcome === 'lose'
                    ? 'Better luck next time'
                    : betOutcome === 'recovered'
                      ? 'Game refunded'
                      : 'Game ended'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DiceVisualizer;
