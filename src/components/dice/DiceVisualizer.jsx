import { ethers } from 'ethers';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useRef } from 'react';
import { useDiceNumber } from '../../hooks/useDiceNumber';

/**
 * Enhanced Dice Visualizer Component with improved animations and visual feedback
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

    return dotConfigurations[number] || dotConfigurations[1];
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

  return (
    <div
      className="dice-container"
      role="img"
      aria-label={`Dice showing number ${displayNumber}`}
    >
      {/* Main Dice */}
      <motion.div
        className="dice-face"
        variants={rollingVariants}
        animate={isRolling ? 'rolling' : 'static'}
      >
        {renderDiceFace(displayNumber)}
      </motion.div>

      {/* Confetti Animation */}
      {showConfetti && <div className="absolute inset-0 pointer-events-none" />}

      {/* Win/Lose Overlay */}
      <AnimatePresence>
        {showResultAnimation && (
          <motion.div
            variants={resultVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 flex items-center justify-center"
            style={{ zIndex: 10 }}
          >
            <div
              className={`text-center p-6 rounded-2xl flex flex-col items-center justify-center shadow-2xl backdrop-blur-sm
                ${
                  betOutcome === 'win'
                    ? 'bg-gaming-success/90 text-white'
                    : betOutcome === 'lose'
                      ? 'bg-gaming-error/90 text-white'
                      : 'bg-blue-500/90 text-white'
                }`}
              style={{
                maxWidth: '80%',
                transform: 'translateZ(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }}
            >
              <motion.div
                className="text-2xl md:text-4xl font-bold mb-2"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {betOutcome === 'win'
                  ? '🎉 Winner! 🎉'
                  : betOutcome === 'lose'
                    ? '😔 Try Again!'
                    : getSpecialResultText()}
              </motion.div>
              <motion.div
                className="text-sm md:text-lg opacity-90"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {betOutcome === 'win'
                  ? `Congratulations! ${result?.payout ? `+${ethers.formatEther(result.payout).slice(0, 6)} GAMA` : ''}`
                  : betOutcome === 'lose'
                    ? 'Better luck next time'
                    : betOutcome === 'recovered'
                      ? 'Game refunded'
                      : 'Game ended'}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DiceVisualizer;
