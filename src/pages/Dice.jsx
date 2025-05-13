import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import { faRandom } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Import components
import BalancePanel from '../components/dice/BalancePanel';
import BetInput from '../components/dice/BetInput';
import DiceVisualizer from '../components/dice/DiceVisualizer';
import LatestBet from '../components/dice/LatestBet';
import GameHistory from '../components/dice/GameHistory';
import NumberSelector from '../components/dice/NumberSelector';
import FilterButton from '../components/ui/FilterButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { VrfRecoveryModal } from '../components/vrf';
import { useWallet } from '../components/wallet/WalletProvider.jsx';
import ApprovalGuide from '../components/dice/ApprovalGuide';

// Import custom hooks
import useGameLogic from '../hooks/useGameLogic';
import { useGameStatus } from '../hooks/useGameStatus';

import '../index.css';

const WelcomeBanner = ({ onConnectClick }) => (
  <div className="bg-gradient-to-r from-gaming-primary/10 to-gaming-primary-light/10 rounded-xl p-6 shadow-sm border border-gaming-primary/20 mb-8">
    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
      <div>
        <h2 className="text-2xl font-bold text-secondary-800 mb-2">
          Welcome to XDC Dice Game!
        </h2>
        <p className="text-secondary-600 mb-4">
          Choose a number, place your bet, and roll the dice for a chance to win
          up to 6x your stake.
        </p>
        <ul className="list-disc list-inside text-sm text-secondary-600 mb-4 space-y-1">
          <li>Connect your XDC wallet to start playing</li>
          <li>Bet with GAMA tokens on your chosen number</li>
          <li>Win instantly when the dice rolls your number</li>
        </ul>
      </div>
      <div className="flex-shrink-0">
        <button
          onClick={onConnectClick}
          className="px-6 py-3 bg-gaming-primary text-white rounded-lg shadow-md hover:bg-gaming-primary-dark transition-all duration-300 font-medium flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z"
              clipRule="evenodd"
            />
          </svg>
          Connect Wallet
        </button>
      </div>
    </div>
  </div>
);

