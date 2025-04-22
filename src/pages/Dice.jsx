import React, { useState, useEffect, useCallback } from 'react';
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
  const [lastBetAmount, setLastBetAmount] = useState(null);

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

  // When bet is placed, immediately update UI with the result
  useEffect(() => {
    if (gameState.lastResult && window.addNewGameResult) {
      // Add this game to history for instant display
      window.addNewGameResult({
        timestamp: Math.floor(Date.now() / 1000).toString(),
        chosenNumber: chosenNumber?.toString() || '0',
        rolledNumber: gameState.lastResult.rolledNumber?.toString() || '0',
        amount: betAmount.toString(),
        payout: gameState.lastResult.payout?.toString() || '0',
        isWin: gameState.lastResult.isWin,
        isRecovered: false,
        isForceStopped: false,
        isSpecialResult: false,
      });
    }
  }, [gameState.lastResult, chosenNumber, betAmount]);

  // Store last bet amount when a bet is placed
  useEffect(() => {
    if (betAmount > BigInt(0) && !gameState.isProcessing) {
      setLastBetAmount(betAmount);
    }
  }, [betAmount, gameState.isProcessing]);

  // Handle repeat last bet
  const handleRepeatLastBet = useCallback(() => {
    if (lastBetAmount) {
      setBetAmount(lastBetAmount);
    }
  }, [lastBetAmount, setBetAmount]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* DEBUG INFO */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 mb-6 rounded relative">
          <strong className="font-bold">Debug Info:</strong>
          <div className="text-sm mt-2">
            <p>Account: {account || 'Not connected'}</p>
            <p>
              Token Contract:{' '}
              {contracts?.token
                ? contracts.token.target ||
                  contracts.token.address ||
                  'Available'
                : 'Not initialized'}
            </p>
            <p>
              Dice Contract:{' '}
              {contracts?.dice
                ? contracts.dice.target || contracts.dice.address || 'Available'
                : 'Not initialized'}
            </p>
            <p>
              Balance:{' '}
              {balanceData?.balance ? balanceData.balance.toString() : 'N/A'}
            </p>
            <p>
              Allowance:{' '}
              {balanceData?.allowance
                ? balanceData.allowance.toString()
                : 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Network switcher for when contracts aren't initialized */}
      {account && (!contracts?.token || !contracts?.dice) && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 mb-6 rounded relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <strong className="font-bold">Contract Connection Issue:</strong>
              <p className="text-sm mt-1">
                Your wallet is connected, but the game contracts aren&apos;t
                initialized. This usually means you need to switch to the
                Apothem testnet.
              </p>
            </div>
            <div className="mt-3 md:mt-0 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  // Switch to Apothem
                  const hexChainId = `0x${Number(51).toString(16)}`;
                  try {
                    // Check for provider
                    if (window.ethereum) {
                      window.ethereum
                        .request({
                          method: 'wallet_switchEthereumChain',
                          params: [{ chainId: hexChainId }],
                        })
                        .catch(error => {
                          // If network doesn't exist, try to add it
                          if (error.code === 4902 || error.code === -32603) {
                            window.ethereum.request({
                              method: 'wallet_addEthereumChain',
                              params: [
                                {
                                  chainId: hexChainId,
                                  chainName: 'XDC Apothem Testnet',
                                  rpcUrls: ['https://rpc.apothem.network'],
                                  nativeCurrency: {
                                    name: 'XDC',
                                    symbol: 'XDC',
                                    decimals: 18,
                                  },
                                  blockExplorerUrls: [
                                    'https://explorer.apothem.network',
                                  ],
                                },
                              ],
                            });
                          }
                        });
                    }
                  } catch (err) {
                    console.error('Error switching network:', err);
                  }
                }}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Switch to Apothem
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gaming-primary to-gaming-primary-light mb-4">
            Dice Game
          </h1>
          <p className="text-secondary-700 text-lg max-w-2xl mx-auto">
            Choose a number, place your bet, and test your luck! Win up to 6x
            your bet amount.
          </p>
        </div>

        {balanceLoading && (
          <div className="bg-white p-4 rounded-lg border border-secondary-200 shadow-sm">
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="small" />
              <span className="text-secondary-700">Updating balance...</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main betting column */}
          <div className="lg:col-span-7 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white backdrop-blur-md rounded-xl border border-secondary-200 p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-secondary-800">
                  Place Your Bet
                </h2>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm text-green-600">Live Game</span>
                </div>
              </div>

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
                  lastBetAmount={lastBetAmount}
                  onRepeatLastBet={handleRepeatLastBet}
                />
                {hasNoTokens && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-red-500 mr-2"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-red-700 text-sm">
                        You don&apos;t have any tokens to play. Please acquire
                        tokens first.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {needsApproval && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleApproveToken}
                    disabled={gameState.isProcessing}
                    className="h-14 w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium rounded-lg transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {gameState.isProcessing ? (
                      <span className="flex items-center justify-center">
                        <LoadingSpinner size="small" />
                        <span className="ml-2">Approving...</span>
                      </span>
                    ) : (
                      'Approve Tokens'
                    )}
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    console.log('Roll Dice button clicked - state:', {
                      chosenNumber,
                      betAmount: betAmount.toString(),
                      isProcessing: gameState.isProcessing,
                      hasToken: Boolean(contracts?.token),
                      hasDice: Boolean(contracts?.dice),
                      allowance: balanceData?.allowance
                        ? balanceData.allowance.toString()
                        : 'N/A',
                    });
                    handlePlaceBet();
                  }}
                  disabled={
                    !chosenNumber ||
                    betAmount <= BigInt(0) ||
                    (balanceData?.allowance || BigInt(0)) < betAmount ||
                    gameState.isProcessing ||
                    !contracts?.dice
                  }
                  className="h-14 w-full font-medium rounded-lg transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
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
                    <span className="flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Roll Dice
                    </span>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-5 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white backdrop-blur-md rounded-xl border border-secondary-200 p-6 shadow-xl flex flex-col items-center justify-center"
            >
              <h2 className="text-2xl font-bold mb-2 text-secondary-800 text-center">
                Game Visualization
              </h2>
              <p className="text-secondary-600 text-sm mb-4 text-center">
                {chosenNumber
                  ? `You selected number ${chosenNumber}`
                  : 'Select a number to start'}
              </p>
              <DiceVisualizer
                isRolling={gameState.isRolling}
                result={gameState.lastResult}
                chosenNumber={chosenNumber}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white backdrop-blur-md rounded-xl border border-secondary-200 p-6 shadow-xl"
            >
              <h2 className="text-2xl font-bold mb-6 text-secondary-800">
                Your Balance
              </h2>
              <BalancePanel
                userBalance={balanceData?.balance || BigInt(0)}
                allowance={balanceData?.allowance || BigInt(0)}
                potentialWinnings={
                  balanceData?.balance
                    ? balanceData.balance * BigInt(6)
                    : BigInt(0)
                }
                betAmount={betAmount}
                isLoading={balanceLoading}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white backdrop-blur-md rounded-xl border border-secondary-200 p-6 shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-secondary-800">
                  {showStats ? 'Game Stats' : 'Game History'}
                </h2>
                <FilterButton
                  onClick={() => setShowStats(!showStats)}
                  active={showStats}
                >
                  {showStats ? 'View History' : 'View Stats'}
                </FilterButton>
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
                      addToast={addToast}
                      key={`gamestats-${!!contracts?.dice}`}
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
            </motion.div>
          </div>
        </div>

        {/* Game rules and odds */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-white backdrop-blur-md rounded-xl border border-secondary-200 p-6 shadow-xl"
        >
          <h2 className="text-2xl font-bold mb-4 text-secondary-800">
            Game Rules & Odds
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-gaming-primary">
                How to Play
              </h3>
              <ul className="list-disc list-inside space-y-2 text-secondary-700">
                <li>Choose a number between 1 and 6</li>
                <li>Enter your bet amount</li>
                <li>Click &quot;Roll Dice&quot; to play</li>
                <li>
                  If the dice rolls your number, you win 6x your bet amount
                </li>
                <li>
                  The game uses on-chain randomness for fair and transparent
                  results
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2 text-gaming-primary">
                Odds & Payouts
              </h3>
              <div className="space-y-2 text-secondary-700">
                <p>
                  For each number, you have a 1 in 6 chance of winning (16.67%).
                </p>
                <p>
                  Winning rolls pay 6x your bet amount, giving the game a 0%
                  house edge.
                </p>
                <p className="text-sm text-secondary-500 italic">
                  Note: Blockchain transaction fees apply to all bets.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DicePage;
