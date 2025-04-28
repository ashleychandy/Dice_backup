import { useState, useEffect } from 'react';

// Constants for special result values
// These should match the smart contract values (based on gameService.js)
export const RESULT_RECOVERED = 255;
export const RESULT_FORCE_STOPPED = 254;

/**
 * Custom hook to manage reactive dice number display
 *
 * @param {Object|null} result - The game result object
 * @param {Number|null} chosenNumber - The number chosen by the player
 * @param {Boolean} isRolling - Whether the dice is currently rolling
 * @returns {Object} - State and methods for dice number display
 */
export const useDiceNumber = (result, chosenNumber, isRolling) => {
  // State for dice number management
  const [randomDiceNumber, setRandomDiceNumber] = useState(1);
  const [rolledNumber, setRolledNumber] = useState(null);
  const [lastRolledNumber, setLastRolledNumber] = useState(null);
  const [betOutcome, setBetOutcome] = useState(null);
  const [showResultAnimation, setShowResultAnimation] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Get random dice number
  const getRandomDiceNumber = () => Math.floor(Math.random() * 6) + 1;

  // Update random dice number when rolling
  useEffect(() => {
    if (isRolling && !rolledNumber) {
      setRandomDiceNumber(getRandomDiceNumber());
    }
  }, [isRolling, rolledNumber]);

  // Handle the result when it arrives
  useEffect(() => {
    console.log('Result received in useDiceNumber:', result);

    if (result) {
      // Extract the correct number from the result object
      // The gameState.lastResult object uses rolledNumber property from the smart contract event
      const resultNumber =
        result.rolledNumber !== undefined
          ? parseInt(result.rolledNumber, 10)
          : result.number !== undefined
            ? parseInt(result.number, 10)
            : typeof result === 'number'
              ? result
              : null;

      console.log('Extracted resultNumber:', resultNumber);

      // Immediately update the rolled number to update the dice face
      setRolledNumber(resultNumber);

      // Store the last valid rolled number (1-6)
      if (resultNumber > 0 && resultNumber <= 6) {
        console.log('Setting lastRolledNumber to:', resultNumber);
        setLastRolledNumber(resultNumber);
      }

      // Determine win/lose status after a short delay
      setTimeout(() => {
        // Check if the result is a special code
        if (resultNumber === RESULT_RECOVERED) {
          setBetOutcome('recovered');
        } else if (resultNumber === RESULT_FORCE_STOPPED) {
          setBetOutcome('stopped');
        }
        // Check for normal rolls (1-6)
        else if (resultNumber >= 1 && resultNumber <= 6) {
          if (resultNumber === chosenNumber) {
            setBetOutcome('win');
            setShowConfetti(true);
          } else {
            setBetOutcome('lose');
          }
        }
        // Any other unknown result
        else if (resultNumber !== null) {
          console.log('Unknown result number:', resultNumber);
          setBetOutcome('unknown');
        }

        setShowResultAnimation(true);
      }, 100);
    } else {
      // Reset state when no result, but keep lastRolledNumber
      setRolledNumber(null);
      setShowConfetti(false);
      setShowResultAnimation(false);
      setBetOutcome(null);
    }
  }, [result, chosenNumber]);

  // Function to get the number to display on the dice
  const getDisplayNumber = () => {
    // If we have a result, show the actual rolled number
    if (rolledNumber !== null) {
      console.log('getDisplayNumber: using rolledNumber:', rolledNumber);
      // If special result (254 or 255), show a default face or last rolled
      if (
        rolledNumber === RESULT_RECOVERED ||
        rolledNumber === RESULT_FORCE_STOPPED
      ) {
        console.log(
          'getDisplayNumber: special result, using lastRolledNumber:',
          lastRolledNumber || 1
        );
        return lastRolledNumber || 1; // Use last rolled number for special results if available
      }
      // Make sure we only return valid dice numbers (1-6)
      if (rolledNumber >= 1 && rolledNumber <= 6) {
        return rolledNumber;
      }
      // For any other invalid number, show last valid roll or chosen number
      return lastRolledNumber || chosenNumber || 1;
    }

    // If rolling but no result yet, show random number
    if (isRolling) {
      console.log(
        'getDisplayNumber: isRolling, using randomDiceNumber:',
        randomDiceNumber
      );
      return randomDiceNumber;
    }

    // If we have a previous roll, show that number
    if (lastRolledNumber) {
      console.log(
        'getDisplayNumber: using lastRolledNumber:',
        lastRolledNumber
      );
      return lastRolledNumber;
    }

    // Default: show chosen number or 1
    console.log('getDisplayNumber: using chosenNumber:', chosenNumber || 1);
    return chosenNumber || 1;
  };

  // Get text to display for special results
  const getSpecialResultText = () => {
    if (rolledNumber === RESULT_RECOVERED) {
      return 'Game Recovered';
    }
    if (rolledNumber === RESULT_FORCE_STOPPED) {
      return 'Game Stopped';
    }
    return 'Unknown Result';
  };

  // Reset animations and state
  const resetState = () => {
    setShowResultAnimation(false);
    setShowConfetti(false);
    setBetOutcome(null);
  };

  return {
    // Current state
    displayNumber: getDisplayNumber(),
    rolledNumber,
    lastRolledNumber,
    randomDiceNumber,
    betOutcome,
    showResultAnimation,
    showConfetti,

    // Methods
    getSpecialResultText,
    resetState,

    // Setters for external control
    setShowResultAnimation,
    setShowConfetti,
    setBetOutcome,
  };
};
