import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const validateDiceNumber = num => {
  if (!num || isNaN(num)) return 1;
  const number = Number(num);
  if (number < 1 || number > 6) return 1;
  return number;
};

const DiceVisualizer = ({ chosenNumber, isRolling = false, result = null }) => {
  // Use chosen number if provided, otherwise use result or default to 1
  const displayNumber =
    result !== null
      ? validateDiceNumber(result)
      : validateDiceNumber(chosenNumber);

  // Dice dots configuration for numbers 1-6
  const renderDots = number => {
    switch (number) {
      case 1:
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 bg-gaming-primary rounded-full"></div>
          </div>
        );
      case 2:
        return (
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-4 gap-2">
            <div className="w-5 h-5 bg-gaming-primary rounded-full place-self-start"></div>
            <div className="w-5 h-5 bg-gaming-primary rounded-full place-self-end"></div>
          </div>
        );
      case 3:
        return (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-4">
            <div className="w-5 h-5 bg-gaming-primary rounded-full place-self-start"></div>
            <div className="col-start-2 row-start-2 w-5 h-5 bg-gaming-primary rounded-full place-self-center"></div>
            <div className="col-start-3 row-start-3 w-5 h-5 bg-gaming-primary rounded-full place-self-end"></div>
          </div>
        );
      case 4:
        return (
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-4 gap-2">
            <div className="w-5 h-5 bg-gaming-primary rounded-full place-self-start"></div>
            <div className="w-5 h-5 bg-gaming-primary rounded-full place-self-end"></div>
            <div className="w-5 h-5 bg-gaming-primary rounded-full place-self-start"></div>
            <div className="w-5 h-5 bg-gaming-primary rounded-full place-self-end"></div>
          </div>
        );
      case 5:
        return (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-4">
            <div className="w-5 h-5 bg-gaming-primary rounded-full place-self-start"></div>
            <div className="col-start-3 row-start-1 w-5 h-5 bg-gaming-primary rounded-full place-self-end"></div>
            <div className="col-start-2 row-start-2 w-5 h-5 bg-gaming-primary rounded-full place-self-center"></div>
            <div className="col-start-1 row-start-3 w-5 h-5 bg-gaming-primary rounded-full place-self-start"></div>
            <div className="col-start-3 row-start-3 w-5 h-5 bg-gaming-primary rounded-full place-self-end"></div>
          </div>
        );
      case 6:
        return (
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 p-4 gap-2">
            <div className="w-5 h-5 bg-gaming-primary rounded-full place-self-start"></div>
            <div className="w-5 h-5 bg-gaming-primary rounded-full place-self-end"></div>
            <div className="w-5 h-5 bg-gaming-primary rounded-full place-self-center"></div>
            <div className="w-5 h-5 bg-gaming-primary rounded-full place-self-center"></div>
            <div className="w-5 h-5 bg-gaming-primary rounded-full place-self-end"></div>
            <div className="w-5 h-5 bg-gaming-primary rounded-full place-self-start"></div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full max-w-[200px] mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={isRolling ? 'rolling' : `dice-${displayNumber}`}
          initial={{ opacity: 0, rotateX: -90, rotateY: -90 }}
          animate={{
            opacity: 1,
            rotateX: isRolling ? [0, 90, 180, 270, 360] : 0,
            rotateY: isRolling ? [0, 90, 180, 270, 360] : 0,
          }}
          exit={{ opacity: 0, rotateX: 90, rotateY: 90 }}
          transition={
            isRolling
              ? {
                  type: 'spring',
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: 'loop',
                }
              : {
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                }
          }
          className="dice-container bg-secondary-900"
        >
          <div className="dice-face bg-secondary-800">
            {renderDots(displayNumber)}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DiceVisualizer;
