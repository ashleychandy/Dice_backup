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
} from '@fortawesome/free-solid-svg-icons';

const IntroScreen = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 5; // Now we have 6 total steps (0-5)
  const [isRolling, setIsRolling] = useState(false);

  const nextStep = () => {
    // Start the transition animation
    setIsRolling(true);

    // After a delay, proceed to the next step
    setTimeout(() => {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        onComplete();
      }

      // Stop the animation after completing the transition
      setTimeout(() => {
        setIsRolling(false);
      }, 1200);
    }, 500);
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
        when: 'beforeChildren',
        staggerChildren: 0.2,
      },
    },
    exit: {
      opacity: 0,
      x: -50,
      transition: {
        duration: 0.5,
        ease: 'easeIn',
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Background gradient animation
  const backgroundVariants = {
    initial: {
      background:
        'linear-gradient(135deg, rgba(34,173,116,0.1) 0%, rgba(255,255,255,0.95) 100%)',
    },
    animate: {
      background:
        'linear-gradient(135deg, rgba(34,173,116,0.2) 0%, rgba(255,255,255,1) 100%)',
      transition: {
        duration: 3,
        repeat: Infinity,
        repeatType: 'reverse',
      },
    },
  };

  // Immediately on component mount, prevent scrolling
  useEffect(() => {
    // Save the original overflow style
    const originalStyle = window.getComputedStyle(document.body).overflow;
    // Prevent scrolling on the body
    document.body.style.overflow = 'hidden';

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="absolute inset-0 w-full h-full"
        variants={backgroundVariants}
        initial="initial"
        animate="animate"
      />

      {/* Enhanced decorative elements */}
      <motion.div
        className="absolute top-10 right-10 w-96 h-96 bg-[#22AD74]/10 rounded-full blur-3xl z-10"
        animate={{
          x: [0, 40, 0],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />
      <motion.div
        className="absolute bottom-10 left-10 w-64 h-64 bg-[#22AD74]/15 rounded-full blur-2xl z-10"
        animate={{
          y: [0, -30, 0],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />
      <motion.div
        className="absolute top-1/3 left-40 w-40 h-40 bg-[#22AD74]/10 rounded-full blur-xl z-10"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-[#22AD74]/8 rounded-full blur-xl z-10"
        animate={{
          scale: [1, 1.2, 1],
          y: [0, -20, 0],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />

      {/* Content container with solid background */}
      <div className="absolute inset-0 bg-white/95 backdrop-blur-xl border-y border-[#22AD74]/20 w-full h-full z-20 flex flex-col text-gray-800">
        {/* Inner scrollable content area */}
        <div className="flex-1 flex flex-col justify-between overflow-auto">
          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full px-4 py-8">
            <AnimatePresence mode="wait">
              {/* Welcome Page */}
              {currentStep === 0 && (
                <motion.div
                  key="step-0"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="text-center px-2 sm:px-4"
                >
                  <motion.h1
                    className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#22AD74] mb-4 md:mb-6"
                    variants={itemVariants}
                  >
                    Welcome to GAMA
                  </motion.h1>
                  <motion.p
                    className="text-lg sm:text-xl md:text-3xl text-gray-700 mb-6 md:mb-8"
                    variants={itemVariants}
                  >
                    A revolutionary blockchain game with{' '}
                    <span className="font-bold">zero house edge</span> and{' '}
                    <span className="font-bold">100% token burning</span>.
                  </motion.p>
                  <motion.div
                    variants={itemVariants}
                    className="mb-10 flex justify-center"
                  >
                    <button
                      onClick={nextStep}
                      className="px-8 py-4 md:px-10 md:py-5 bg-gradient-to-r from-[#22AD74] to-[#26c582] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg md:text-xl font-medium flex items-center gap-3"
                    >
                      Learn More
                      <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* How It Works Page */}
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.h2
                    className="text-4xl font-bold text-[#22AD74] mb-8 text-center"
                    variants={itemVariants}
                  >
                    <FontAwesomeIcon icon={faCubes} className="mr-3" />
                    How It Works
                  </motion.h2>

                  <div className="grid md:grid-cols-3 gap-8 mb-10">
                    <motion.div
                      variants={itemVariants}
                      className="bg-white/85 p-6 rounded-xl shadow-sm border border-[#22AD74]/20 flex flex-col items-center text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-[#22AD74] text-2xl mb-4">
                        1
                      </div>
                      <h3 className="text-xl font-semibold mb-3 text-gray-800">
                        Choose Your Number
                      </h3>
                      <p className="text-gray-700 text-lg">
                        Select any number from 1 to 6 for your bet.
                      </p>
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      className="bg-white/85 p-6 rounded-xl shadow-sm border border-[#22AD74]/20 flex flex-col items-center text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-[#22AD74] text-2xl mb-4">
                        2
                      </div>
                      <h3 className="text-xl font-semibold mb-3 text-gray-800">
                        Place Your Bet
                      </h3>
                      <p className="text-gray-700 text-lg">
                        Bet with GAMA tokens on the XDC blockchain.
                      </p>
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      className="bg-white/85 p-6 rounded-xl shadow-sm border border-[#22AD74]/20 flex flex-col items-center text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-[#22AD74] text-2xl mb-4">
                        3
                      </div>
                      <h3 className="text-xl font-semibold mb-3 text-gray-800">
                        Win 6X
                      </h3>
                      <p className="text-gray-700 text-lg">
                        Win 6X your bet if the result matches your number.
                      </p>
                    </motion.div>
                  </div>

                  <motion.div
                    variants={itemVariants}
                    className="flex justify-center mt-8"
                  >
                    <button
                      onClick={nextStep}
                      className="px-8 py-4 md:px-10 md:py-5 bg-gradient-to-r from-[#22AD74] to-[#26c582] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg md:text-xl font-medium flex items-center gap-3"
                    >
                      Next
                      <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* Tokenomics Page */}
              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.h2
                    className="text-4xl font-bold text-[#22AD74] mb-8 text-center"
                    variants={itemVariants}
                  >
                    <FontAwesomeIcon icon={faCoins} className="mr-3" />
                    Token Burning Mechanics
                  </motion.h2>

                  <motion.div
                    className="bg-white/85 p-8 rounded-xl shadow-sm border border-[#22AD74]/20 mb-10"
                    variants={itemVariants}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-[#22AD74]">
                        <FontAwesomeIcon icon={faCoins} size="lg" />
                      </div>
                      <h3 className="text-2xl font-bold text-[#22AD74]">
                        100% Token Burning
                      </h3>
                    </div>
                    <p className="text-gray-700 text-lg leading-relaxed">
                      <strong>Every single token</strong> you bet is permanently{' '}
                      <strong>burned</strong> from circulation. This creates
                      constant deflationary pressure, potentially increasing the
                      value of remaining tokens over time.
                    </p>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    className="flex justify-center mt-8"
                  >
                    <button
                      onClick={nextStep}
                      className="px-8 py-4 md:px-10 md:py-5 bg-gradient-to-r from-[#22AD74] to-[#26c582] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg md:text-xl font-medium flex items-center gap-3"
                    >
                      Next
                      <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* Zero House Edge Page */}
              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.h2
                    className="text-4xl font-bold text-[#22AD74] mb-8 text-center"
                    variants={itemVariants}
                  >
                    <FontAwesomeIcon icon={faPercentage} className="mr-3" />
                    Zero House Edge
                  </motion.h2>

                  <motion.div
                    className="bg-white/85 p-8 rounded-xl shadow-sm border border-[#22AD74]/20 mb-10"
                    variants={itemVariants}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-[#22AD74]">
                        <FontAwesomeIcon icon={faPercentage} size="lg" />
                      </div>
                      <h3 className="text-2xl font-bold text-[#22AD74]">
                        0% House Edge
                      </h3>
                    </div>
                    <p className="text-gray-700 text-lg leading-relaxed">
                      Unlike traditional casinos that take a percentage, GAMA
                      operates with <strong>absolutely no house edge</strong>.
                      100% of potential winnings go back to players, giving you
                      better odds than any traditional casino.
                    </p>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    className="flex justify-center mt-8"
                  >
                    <button
                      onClick={nextStep}
                      className="px-8 py-4 md:px-10 md:py-5 bg-gradient-to-r from-[#22AD74] to-[#26c582] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg md:text-xl font-medium flex items-center gap-3"
                    >
                      Next
                      <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* Blockchain Security Page */}
              {currentStep === 4 && (
                <motion.div
                  key="step-4"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.h2
                    className="text-4xl font-bold text-[#22AD74] mb-8 text-center"
                    variants={itemVariants}
                  >
                    <FontAwesomeIcon icon={faShield} className="mr-3" />
                    100% On-Chain Security
                  </motion.h2>

                  <motion.div
                    className="grid md:grid-cols-2 gap-8 mb-10"
                    variants={itemVariants}
                  >
                    <div className="bg-white/85 p-8 rounded-xl shadow-sm border border-[#22AD74]/20">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-[#22AD74]">
                          <FontAwesomeIcon icon={faRandom} size="lg" />
                        </div>
                        <h3 className="text-2xl font-bold text-[#22AD74]">
                          Verifiable Random Function
                        </h3>
                      </div>
                      <p className="text-gray-700 text-lg leading-relaxed">
                        All results use blockchain's built-in{' '}
                        <strong>VRF (Verifiable Random Function)</strong> to
                        generate truly random and tamper-proof outcomes.
                      </p>
                    </div>

                    <div className="bg-white/85 p-8 rounded-xl shadow-sm border border-[#22AD74]/20">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-[#22AD74]">
                          <FontAwesomeIcon
                            icon={faServer}
                            size="lg"
                            className="opacity-70 relative"
                          >
                            <FontAwesomeIcon
                              icon={faLock}
                              size="xs"
                              className="absolute text-red-600"
                              transform="rotate--45 shrink-6"
                            />
                          </FontAwesomeIcon>
                        </div>
                        <h3 className="text-2xl font-bold text-[#22AD74]">
                          No Servers Involved
                        </h3>
                      </div>
                      <p className="text-gray-700 text-lg leading-relaxed">
                        <strong>
                          All game logic and calculations happen 100% on-chain
                        </strong>
                        . No centralized servers are ever involved in
                        determining game outcomes.
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    className="flex justify-center mt-8"
                  >
                    <button
                      onClick={nextStep}
                      className="px-8 py-4 md:px-10 md:py-5 bg-gradient-to-r from-[#22AD74] to-[#26c582] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg md:text-xl font-medium flex items-center gap-3"
                    >
                      Next
                      <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* Ready to Play Page */}
              {currentStep === 5 && (
                <motion.div
                  key="step-5"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="text-center"
                >
                  <motion.h2
                    className="text-4xl font-bold text-[#22AD74] mb-6"
                    variants={itemVariants}
                  >
                    Ready to Play?
                  </motion.h2>

                  <motion.p
                    className="text-2xl text-gray-700 mb-8 max-w-3xl mx-auto"
                    variants={itemVariants}
                  >
                    Connect your wallet to start playing on the world's fairest
                    blockchain game.
                  </motion.p>

                  <motion.div
                    variants={itemVariants}
                    className="bg-white/85 p-6 rounded-xl border border-[#22AD74]/20 max-w-xl mx-auto mb-8"
                  >
                    <ul className="flex flex-col gap-3">
                      <li className="flex items-center gap-3 text-left text-lg text-gray-700">
                        <FontAwesomeIcon
                          icon={faCoins}
                          className="text-[#22AD74]"
                        />
                        <span>
                          <strong>100% of tokens</strong> from bets are burned
                        </span>
                      </li>
                      <li className="flex items-center gap-3 text-left text-lg text-gray-700">
                        <FontAwesomeIcon
                          icon={faPercentage}
                          className="text-[#22AD74]"
                        />
                        <span>
                          <strong>0% house edge</strong> for the fairest odds
                          possible
                        </span>
                      </li>
                      <li className="flex items-center gap-3 text-left text-lg text-gray-700">
                        <FontAwesomeIcon
                          icon={faRandom}
                          className="text-[#22AD74]"
                        />
                        <span>
                          <strong>Verifiable random outcomes</strong> through
                          blockchain VRF
                        </span>
                      </li>
                      <li className="flex items-center gap-3 text-left text-lg text-gray-700">
                        <FontAwesomeIcon
                          icon={faServer}
                          className="text-[#22AD74]"
                        />
                        <span>
                          <strong>No servers</strong> or centralized
                          infrastructure involved
                        </span>
                      </li>
                    </ul>
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    className="flex justify-center"
                  >
                    <button
                      onClick={onComplete}
                      className="px-8 py-4 md:px-12 md:py-6 bg-gradient-to-r from-[#22AD74] to-[#26c582] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-xl md:text-2xl font-medium flex items-center gap-3"
                    >
                      Enter GAMA
                      <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-center py-6 gap-3">
            {[0, 1, 2, 3, 4, 5].map(step => (
              <motion.div
                key={step}
                className={`h-3 rounded-full ${
                  step <= currentStep ? 'bg-[#22AD74]' : 'bg-[#22AD74]/20'
                }`}
                initial={{ width: 20 }}
                animate={{
                  width: step === currentStep ? 40 : 20,
                  transition: { duration: 0.3 },
                }}
                onClick={() => setCurrentStep(step)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default IntroScreen;
