import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Import components
import GameStats from '../components/dice/GameStats';
import GameHistory from '../components/dice/GameHistory';
import BetInput from '../components/dice/BetInput';
import BalancePanel from '../components/dice/BalancePanel';
import DiceVisualizer from '../components/dice/DiceVisualizer';
import NumberSelector from '../components/dice/NumberSelector';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import FilterButton from '../components/ui/FilterButton';

// Import custom hooks
import useGameLogic from '../hooks/useGameLogic';

import '../index.css';

const DicePage = ({ contracts, account, onError, addToast }) => {
  const [showStats, setShowStats] = useState(false);

  // Use our custom game logic hook
  const {
    chosenNumber,
    betAmount,
    gameState,
    balanceData,
    balanceLoading,
    hasNoTokens,
    needsApproval,
    setChosenNumber,
    setBetAmount,
    handleApproveToken,
    handlePlaceBet,
  } = useGameLogic(contracts, account, onError, addToast);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gradient-gaming mb-4">
            Dice Game
          </h1>
          <p className="text-secondary-400 text-lg">
            Choose a number, place your bet, and test your luck!
          </p>
        </div>

        {balanceLoading && (
          <div className="glass-panel p-4">
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="small" />
              <span className="text-secondary-400">Updating balance...</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="glass-panel p-8">
              <h2 className="text-2xl font-bold mb-8 text-white/90">
                Place Your Bet
              </h2>

              <div className="mb-8">
                <NumberSelector
                  value={chosenNumber}
                  onChange={setChosenNumber}
                  disabled={gameState.isProcessing}
                />
              </div>

              <div className="mb-8">
                <BetInput
                  value={betAmount}
                  onChange={setBetAmount}
                  userBalance={balanceData?.balance.toString() || '0'}
                  disabled={gameState.isProcessing || hasNoTokens}
                  diceContract={contracts?.dice}
                />
                {hasNoTokens && (
                  <p className="text-red-500 mt-2 text-sm">
                    You don&apos;t have any tokens to play. Please acquire
                    tokens first.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {needsApproval && (
                  <button
                    onClick={handleApproveToken}
                    disabled={gameState.isProcessing}
                    className="btn-gaming h-14 w-full"
                  >
                    {gameState.isProcessing ? (
                      <span className="flex items-center justify-center">
                        <LoadingSpinner size="small" />
                        <span className="ml-2">Approving...</span>
                      </span>
                    ) : (
                      'Approve Tokens'
                    )}
                  </button>
                )}

                <button
                  onClick={handlePlaceBet}
                  disabled={
                    !chosenNumber ||
                    betAmount <= BigInt(0) ||
                    (balanceData?.allowance || BigInt(0)) < betAmount ||
                    gameState.isProcessing ||
                    !contracts?.dice
                  }
                  className="btn-gaming h-14 w-full"
                >
                  {gameState.isProcessing ? (
                    <span className="flex items-center justify-center">
                      <LoadingSpinner size="small" />
                      <span className="ml-2">
                        {gameState.isRolling
                          ? 'Rolling Dice...'
                          : 'Processing...'}
                      </span>
                    </span>
                  ) : (
                    'Roll Dice'
                  )}
                </button>
              </div>
            </div>

            <div className="glass-panel p-8">
              <h2 className="text-2xl font-bold mb-6 text-white/90">
                Game Visualization
              </h2>
              <DiceVisualizer
                isRolling={gameState.isRolling}
                rolledNumber={gameState.lastResult}
                chosenNumber={chosenNumber}
              />
            </div>
          </div>

          <div className="space-y-8">
            <div className="glass-panel p-8">
              <h2 className="text-2xl font-bold mb-6 text-white/90">
                Your Balance
              </h2>
              <BalancePanel
                userBalance={balanceData?.balance || BigInt(0)}
                isLoading={balanceLoading}
                account={account}
                contracts={contracts}
              />
            </div>

            <div className="glass-panel p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white/90">
                  {showStats ? 'Game Stats' : 'Game History'}
                </h2>
                <FilterButton
                  onClick={() => setShowStats(!showStats)}
                  isActive={showStats}
                  text={showStats ? 'View History' : 'View Stats'}
                />
              </div>

              <AnimatePresence mode="wait">
                {showStats ? (
                  <motion.div
                    key="stats"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <GameStats
                      account={account}
                      diceContract={contracts?.dice}
                      onError={onError}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <GameHistory
                      account={account}
                      diceContract={contracts?.dice}
                      onError={onError}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DicePage;