const DicePage = ({ contracts, account, onError, addToast }) => {
  const [lastBetAmount, setLastBetAmount] = useState(null);
  const [lastBetDetails, setLastBetDetails] = useState(null);
  const queryClient = useQueryClient();
  const [isVrfModalOpen, setIsVrfModalOpen] = useState(false);
  const { connectWallet, isWalletConnected } = useWallet();

  // Get game status for VRF recovery
  const { gameStatus, refetch: refetchGameStatus } = useGameStatus();

  // Determine if the VRF recovery button should be shown
  const showVrfButton =
    gameStatus?.isActive &&
    (gameStatus?.recoveryEligible ||
      (gameStatus?.lastPlayTimestamp &&
        gameStatus?.requestExists &&
        Math.floor(Date.now() / 1000) - gameStatus.lastPlayTimestamp > 120));

  // Create a global function to invalidate game history
  useEffect(() => {
    // Centralized function to refresh all data after wallet connection
    window.refreshAllData = accountAddress => {
      // If no account is provided, use the current one
      const targetAccount = accountAddress || account;
      if (targetAccount) {
        console.log('Refreshing all data for account:', targetAccount);

        // Refresh game history
        queryClient.invalidateQueries(['gameHistory', targetAccount]);

        // Refresh balance data
        queryClient.invalidateQueries(['balance', targetAccount]);
      }
    };

    // Individual refresh functions for specific data
    window.invalidateGameHistory = accountAddress => {
      // If no account is provided, use the current one
      const targetAccount = accountAddress || account;
      if (targetAccount) {
        console.log('Invalidating game history for account:', targetAccount);
        queryClient.invalidateQueries(['gameHistory', targetAccount]);
      }
    };

    return () => {
      // Clean up global functions
      delete window.invalidateGameHistory;
      delete window.refreshAllData;
    };
  }, [account, queryClient]);

  // Refresh all data when account or contracts change
  useEffect(() => {
    if (account && contracts) {
      console.log('Account or contracts changed, refreshing all data');
      window.refreshAllData(account);
    }
  }, [account, contracts, queryClient]);

  // Use our custom game logic hook
  const {
    chosenNumber,
    betAmount,
    gameState,
    balanceData,
    balanceLoading,
    hasNoTokens,
    needsApproval,
    isApproving,
    isBetting,
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

      // Store last bet details for LatestBet component
      setLastBetDetails({
        result: gameState.lastResult,
        chosenNumber,
        betAmount,
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

  // Debug logging for gameState.lastResult
  useEffect(() => {
    if (gameState.lastResult) {
      console.log('Dice Page - gameState.lastResult:', gameState.lastResult);
      console.log('Structure:', Object.keys(gameState.lastResult));
      console.log(
        'rolledNumber type:',
        typeof gameState.lastResult.rolledNumber
      );
      console.log('rolledNumber value:', gameState.lastResult.rolledNumber);
    }
  }, [gameState.lastResult]);

  // Store last bet details when placing a bet
  const handlePlaceBetWithTracking = useCallback(() => {
    // Store the current bet details before placing the bet
    // This ensures we capture the values even if they change during processing
    setLastBetDetails({
      // Use existing result if available
      result: gameState.lastResult,
      // Store current chosen number and bet amount
      chosenNumber,
      betAmount,
    });

    // Call the original bet handler
    handlePlaceBet();
  }, [handlePlaceBet, chosenNumber, betAmount, gameState.lastResult]);

  // Debug approval state
  useEffect(() => {
    if (contracts?.token && contracts?.dice && account) {
      console.log('=== Approval Debug Info ===');
      console.log('needsApproval:', needsApproval);
      console.log('Balance data:', {
        balance: balanceData?.balance
          ? balanceData.balance.toString()
          : 'undefined',
        allowance: balanceData?.allowance
          ? balanceData.allowance.toString()
          : 'undefined',
        betAmount: betAmount ? betAmount.toString() : 'undefined',
      });
      console.log('Game state:', gameState);
      console.log('isApproving:', isApproving);

      // Add a window method to force show the approve button for testing
      window.forceShowApprove = () => {
        document
          .querySelector('.temp-approve-button')
          ?.classList.remove('hidden');
      };
    }

    return () => {
      delete window.forceShowApprove;
    };
  }, [
    needsApproval,
    balanceData,
    betAmount,
    account,
    contracts,
    gameState,
    isApproving,
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Show welcome banner only for users who haven't connected their wallet */}
        {(!isWalletConnected || !account) && (
          <WelcomeBanner onConnectClick={connectWallet} />
        )}

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

              <div className="mb-4">
                <NumberSelector
                  value={chosenNumber}
                  onChange={setChosenNumber}
                  disabled={gameState.isProcessing}
                />
              </div>

              <div className="mb-8">
                <div className="space-y-4">
                  <BetInput
                    value={betAmount}
                    onChange={setBetAmount}
                    disabled={gameState.isProcessing || hasNoTokens}
                    lastBetAmount={lastBetAmount}
                    onRepeatLastBet={handleRepeatLastBet}
                    userBalance={balanceData?.balance || BigInt(0)}
                  >
                    <BalancePanel
                      userBalance={balanceData?.balance || BigInt(0)}
                      allowance={balanceData?.allowance || BigInt(0)}
                      betAmount={betAmount}
                      isLoading={balanceLoading}
                    />
                  </BetInput>
                </div>
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
                {/* Add ApprovalGuide when approval is needed and wallet is connected */}
                {isWalletConnected &&
                  account &&
                  needsApproval &&
                  !hasNoTokens &&
                  !isBetting &&
                  !isApproving && (
                    <ApprovalGuide
                      onApproveClick={handleApproveToken}
                      isApproving={isApproving}
                    />
                  )}

                {/* Keep existing approval button but wrapped in a div that's hidden on mobile */}
                <div
                  className={`${needsApproval && !hasNoTokens && !isBetting && !isApproving ? '' : 'hidden'}`}
                >
                  <button
                    disabled={isApproving}
                    onClick={handleApproveToken}
                    className={`w-full py-3 rounded-lg font-medium transition-all ${
                      isApproving
                        ? 'bg-yellow-200 text-yellow-700 cursor-not-allowed'
                        : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    }`}
                  >
                    {isApproving ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-yellow-700/30 border-t-yellow-700 rounded-full animate-spin"></div>
                        Approving GAMA...
                      </div>
                    ) : (
                      'Approve GAMA for Betting'
                    )}
                  </button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePlaceBetWithTracking}
                  disabled={
                    gameState.isProcessing ||
                    gameState.isRolling ||
                    isApproving ||
                    isBetting ||
                    !chosenNumber ||
                    needsApproval ||
                    hasNoTokens
                  }
                  className="h-14 w-full bg-gradient-to-r from-gaming-primary to-gaming-accent hover:from-gaming-primary/90 hover:to-gaming-accent/90 font-medium rounded-lg transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {gameState.isProcessing || gameState.isRolling ? (
                    <span className="flex items-center justify-center">
                      <LoadingSpinner size="small" />
                      <span className="ml-2">
                        {gameState.isRolling
                          ? 'Rolling Dice...'
                          : 'Processing...'}
                      </span>
                    </span>
                  ) : hasNoTokens ? (
                    'Insufficient Token Balance'
                  ) : needsApproval ? (
                    'Approve Tokens First'
                  ) : !chosenNumber ? (
                    'Choose a Number'
                  ) : (
                    <span className="flex items-center justify-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        ></path>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      Roll Dice
                    </span>
                  )}
                </motion.button>

                {/* VRF Recovery Button */}
                {showVrfButton && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsVrfModalOpen(true)}
                    className="h-14 mt-4 w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-lg transition-all shadow-lg flex items-center justify-center"
                  >
                    <FontAwesomeIcon icon={faRandom} className="mr-2" />
                    {gameStatus?.recoveryEligible
                      ? 'Recover Game'
                      : 'VRF Status'}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Dice Visualizer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white backdrop-blur-3xl rounded-xl border border-secondary-200 p-6 shadow-xl"
            >
              <div className="flex flex-col items-center justify-center">
                <div className="w-full flex items-center justify-center">
                  <DiceVisualizer
                    isRolling={gameState.isRolling}
                    result={gameState.lastResult}
                    chosenNumber={chosenNumber}
                  />
                </div>
              </div>
            </motion.div>

            {/* Latest Bet - Separate Component */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white backdrop-blur-3xl rounded-xl border border-secondary-200 shadow-xl"
            >
              <LatestBet
                result={lastBetDetails?.result || gameState.lastResult}
                chosenNumber={lastBetDetails?.chosenNumber || chosenNumber}
                betAmount={lastBetDetails?.betAmount || betAmount}
              />
            </motion.div>
          </div>
        </div>

        {/* Game History & Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-white backdrop-blur-md rounded-xl border border-secondary-200 p-6 shadow-xl"
        >
          <h2 className="text-2xl font-bold text-secondary-800 mb-6">
            Game History
          </h2>

          <GameHistory
            account={account}
            diceContract={contracts?.dice}
            onError={onError}
          />
        </motion.div>

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

      {/* VRF Recovery Modal */}
      <VrfRecoveryModal
        isOpen={isVrfModalOpen}
        onClose={() => setIsVrfModalOpen(false)}
      />
    </div>
  );
};

export default DicePage;
