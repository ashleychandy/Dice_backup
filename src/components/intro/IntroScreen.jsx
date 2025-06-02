import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCubes,
  faChartLine,
  faArrowRight,
  faCoins,
  faShield,
  faServer,
  faLock,
  faPercentage,
  faRandom,
  faPlay,
  faInfoCircle,
  faDice,
  faFire,
  faBolt,
} from '@fortawesome/free-solid-svg-icons';

// Custom background patterns inspired by ReactBits
const BackgroundPatterns = {
  Gradient: ({ className }) => (
    <div className={`absolute inset-0 z-0 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-teal-500/10 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/10 via-cyan-700/5 to-transparent"></div>
    </div>
  ),

  Grid: ({ className }) => (
    <div className={`absolute inset-0 z-0 ${className}`}>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px]"></div>
    </div>
  ),

  Dots: ({ className }) => (
    <div className={`absolute inset-0 z-0 opacity-50 ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, #22AD74 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      ></div>
    </div>
  ),

  Noise: ({ className }) => (
    <div className={`absolute inset-0 z-0 opacity-40 ${className}`}>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]"></div>
    </div>
  ),
};

// Custom animated shapes component
const AnimatedShapes = () => (
  <>
    {/* Large circle */}
    <motion.div
      className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-300/5 blur-2xl"
      animate={{
        scale: [1, 1.1, 1],
        opacity: [0.5, 0.7, 0.5],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        repeatType: 'reverse',
      }}
    />

    {/* Medium circle */}
    <motion.div
      className="absolute -left-20 bottom-40 w-72 h-72 rounded-full bg-gradient-to-tr from-emerald-500/20 to-cyan-400/10 blur-2xl"
      animate={{
        scale: [1, 1.15, 1],
        opacity: [0.4, 0.6, 0.4],
      }}
      transition={{
        duration: 7,
        repeat: Infinity,
        repeatType: 'reverse',
        delay: 1,
      }}
    />

    {/* Small circle */}
    <motion.div
      className="absolute right-40 bottom-20 w-48 h-48 rounded-full bg-gradient-to-bl from-teal-400/20 to-emerald-300/10 blur-xl"
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        repeatType: 'reverse',
        delay: 2,
      }}
    />

    {/* Dice shape */}
    <motion.div
      className="absolute right-40 top-40 w-24 h-24 rounded-lg bg-[#22AD74]/20 backdrop-blur-md border border-[#22AD74]/30"
      animate={{
        rotate: [0, 10, 0, -10, 0],
        y: [0, -10, 0],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        repeatType: 'loop',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center text-[#22AD74]">
        <FontAwesomeIcon icon={faDice} size="lg" />
      </div>
    </motion.div>
  </>
);

// Main IntroScreen component
const IntroScreen = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 5;
  const [isAnimating, setIsAnimating] = useState(false);

  // Prevent scrolling on component mount
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const nextStep = () => {
    setIsAnimating(true);
    setTimeout(() => {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        onComplete();
      }
      setTimeout(() => setIsAnimating(false), 500);
    }, 300);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } },
    exit: { opacity: 0, transition: { duration: 0.4 } },
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.4,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Content for each step
  const steps = [
    // Welcome step
    {
      title: 'Welcome to GAMA',
      subtitle:
        'A revolutionary blockchain game with zero house edge and 100% token burning.',
      content: (
        <motion.div variants={itemVariants} className="text-center">
          <motion.div
            className="w-32 h-32 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-400/20 backdrop-blur-md flex items-center justify-center text-5xl text-[#22AD74] border border-emerald-500/30 shadow-lg"
            animate={{
              rotate: [0, 5, 0, -5, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          >
            <FontAwesomeIcon icon={faDice} />
          </motion.div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Enter the future of blockchain gaming with GAMA - where fairness is
            guaranteed by code and every bet creates deflationary pressure on
            the token supply.
          </p>
        </motion.div>
      ),
      backgroundType: 'Gradient',
    },

    // How It Works step
    {
      title: 'How It Works',
      subtitle: 'Simple, transparent, and fair gameplay',
      content: (
        <motion.div
          variants={itemVariants}
          className="grid md:grid-cols-3 gap-6"
        >
          {[
            {
              icon: faDice,
              title: 'Choose Your Number',
              description: 'Select any number from 1 to 6 for your bet.',
            },
            {
              icon: faCoins,
              title: 'Place Your Bet',
              description: 'Bet with GAMA tokens on the XDC blockchain.',
            },
            {
              icon: faFire,
              title: 'Win 6X',
              description: 'Win 6X your bet if the result matches your number.',
            },
          ].map((item, index) => (
            <motion.div
              key={index}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl"
              whileHover={{
                scale: 1.03,
                backgroundColor: 'rgba(255,255,255,0.15)',
              }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-400/20 flex items-center justify-center text-[#22AD74] text-2xl mb-4 border border-emerald-500/30">
                <FontAwesomeIcon icon={item.icon} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-emerald-800">
                {item.title}
              </h3>
              <p className="text-gray-600">{item.description}</p>
            </motion.div>
          ))}
        </motion.div>
      ),
      backgroundType: 'Grid',
    },

    // Token Burning step
    {
      title: 'Token Burning Mechanics',
      subtitle: 'Every bet reduces total supply forever',
      content: (
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row gap-6 items-center"
        >
          <div className="flex-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-400/20 flex items-center justify-center text-[#22AD74]">
                  <FontAwesomeIcon icon={faFire} />
                </div>
                <h3 className="text-2xl font-bold text-emerald-800">
                  100% Token Burning
                </h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                <strong>Every single token</strong> you bet is permanently{' '}
                <strong>burned</strong> from circulation. This creates constant
                deflationary pressure, potentially increasing the value of
                remaining tokens over time.
              </p>
            </div>
          </div>
          <div className="flex-1">
            <motion.div
              className="relative w-full aspect-square max-w-xs"
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3/4 h-3/4 rounded-full border-4 border-dashed border-emerald-500/30"></div>
              </div>
              <motion.div
                className="absolute top-1/2 left-1/2 w-16 h-16 -ml-8 -mt-8 bg-gradient-to-br from-orange-500/90 to-red-600/90 rounded-full flex items-center justify-center text-white shadow-lg"
                animate={{
                  scale: [1, 1.1, 1],
                  filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
              >
                <FontAwesomeIcon icon={faFire} size="lg" />
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1/2 h-1/2 rounded-full border-2 border-dashed border-emerald-500/20"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1/3 h-1/3 rounded-full border border-emerald-500/10"></div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ),
      backgroundType: 'Dots',
    },

    // Zero House Edge step
    {
      title: 'Zero House Edge',
      subtitle: 'Your odds are better than any traditional casino',
      content: (
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row gap-6 items-center"
        >
          <div className="flex-1 order-2 md:order-1">
            <motion.div className="relative w-full aspect-square max-w-xs mx-auto">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-3/4 h-3/4">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/20 to-transparent border border-emerald-500/30"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-emerald-800 text-5xl font-bold">
                    0%
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          <div className="flex-1 order-1 md:order-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-400/20 flex items-center justify-center text-[#22AD74]">
                  <FontAwesomeIcon icon={faPercentage} />
                </div>
                <h3 className="text-2xl font-bold text-emerald-800">
                  0% House Edge
                </h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Unlike traditional casinos that take a percentage, GAMA operates
                with <strong>absolutely no house edge</strong>. 100% of
                potential winnings go back to players, giving you better odds
                than any traditional casino.
              </p>
            </div>
          </div>
        </motion.div>
      ),
      backgroundType: 'Noise',
    },

    // Security step
    {
      title: '100% On-Chain Security',
      subtitle: 'Fully transparent and tamper-proof',
      content: (
        <motion.div
          variants={itemVariants}
          className="grid md:grid-cols-2 gap-6"
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-400/20 flex items-center justify-center text-[#22AD74]">
                <FontAwesomeIcon icon={faRandom} />
              </div>
              <h3 className="text-xl font-bold text-emerald-800">
                Verifiable Random Function
              </h3>
            </div>
            <p className="text-gray-600">
              All results use blockchain's built-in{' '}
              <strong>VRF (Verifiable Random Function)</strong> to generate
              truly random and tamper-proof outcomes.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-400/20 flex items-center justify-center text-[#22AD74]">
                <FontAwesomeIcon icon={faServer} />
              </div>
              <h3 className="text-xl font-bold text-emerald-800">
                No Servers Involved
              </h3>
            </div>
            <p className="text-gray-600">
              <strong>
                All game logic and calculations happen 100% on-chain
              </strong>
              . No centralized servers are ever involved in determining game
              outcomes.
            </p>
          </div>
        </motion.div>
      ),
      backgroundType: 'Grid',
    },

    // Ready to Play step
    {
      title: 'Ready to Play?',
      subtitle: 'Connect your wallet to start',
      content: (
        <motion.div variants={itemVariants} className="text-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl max-w-xl mx-auto mb-8">
            <ul className="flex flex-col gap-3">
              {[
                {
                  icon: faFire,
                  text: '<strong>100% of tokens</strong> from bets are burned',
                },
                {
                  icon: faPercentage,
                  text: '<strong>0% house edge</strong> for the fairest odds possible',
                },
                {
                  icon: faRandom,
                  text: '<strong>Verifiable random outcomes</strong> through blockchain VRF',
                },
                {
                  icon: faServer,
                  text: '<strong>No servers</strong> or centralized infrastructure involved',
                },
              ].map((item, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 text-left text-gray-600"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-400/20 flex items-center justify-center text-[#22AD74]">
                    <FontAwesomeIcon icon={item.icon} />
                  </div>
                  <span dangerouslySetInnerHTML={{ __html: item.text }}></span>
                </li>
              ))}
            </ul>
          </div>
          <motion.button
            className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl shadow-lg text-xl font-medium flex items-center gap-3 mx-auto"
            whileHover={{
              scale: 1.05,
              boxShadow: '0 10px 25px -5px rgba(34, 173, 116, 0.5)',
            }}
            whileTap={{ scale: 0.98 }}
            onClick={onComplete}
          >
            Enter GAMA
            <FontAwesomeIcon icon={faArrowRight} />
          </motion.button>
        </motion.div>
      ),
      backgroundType: 'Gradient',
    },
  ];

  const currentStepData = steps[currentStep];

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 to-white">
        {/* Dynamic background pattern based on current step */}
        {currentStepData.backgroundType === 'Gradient' && (
          <BackgroundPatterns.Gradient />
        )}
        {currentStepData.backgroundType === 'Grid' && (
          <BackgroundPatterns.Grid />
        )}
        {currentStepData.backgroundType === 'Dots' && (
          <BackgroundPatterns.Dots />
        )}
        {currentStepData.backgroundType === 'Noise' && (
          <BackgroundPatterns.Noise />
        )}

        {/* Animated decorative shapes */}
        <AnimatedShapes />
      </div>

      {/* Main content container */}
      <div className="relative z-30 w-full max-w-7xl mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Header with logo/title */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-white mr-3">
              <FontAwesomeIcon icon={faDice} />
            </div>
            <span className="text-2xl font-bold text-emerald-800">GAMA</span>
          </div>
          <div className="text-emerald-800">
            {currentStep < totalSteps ? (
              <button
                onClick={onComplete}
                className="text-sm font-medium hover:underline"
              >
                Skip Intro
              </button>
            ) : null}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`step-${currentStep}`}
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="py-8"
            >
              <motion.h2
                variants={itemVariants}
                className="text-4xl md:text-5xl font-bold text-emerald-800 mb-3 text-center"
              >
                {currentStepData.title}
              </motion.h2>

              <motion.p
                variants={itemVariants}
                className="text-xl text-gray-600 mb-10 text-center"
              >
                {currentStepData.subtitle}
              </motion.p>

              <motion.div variants={itemVariants} className="mb-12">
                {currentStepData.content}
              </motion.div>

              {currentStep < totalSteps && (
                <motion.div
                  variants={itemVariants}
                  className="flex justify-center mt-4"
                >
                  <motion.button
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl shadow-lg text-lg font-medium flex items-center gap-3"
                    whileHover={{
                      scale: 1.05,
                      boxShadow: '0 10px 25px -5px rgba(34, 173, 116, 0.4)',
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={nextStep}
                    disabled={isAnimating}
                  >
                    Continue
                    <FontAwesomeIcon icon={faArrowRight} />
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2 py-6">
          {steps.map((_, index) => (
            <motion.button
              key={index}
              className="w-3 h-3 rounded-full bg-emerald-800/20 focus:outline-none"
              animate={{
                backgroundColor:
                  index === currentStep
                    ? 'rgb(6, 78, 59)' // emerald-900
                    : index < currentStep
                      ? 'rgb(5, 150, 105, 0.5)' // emerald-600/50
                      : 'rgb(6, 78, 59, 0.2)', // emerald-900/20
                scale: index === currentStep ? 1.2 : 1,
              }}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default IntroScreen;
