import { useState, useEffect } from 'react';

/**
 * Custom hook to manage the intro screen visibility
 * @returns {Object} State and functions to manage intro screen visibility
 */
const useIntroScreen = () => {
  const [hasSeenIntro, setHasSeenIntro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if user has seen intro before
  useEffect(() => {
    const introSeen = localStorage.getItem('gama_dice_intro_seen');
    if (introSeen === 'true') {
      setHasSeenIntro(true);
    }
    setIsLoading(false);
  }, []);

  // Mark intro as seen and store in localStorage
  const completeIntro = () => {
    localStorage.setItem('gama_dice_intro_seen', 'true');
    setHasSeenIntro(true);
  };

  // Reset intro state (for testing or when features change)
  const resetIntro = () => {
    localStorage.removeItem('gama_dice_intro_seen');
    setHasSeenIntro(false);
  };

  return {
    hasSeenIntro,
    isLoading,
    completeIntro,
    resetIntro,
  };
};

export default useIntroScreen;
