import { useState, useEffect, useCallback } from 'react';
import { useContractConstants } from './useContractConstants';
import { usePollingService } from '../services/pollingService.jsx';

/**
 * Custom hook to manage reactive dice number display
 *
 * @param {Object|null} result - The game result object
 * @param {Number|null} chosenNumber - The number chosen by the player
 * @param {Boolean} isRolling - Whether the dice is currently rolling
 * @returns {Object} - State and methods for dice number display
 */
export const useDiceNumber = (result, chosenNumber, isRolling) => {
  const { constants } = useContractConstants();
  const { gameStatus } = usePollingService();

  // State for dice number management
  const [randomDiceNumber, setRandomDiceNumber] = useState(1);
  const [rolledNumber, setRolledNumber] = useState(null);
  const [lastRolledNumber, setLastRolledNumber] = useState(null);
  const [betOutcome, setBetOutcome] = useState(null);
  const [showResultAnimation, setShowResultAnimation] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [processingVrf, setProcessingVrf] = useState(false);

  // Initialize state from game status on component mount
  useEffect(() => {
    if (gameStatus && gameStatus.isActive) {
      // If there's an active request that's not processed, we're waiting for VRF
      if (gameStatus.requestExists && !gameStatus.requestProcessed) {
        setProcessingVrf(true);
      }

      // If we have a chosen number from contract, update state
      if (gameStatus.chosenNumber) {
        // Store the chosen number as the last rolled number if we don't have a result yet
        setLastRolledNumber(gameStatus.chosenNumber);
      }
    }
  }, [gameStatus]);

  // Get random dice number within valid range
  const getRandomDiceNumber = useCallback(
    () =>
      Math.floor(
        Math.random() *
          (constants.MAX_DICE_NUMBER - constants.MIN_DICE_NUMBER + 1)
      ) + constants.MIN_DICE_NUMBER,
    [constants]
  );

  // Update random dice number when rolling
  useEffect(() => {
    let intervalId;
    let timeoutId;

    if (isRolling && !rolledNumber) {
      // Create a rolling effect by changing the number rapidly
      intervalId = setInterval(() => {
        setRandomDiceNumber(getRandomDiceNumber());
      }, 150); // Change number every 150ms for a realistic rolling effect

      // Automatically stop rolling after 15 seconds
      timeoutId = setTimeout(() => {
        if (intervalId) {
          clearInterval(intervalId);
        }
        // If we still don't have a result after 15 seconds, use the last random number
        if (!rolledNumber) {
          setProcessingVrf(false);
        }
      }, 15000); // 15 seconds maximum
    }

    // Clean up interval and timeout
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isRolling, rolledNumber, getRandomDiceNumber]);

  // Handle the result when it arrives
  useEffect(() => {
    if (result) {
      // Extract the correct number from the result object
      let resultNumber = null;

      if (result.rolledNumber !== undefined) {
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

      // Check if result indicates request is fulfilled
      const isRequestFulfilled = result.requestFulfilled === true;

      // Validate the result number is not NaN
      if (isNaN(resultNumber)) {
        resultNumber = null;
      }

      // Only stop VRF processing when we have a conclusive result
      // (valid rolledNumber or explicitly marked as fulfilled)
      if (
        (resultNumber !== null && resultNumber >= 1 && resultNumber <= 6) ||
        isRequestFulfilled
      ) {
        setProcessingVrf(false);
      }
      // Don't stop VRF if result explicitly indicates it's pending VRF
      else if (result.vrfPending) {
        setProcessingVrf(true);
      }

      // Only update the rolled number if we have a valid result or fulfilled request
      if (resultNumber !== null || isRequestFulfilled) {
        setRolledNumber(resultNumber);
      }

      // Store the last valid rolled number (1-6)
      if (
        resultNumber >= constants.MIN_DICE_NUMBER &&
        resultNumber <= constants.MAX_DICE_NUMBER
      ) {
        setLastRolledNumber(resultNumber);
      }

      // Determine win/lose status after a short delay
      setTimeout(() => {
        // Check if the result is a special code
        if (resultNumber === constants.RESULT_RECOVERED) {
          setBetOutcome('recovered');
        } else if (resultNumber === constants.RESULT_FORCE_STOPPED) {
          setBetOutcome('stopped');
        }
        // Check for normal rolls (1-6)
        else if (
          resultNumber >= constants.MIN_DICE_NUMBER &&
          resultNumber <= constants.MAX_DICE_NUMBER
        ) {
          if (resultNumber === chosenNumber) {
            setBetOutcome('win');
            setShowConfetti(true);
          } else {
            setBetOutcome('lose');
          }
        }
        // Any other unknown result
        else if (resultNumber !== null || isRequestFulfilled) {
          setBetOutcome('unknown');
        }

        // Always show result animation if we have a result or fulfilled request
        if (resultNumber !== null || isRequestFulfilled) {
          setShowResultAnimation(true);
        }
      }, 100);
    } else {
      // Reset state when no result, but keep lastRolledNumber
      setRolledNumber(null);
      setShowConfetti(false);
      setShowResultAnimation(false);
      setBetOutcome(null);
    }
  }, [result, chosenNumber, constants]);

  // Function to get the number to display on the dice
  const getDisplayNumber = () => {
    // If we have a result, show the actual rolled number
    if (rolledNumber !== null) {
      // If special result (254 or 255), show a default face or last rolled
      if (
        rolledNumber === constants.RESULT_RECOVERED ||
        rolledNumber === constants.RESULT_FORCE_STOPPED
      ) {
        // For special results, use the last valid dice number or default to 1
        return lastRolledNumber || constants.MIN_DICE_NUMBER;
      }

      // Make sure we only return valid dice numbers (1-6)
      if (
        rolledNumber >= constants.MIN_DICE_NUMBER &&
        rolledNumber <= constants.MAX_DICE_NUMBER
      ) {
        return rolledNumber;
      }

      // For any other invalid number, show last valid roll or chosen number
      if (
        lastRolledNumber >= constants.MIN_DICE_NUMBER &&
        lastRolledNumber <= constants.MAX_DICE_NUMBER
      ) {
        return lastRolledNumber;
      }

      if (
        chosenNumber >= constants.MIN_DICE_NUMBER &&
        chosenNumber <= constants.MAX_DICE_NUMBER
      ) {
        return chosenNumber;
      }

      // Last resort - show minimum number
      return constants.MIN_DICE_NUMBER;
    }

    // If rolling but no result yet, show random number
    if (isRolling) {
      return randomDiceNumber;
    }

    // If we have a previous roll, show that number if it's valid
    if (
      lastRolledNumber >= constants.MIN_DICE_NUMBER &&
      lastRolledNumber <= constants.MAX_DICE_NUMBER
    ) {
      return lastRolledNumber;
    }

    // If we have a chosen number, show that if it's valid
    if (
      chosenNumber >= constants.MIN_DICE_NUMBER &&
      chosenNumber <= constants.MAX_DICE_NUMBER
    ) {
      return chosenNumber;
    }

    // Default to minimum number
    return constants.MIN_DICE_NUMBER;
  };

  // Get text to display for special results
  const getSpecialResultText = () => {
    if (rolledNumber === constants.RESULT_RECOVERED) {
      return 'Game Recovered';
    }
    if (rolledNumber === constants.RESULT_FORCE_STOPPED) {
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
    processingVrf,

    // Methods
    getSpecialResultText,
    resetState,

    // Setters for external control
    setShowResultAnimation,
    setShowConfetti,
    setBetOutcome,
    setProcessingVrf,
  };
};
