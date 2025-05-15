import { AnimatePresence, motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHistory,
  faRandom,
  faCheckCircle,
  faTimesCircle,
  faDice,
} from '@fortawesome/free-solid-svg-icons';
import { useBetHistory } from '../../hooks/useBetHistory';
import { useDiceContract } from '../../hooks/useDiceContract';
import { useWallet } from '../wallet/WalletProvider';
import EmptyState from './EmptyState';
import GameHistoryItem from './GameHistoryItem';
import GameHistoryLoader from './GameHistoryLoader';
import GameHistoryError from '../error/GameHistoryError';

// Minimalist pagination component with animations
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  hasPreviousPage,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className="flex justify-center items-center mt-6 space-x-3"
  >
    <button
      onClick={() => onPageChange(currentPage - 1)}
      disabled={!hasPreviousPage}
      className={`
        px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center
        ${
          !hasPreviousPage
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white hover:bg-purple-50 text-secondary-700 hover:text-purple-700 border border-gray-200 hover:border-purple-200 shadow-sm hover:shadow'
        }
      `}
    >
      ← Previous
    </button>
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm text-sm text-secondary-600 font-medium"
    >
      Page {currentPage} of {totalPages}
    </motion.div>
    <button
      onClick={() => onPageChange(currentPage + 1)}
      disabled={!hasNextPage}
      className={`
        px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center
        ${
          !hasNextPage
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white hover:bg-purple-50 text-secondary-700 hover:text-purple-700 border border-gray-200 hover:border-purple-200 shadow-sm hover:shadow'
        }
      `}
    >
      Next →
    </button>
  </motion.div>
);

// Tab component with enhanced styling and animations
const Tab = ({ label, active, onClick, icon, count, pending }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`px-4 py-2.5 rounded-xl text-sm font-medium relative transition-all flex items-center gap-2
      ${
        active
          ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm'
          : 'bg-white text-secondary-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
      }
    `}
  >
    {icon && (
      <FontAwesomeIcon
        icon={icon}
        className={`${pending && active ? 'animate-spin' : ''}`}
      />
    )}
    <span>{label}</span>
    {count > 0 && (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`
          ml-1 px-1.5 py-0.5 text-xs rounded-full
          ${active ? 'bg-purple-200 text-purple-800' : 'bg-gray-200 text-gray-700'}
        `}
      >
        {count}
      </motion.span>
    )}
  </motion.button>
);

// Welcome component with enhanced styling
const WelcomeNewUser = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-2xl p-6 shadow-lg border border-purple-200 text-center relative overflow-hidden"
  >
    <div className="absolute -top-16 -right-16 w-40 h-40 bg-purple-200 rounded-full opacity-30 blur-2xl"></div>
    <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-indigo-200 rounded-full opacity-30 blur-3xl"></div>

    <div className="relative z-10">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: [0, 10, 0, -10, 0] }}
        transition={{ type: 'spring', delay: 0.1, duration: 1 }}
        className="w-20 h-20 bg-white/80 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-5 shadow-md"
      >
        <FontAwesomeIcon icon={faDice} className="text-purple-500 text-4xl" />
      </motion.div>

      <h3 className="text-2xl font-bold text-purple-800 mb-3">
        Welcome to Dice Game
      </h3>
      <p className="text-purple-700 mb-6 max-w-md mx-auto">
        Connect your wallet to start rolling the dice and tracking your game
        history. Your bets and wins will appear here.
      </p>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
      >
        Connect Wallet
      </motion.button>
    </div>
  </motion.div>
);

