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
    let intervalId;
    if (isRolling && !rolledNumber) {
      // Create a rolling effect by changing the number rapidly
      intervalId = setInterval(() => {
        setRandomDiceNumber(getRandomDiceNumber());
      }, 150); // Change number every 150ms for a realistic rolling effect
    }

    // Clean up interval
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRolling, rolledNumber]);

  // Handle the result when it arrives
  useEffect(() => {
    if (result) {
      // Extract the correct number from the result object
      // The gameState.lastResult object uses rolledNumber property from the smart contract event
      let resultNumber = null;

      if (result.rolledNumber !== undefined) {
        // Convert to number and ensure it's an integer
        resultNumber =
          typeof result.rolledNumber === 'string'
            ? parseInt(result.rolledNumber, 10)
            : Number(result.rolledNumber);
      } else if (result.number !== undefined) {
        resultNumber =
          typeof result.number === 'string'
            ? parseInt(result.number, 10)
            : Number(result.number);
      } else if (typeof result === 'number') {
        resultNumber = result;
      }

      // Validate the result number is not NaN
      if (isNaN(resultNumber)) {
        resultNumber = null;
      }

      // Immediately update the rolled number to update the dice face
      setRolledNumber(resultNumber);

      // Store the last valid rolled number (1-6)
      if (resultNumber >= 1 && resultNumber <= 6) {
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
      // If special result (254 or 255), show a default face or last rolled
      if (
        rolledNumber === RESULT_RECOVERED ||
        rolledNumber === RESULT_FORCE_STOPPED
      ) {
        // For special results, use the last valid dice number or default to 1
        return lastRolledNumber || 1;
      }

      // Make sure we only return valid dice numbers (1-6)
      if (rolledNumber >= 1 && rolledNumber <= 6) {
        return rolledNumber;
      }

      // For any other invalid number, show last valid roll or chosen number
      // First check if lastRolledNumber is valid (1-6)
      if (lastRolledNumber >= 1 && lastRolledNumber <= 6) {
        return lastRolledNumber;
      }

      // Then check if chosenNumber is valid (1-6)
      if (chosenNumber >= 1 && chosenNumber <= 6) {
        return chosenNumber;
      }

      // Last resort - just show 1
      return 1;
    }

    // If rolling but no result yet, show random number
    if (isRolling) {
      return randomDiceNumber;
    }

    // If we have a previous roll, show that number if it's valid
    if (lastRolledNumber >= 1 && lastRolledNumber <= 6) {
      return lastRolledNumber;
    }

    // If we have a chosen number, show that if it's valid
    if (chosenNumber >= 1 && chosenNumber <= 6) {
      return chosenNumber;
    }

    // Default to 1 as the safest option
    return 1;
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
