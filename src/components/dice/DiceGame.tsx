import React, { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useGameState } from '../../hooks/useGameState';
import { useWallet } from '../wallet/WalletProvider';
import { useNotification } from '../../contexts/NotificationContext';
import DiceControls from './DiceControls';
import GameHistory from './GameHistory';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorMessage from '../error/ErrorMessage';
import { formatEther } from '../../utils/formatting';

const DiceGame: React.FC = () => {
  const {
    gameState,
    betHistory,
    userBalance,
    isLoading,
    isFetching,
    error,
    placeBet,
    refreshState,
  } = useGameState();

  const { isWalletConnected, account } = useWallet();
  const { addToast } = useNotification();

  const [selectedNumber, setSelectedNumber] = useState<number>(1);
  const [betAmount, setBetAmount] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when account changes
  useEffect(() => {
    setSelectedNumber(1);
    setBetAmount('0');
  }, [account]);

  // Handle bet submission
  const handleBet = useCallback(async () => {
    if (!isWalletConnected) {
      addToast('Please connect your wallet first', 'warning');
      return;
    }

    if (Number(betAmount) <= 0) {
      addToast('Please enter a valid bet amount', 'warning');
      return;
    }

    if (selectedNumber < 1 || selectedNumber > 6) {
      addToast('Please select a number between 1 and 6', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      await placeBet(selectedNumber, ethers.parseEther(betAmount).toString());

      // Reset form after successful bet
      setBetAmount('0');
      setSelectedNumber(1);
    } catch (error: any) {
      console.error('Bet failed:', error);
      // Error is handled by useGameState
    } finally {
      setIsSubmitting(false);
    }
  }, [isWalletConnected, betAmount, selectedNumber, placeBet, addToast]);

  // Handle number selection
  const handleNumberSelect = useCallback((number: number) => {
    setSelectedNumber(number);
  }, []);

  // Handle amount input
  const handleAmountChange = useCallback((amount: string) => {
    // Remove any non-numeric characters except decimal point
    const cleanAmount = amount.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point
    const parts = cleanAmount.split('.');
    const formattedAmount =
      parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleanAmount;

    setBetAmount(formattedAmount);
  }, []);

  if (error) {
    return (
      <ErrorMessage
        message="Failed to load game state"
        error={error}
        onRetry={refreshState}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Game Status */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-4">XDC Dice Game</h1>
          <div className="flex justify-center items-center space-x-2">
            {(isLoading || isFetching || isSubmitting) && (
              <LoadingSpinner size="small" />
            )}
            <p className="text-lg">Balance: {formatEther(userBalance)} GAMA</p>
          </div>
        </div>

        {/* Game Controls */}
        <DiceControls
          selectedNumber={selectedNumber}
          betAmount={betAmount}
          onNumberSelect={handleNumberSelect}
          onAmountChange={handleAmountChange}
          onSubmit={handleBet}
          isSubmitting={isSubmitting}
          disabled={!isWalletConnected || isSubmitting}
        />

        {/* Current Game */}
        {gameState.isActive && (
          <div className="mt-8 p-4 bg-yellow-100 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Active Game</h2>
            <p>Selected Number: {gameState.selectedNumber}</p>
            <p>Bet Amount: {formatEther(gameState.betAmount)} GAMA</p>
            <p>Status: {gameState.status}</p>
            {gameState.result !== null && (
              <p className="text-xl font-bold mt-2">
                Result: {gameState.result}
              </p>
            )}
          </div>
        )}

        {/* Game History */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Game History</h2>
          <GameHistory
            history={betHistory}
            isLoading={isLoading}
            onRetry={refreshState}
          />
        </div>
      </div>
    </div>
  );
};

export default DiceGame;
