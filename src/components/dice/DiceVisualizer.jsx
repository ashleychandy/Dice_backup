import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { useDiceNumber } from '../../hooks/useDiceNumber';

/**
 * Enhanced Dice Visualizer Component with standard dice patterns
 */
const DiceVisualizer = ({ chosenNumber, isRolling = false, result = null }) => {
  const timeoutRefs = useRef([]);

  // Use the custom hook to handle dice number state
  const {
    displayNumber,
    betOutcome,
    showResultAnimation,
    showConfetti,
    getSpecialResultText,
  } = useDiceNumber(result, chosenNumber, isRolling);

  // Clear all timeouts when unmounting or resetting
  const clearAllTimeouts = () => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, []);

  // Function to render a dot in the dice
  const renderDot = (size = 'w-2 h-2') => (
    <div className={`${size} rounded-full bg-white shadow-sm`}></div>
  );

  // Function to render the dice face based on number
  const renderDiceFace = number => {
    // Configuration for dot positions based on dice number
    const dotConfigurations = {
      1: (
        <div className="absolute inset-0 flex items-center justify-center">
          {renderDot('w-6 h-6')}
        </div>
      ),
      2: (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-3">
            <div className="flex items-start justify-start">
              {renderDot('w-4 h-4')}
            </div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div className="flex items-end justify-end">
              {renderDot('w-4 h-4')}
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
            <div></div>
            <div></div>
            <div className="flex items-center justify-center">
              {renderDot('w-4 h-4')}
            </div>
            <div></div>
            <div></div>
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

  return (
    <div className="dice-container">
      {/* Main Dice - No animation */}
      <div className="dice-face">{renderDiceFace(displayNumber)}</div>

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
