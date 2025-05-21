import React from 'react';
import { motion } from 'framer-motion';
import useIntroScreen from '../../hooks/useIntroScreen';

/**
 * A button component that resets the intro screen state
 * Can be placed in settings, footer, or other areas
 */
const ResetIntroButton = ({ className = '', variant = 'default' }) => {
  const { resetIntro } = useIntroScreen();

  // Different style variants
  const variants = {
    default:
      'px-4 py-2 bg-gradient-to-r from-[#22AD74] to-[#26c582] text-white rounded-lg shadow-md hover:shadow-lg',
    text: 'text-[#22AD74] hover:text-[#26c582] hover:underline',
    small:
      'px-3 py-1 text-sm bg-[#22AD74]/10 text-[#22AD74] rounded hover:bg-[#22AD74]/20',
  };

  return (
    <motion.button
      className={`${variants[variant]} transition-all duration-300 ${className}`}
      onClick={resetIntro}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      Show Welcome Guide
    </motion.button>
  );
};

export default ResetIntroButton;