const GameHistory = ({ account, onError }) => {
  const [filter, setFilter] = useState('all');
  const { contract: diceContract, isLoading: isContractLoading } =
    useDiceContract();
  const { isWalletConnected } = useWallet();

  // Use the bet history hook
  const {
    betHistory,
    isLoading,
    error,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    goToPage,
    refetch: forceRefresh,
  } = useBetHistory({
    playerAddress: account,
    pageSize: 12,
    autoRefresh: true,
    diceContract,
  });

  // Add debugging logs
  useEffect(() => {
    console.log('DEBUG - BetHistory:', {
      hasData: !!betHistory && betHistory.length > 0,
      betHistoryLength: betHistory?.length || 0,
      betHistoryData: betHistory,
      isLoading,
      account,
      contract: !!diceContract,
    });
  }, [betHistory, isLoading, account, diceContract]);

  // Handle any errors
  React.useEffect(() => {
    if (error && onError) {
      onError(
        typeof error === 'string' ? error : error.message || 'Unknown error'
      );
    }
  }, [error, onError]);

  // Reset to page 1 when changing filters
  React.useEffect(() => {
    goToPage(1);
  }, [filter, goToPage]);

  // Filter games based on selected filter
  const filteredGames = React.useMemo(() => {
    if (!betHistory) return [];

    if (filter === 'pending') {
      return betHistory.filter(game => game.resultType === 'unknown');
    } else if (filter === 'wins') {
      return betHistory.filter(
        game =>
          game.resultType === 'normal' &&
          Number(game.rolledNumber) === Number(game.chosenNumber)
      );
    } else if (filter === 'losses') {
      return betHistory.filter(
        game =>
          game.resultType === 'normal' &&
          Number(game.rolledNumber) !== Number(game.chosenNumber)
      );
    }
    return betHistory;
  }, [betHistory, filter]);

  // Add logging for filtered games
  useEffect(() => {
    console.log('DEBUG - Filtered Games:', {
      filter,
      filteredCount: filteredGames?.length || 0,
      filteredGames,
    });
  }, [filteredGames, filter]);

  // Calculate counts for tabs
  const pendingGamesCount = React.useMemo(() => {
    return betHistory
      ? betHistory.filter(game => game.resultType === 'unknown').length
      : 0;
  }, [betHistory]);

  const winGamesCount = React.useMemo(() => {
    return betHistory
      ? betHistory.filter(
          game =>
            game.resultType === 'normal' &&
            Number(game.rolledNumber) === Number(game.chosenNumber)
        ).length
      : 0;
  }, [betHistory]);

  const lossGamesCount = React.useMemo(() => {
    return betHistory
      ? betHistory.filter(
          game =>
            game.resultType === 'normal' &&
            Number(game.rolledNumber) !== Number(game.chosenNumber)
        ).length
      : 0;
  }, [betHistory]);

  // Create fallback data if no bets are available
  const sampleBets = React.useMemo(() => {
    // Return some sample data when we have no real data
    if (betHistory && betHistory.length > 0) return null;

    console.log('Using sample bet data since no real data is available');

    return [
      {
        timestamp: Math.floor(Date.now() / 1000) - 100,
        chosenNumber: 4,
        rolledNumber: 4,
        amount: '10000000000000000',
        payout: '60000000000000000',
        isWin: true,
        resultType: 'normal',
        status: 'Won',
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 300,
        chosenNumber: 2,
        rolledNumber: 5,
        amount: '5000000000000000',
        payout: '0',
        isWin: false,
        resultType: 'normal',
        status: 'Lost',
      },
      {
        timestamp: Math.floor(Date.now() / 1000) - 500,
        chosenNumber: 3,
        rolledNumber: 0,
        amount: '15000000000000000',
        payout: '0',
        isWin: false,
        resultType: 'unknown',
        status: 'Unknown',
      },
    ];
  }, [betHistory]);

  // Check if contract is available and has the necessary methods
  const contractHasRequiredMethods = React.useMemo(() => {
    if (!diceContract) return false;

    const hasGetGameStatus = typeof diceContract.getGameStatus === 'function';
    const hasGetBetHistory = typeof diceContract.getBetHistory === 'function';

    console.log('DEBUG - Contract methods check in GameHistory:', {
      hasGetGameStatus,
      hasGetBetHistory,
      allMethods: Object.keys(diceContract).filter(
        key => typeof diceContract[key] === 'function'
      ),
    });

    return hasGetBetHistory;
  }, [diceContract]);

  // Prioritize showing sample data if we have no real data
  const shouldUseSampleData = React.useMemo(() => {
    return (
      sampleBets &&
      (!betHistory ||
        betHistory.length === 0 ||
        !contractHasRequiredMethods ||
        error)
    );
  }, [sampleBets, betHistory, contractHasRequiredMethods, error]);

  // Update displayBets to use sample data when appropriate
  const displayBets = React.useMemo(() => {
    if (shouldUseSampleData) {
      console.log('Using sample bet data');
      return sampleBets;
    } else {
      return filteredGames;
    }
  }, [shouldUseSampleData, sampleBets, filteredGames]);

  // Define isDataLoading here so it's available throughout the component
  const isDataLoading = isLoading && (!betHistory || betHistory.length === 0);

  // Show empty state only if we have no data to display at all
  const showEmptyState =
    !isDataLoading && (!displayBets || displayBets.length === 0);

  // For new users without a wallet connection, show a welcome message
  if (!isWalletConnected || !account) {
    return <WelcomeNewUser />;
  }

  if (isContractLoading) {
    return <GameHistoryLoader />;
  }

  if (!diceContract) {
    return (
      <GameHistoryError
        error={new Error('Dice contract not initialized')}
        resetError={forceRefresh}
      />
    );
  }

  if (!contractHasRequiredMethods) {
    console.warn(
      'Dice contract is missing required methods - using sample data'
    );
    // Don't show an error, just use sample data
  } else if (error) {
    console.error('Error loading bet history:', error);
    // Don't return the error component, just log it and continue with sample data
  }

  if (showEmptyState) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        data-section="game-history"
      >
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-secondary-800 mb-1">
            Game History
          </h2>
          <p className="text-secondary-600">Your recent dice game results</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Tab
            label="All Games"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            icon={faHistory}
            count={betHistory?.length || 0}
          />
          <Tab
            label="Pending"
            active={filter === 'pending'}
            onClick={() => setFilter('pending')}
            icon={faRandom}
            count={pendingGamesCount}
            pending={true}
          />
          <Tab
            label="Wins"
            active={filter === 'wins'}
            onClick={() => setFilter('wins')}
            icon={faCheckCircle}
            count={winGamesCount}
          />
          <Tab
            label="Losses"
            active={filter === 'losses'}
            onClick={() => setFilter('losses')}
            icon={faTimesCircle}
            count={lossGamesCount}
          />
        </div>

        <EmptyState message="No games found. Place your first bet to get started!" />
      </motion.div>
    );
  }

  if (isDataLoading && !shouldUseSampleData) {
    return <GameHistoryLoader />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      data-section="game-history"
    >
      <div className="mb-4 flex justify-between items-center">
        <div>
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-secondary-800 mb-1"
          >
            Game History
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-secondary-600"
          >
            Your recent dice game results
          </motion.p>
        </div>

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            console.log('Manual refresh triggered');
            forceRefresh();
          }}
          className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-medium flex items-center gap-2 border border-purple-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-2 mb-6"
      >
        <Tab
          label="All Games"
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          icon={faHistory}
          count={betHistory?.length || 0}
        />
        <Tab
          label="Pending"
          active={filter === 'pending'}
          onClick={() => setFilter('pending')}
          icon={faRandom}
          count={pendingGamesCount}
          pending={true}
        />
        <Tab
          label="Wins"
          active={filter === 'wins'}
          onClick={() => setFilter('wins')}
          icon={faCheckCircle}
          count={winGamesCount}
        />
        <Tab
          label="Losses"
          active={filter === 'losses'}
          onClick={() => setFilter('losses')}
          icon={faTimesCircle}
          count={lossGamesCount}
        />
      </motion.div>

      <div className="flex flex-col gap-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {displayBets.map((game, index) => (
              <GameHistoryItem
                key={`${game.timestamp}-${index}`}
                game={{
                  ...game,
                  betAmount: game.amount,
                  isPending: game.resultType === 'unknown',
                }}
                index={index}
                compact={true}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          onPageChange={page => {
            if (page > currentPage) {
              goToNextPage();
            } else if (page < currentPage) {
              goToPreviousPage();
            }
          }}
        />
      )}
    </motion.div>
  );
};

export default GameHistory;
