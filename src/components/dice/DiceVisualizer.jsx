import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { formatDiceResult } from '../../utils/formatting';

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
  const [showWinConfetti, setShowWinConfetti] = useState(false);
  const [rollCount, setRollCount] = useState(0);
  const confettiTimeoutsRef = useRef([]);
  const animationTimeoutsRef = useRef([]);

  // Check if result is a special code
  const isSpecialResult =
    result === RESULT_FORCE_STOPPED || result === RESULT_RECOVERED;

  // Get dice number to display
  const getDisplayNumber = () => {
    if (result !== null) {
      // If we have a result, validate it
      if (result >= 1 && result <= 6) {
        return result; // Normal dice number
      } else if (isSpecialResult) {
        return result; // Special result code
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

    if (result !== null && !isRolling) {
      // Determine outcome based on result
      let outcome;

      if (result === RESULT_RECOVERED) {
        outcome = 'recovered';
      } else if (result === RESULT_FORCE_STOPPED) {
        outcome = 'forceStopped';
      } else {
        // Normal game result
        outcome = result === chosenNumber ? 'win' : 'lose';
      }

      // Short delay to show the dice face before showing result animation
      const animationDelay = setTimeout(() => {
        setShowResultAnimation(true);
        setBetOutcome(outcome);

        if (outcome === 'win') {
          setShowWinConfetti(true);

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
        setShowWinConfetti(false);
      }, 4000);

      // Store animation timeout IDs for cleanup
      animationTimeoutsRef.current.push(animationDelay, hideAnimationsDelay);
    } else {
      // Reset animations when not showing a result
      setShowResultAnimation(false);
      setShowWinConfetti(false);
      setBetOutcome(null);
    }

    // Clean up all timeouts on unmount or when dependencies change
    return clearAllTimeouts;
  }, [result, chosenNumber, isRolling]);

  // Render a single dot for the dice face
  const renderDot = (size = 'w-2 h-2') => (
    <div
      className={`${size} bg-white rounded-full`}
      style={{
        boxShadow:
          'inset 0 2px 3px rgba(0, 0, 0, 0.2), 0 1px 1px rgba(255, 255, 255, 0.3)',
      }}
    />
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
          {renderDot('w-5 h-5')}
        </div>
      ),
      2: (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-4">
          <div className="flex items-center justify-center">
            {renderDot('w-4 h-4')}
          </div>
          <div className="flex items-center justify-center"></div>
          <div className="flex items-center justify-center"></div>
          <div className="flex items-center justify-center">
            {renderDot('w-4 h-4')}
          </div>
        </div>
      ),
      3: (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-3">
          <div className="flex items-center justify-center">
            {renderDot('w-3 h-3')}
          </div>
          <div className="flex items-center justify-center"></div>
          <div className="flex items-center justify-center"></div>
          <div className="flex items-center justify-center"></div>
          <div className="flex items-center justify-center">
            {renderDot('w-3 h-3')}
          </div>
          <div className="flex items-center justify-center"></div>
          <div className="flex items-center justify-center"></div>
          <div className="flex items-center justify-center"></div>
          <div className="flex items-center justify-center">
            {renderDot('w-3 h-3')}
          </div>
        </div>
      ),
      4: (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-4">
          <div className="flex items-center justify-center">
            {renderDot('w-4 h-4')}
          </div>
          <div className="flex items-center justify-center">
            {renderDot('w-4 h-4')}
          </div>
          <div className="flex items-center justify-center">
            {renderDot('w-4 h-4')}
          </div>
          <div className="flex items-center justify-center">
            {renderDot('w-4 h-4')}
          </div>
        </div>
      ),
      5: (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-3">
          <div className="flex items-center justify-center">
            {renderDot('w-3 h-3')}
          </div>
          <div className="flex items-center justify-center"></div>
          <div className="flex items-center justify-center">
            {renderDot('w-3 h-3')}
          </div>
          <div className="flex items-center justify-center"></div>
          <div className="flex items-center justify-center">
            {renderDot('w-3 h-3')}
          </div>
          <div className="flex items-center justify-center"></div>
          <div className="flex items-center justify-center">
            {renderDot('w-3 h-3')}
          </div>
          <div className="flex items-center justify-center"></div>
          <div className="flex items-center justify-center">
            {renderDot('w-3 h-3')}
          </div>
        </div>
      ),
      6: (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 p-4">
          <div className="flex items-center justify-center">
            {renderDot('w-3 h-3')}
          </div>
          <div className="flex items-center justify-center">
            {renderDot('w-3 h-3')}
          </div>
          <div className="flex items-center justify-center">
            {renderDot('w-3 h-3')}
          </div>
          <div className="flex items-center justify-center">
            {renderDot('w-3 h-3')}
          </div>
          <div className="flex items-center justify-center">
            {renderDot('w-3 h-3')}
          </div>
          <div className="flex items-center justify-center">
            {renderDot('w-3 h-3')}
          </div>
        </div>
      ),
    };

    // Return the dot configuration for the number, or default to 1
    return dotConfigurations[number] || dotConfigurations[1];
  };

  // Get a random dice number for animation
  const getRandomDiceNumber = () => Math.floor(Math.random() * 6) + 1;

  // Get text to display for special results
  const getSpecialResultText = () => {
    if (result === RESULT_RECOVERED) {
      return 'Game Recovered';
    }
    if (result === RESULT_FORCE_STOPPED) {
      return 'Game Stopped';
    }
    return '';
  };

  return (
    <div className="dice-container">
      <div className="relative w-full h-32 md:h-48">
        {/* Main Dice */}
        <motion.div
          initial={{ scale: 1 }}
          animate={{
            scale: isRolling ? [1, 0.9, 1.1, 0.95, 1.05, 1] : 1,
            rotate: isRolling ? [0, -10, 20, -15, 5, 0] : 0,
          }}
          transition={{
            duration: isRolling ? 0.5 : 0.3,
            ease: 'easeInOut',
            repeat: isRolling ? Infinity : 0,
          }}
          className="dice-face bg-gray-800 shadow-lg"
        >
          {isRolling ? (
            <div className="absolute inset-0 flex items-center justify-center">
              {renderDiceFace(getRandomDiceNumber())}
            </div>
          ) : (
            renderDiceFace(getDisplayNumber())
          )}
        </motion.div>

        {/* Win/Lose Overlay */}
        <AnimatePresence>
          {showResultAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center"
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
                    ? 'Congratulations!'
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
    </div>
  );
};

export default DiceVisualizer;
