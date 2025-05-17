import { AnimatePresence, motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHistory,
  faRandom,
  faCheckCircle,
  faTimesCircle,
  faDice,
  faChartLine,
  faTrophy,
  faWallet,
  faPlayCircle,
} from '@fortawesome/free-solid-svg-icons';
import { useBetHistory } from '../../hooks/useBetHistory';
import { useDiceContract } from '../../hooks/useDiceContract';
import { useWallet } from '../wallet/WalletProvider';
import EmptyState from './EmptyState';
import GameHistoryItem from './GameHistoryItem';
import GameHistoryLoader from './GameHistoryLoader';
import GameHistoryError from '../error/GameHistoryError';
import { usePollingService } from '../../services/pollingService.jsx';

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
            : 'bg-white hover:bg-[#22AD74]/5 text-secondary-700 hover:text-[#22AD74] border border-gray-200 hover:border-[#22AD74]/20 shadow-sm hover:shadow'
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
            : 'bg-white hover:bg-[#22AD74]/5 text-secondary-700 hover:text-[#22AD74] border border-gray-200 hover:border-[#22AD74]/20 shadow-sm hover:shadow'
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
          ? 'bg-[#22AD74]/10 text-[#22AD74] border border-[#22AD74]/20 shadow-sm'
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
          ${active ? 'bg-[#22AD74]/20 text-[#22AD74]' : 'bg-gray-200 text-gray-700'}
        `}
      >
        {count}
      </motion.span>
    )}
  </motion.button>
);

// Modern welcome component with GAMA branding
const WelcomeNewUser = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    className="bg-gradient-to-br from-[#22AD74]/10 to-[#22AD74]/5 rounded-2xl p-8 shadow-lg border border-[#22AD74]/20 text-center relative overflow-hidden backdrop-blur-md"
  >
    {/* Decorative elements */}
    <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#22AD74]/15 rounded-full opacity-30 blur-2xl"></div>
    <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-[#22AD74]/10 rounded-full opacity-30 blur-3xl"></div>
    <div className="absolute top-1/3 left-1/4 w-24 h-24 bg-[#22AD74]/10 rounded-full opacity-20 blur-xl"></div>

    <div className="relative z-10">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: [0, 10, 0, -10, 0] }}
        transition={{ type: 'spring', delay: 0.1, duration: 1 }}
        className="w-24 h-24 bg-white/70 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 shadow-md border border-[#22AD74]/20"
      >
        <FontAwesomeIcon icon={faDice} className="text-[#22AD74] text-4xl" />
      </motion.div>

      <h3 className="text-2xl font-bold text-[#22AD74] mb-3">Game History</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-2xl mx-auto">
        <div className="bg-white/60 p-4 rounded-xl shadow-sm border border-[#22AD74]/10 backdrop-blur-sm">
          <FontAwesomeIcon
            icon={faChartLine}
            className="text-[#22AD74] text-xl mb-2"
          />
          <h4 className="text-gray-800 font-medium">Track Progress</h4>
          <p className="text-sm text-gray-600">
            Monitor your wins, losses and game statistics
          </p>
        </div>

        <div className="bg-white/60 p-4 rounded-xl shadow-sm border border-[#22AD74]/10 backdrop-blur-sm">
          <FontAwesomeIcon
            icon={faTrophy}
            className="text-[#22AD74] text-xl mb-2"
          />
          <h4 className="text-gray-800 font-medium">View Achievements</h4>
          <p className="text-sm text-gray-600">
            See your biggest wins and betting streaks
          </p>
        </div>

        <div className="bg-white/60 p-4 rounded-xl shadow-sm border border-[#22AD74]/10 backdrop-blur-sm">
          <FontAwesomeIcon
            icon={faHistory}
            className="text-[#22AD74] text-xl mb-2"
          />
          <h4 className="text-gray-800 font-medium">Recent Activity</h4>
          <p className="text-sm text-gray-600">
            Access your complete gaming history
          </p>
        </div>
      </div>

      <div className="mt-8 max-w-md mx-auto text-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="bg-[#22AD74]/10 p-5 rounded-xl border border-[#22AD74]/20 w-full">
            <FontAwesomeIcon
              icon={faPlayCircle}
              className="text-[#22AD74] text-2xl mb-3"
            />
            <h4 className="text-gray-800 font-medium mb-1">Ready to Begin?</h4>
            <p className="text-sm text-gray-600 mb-4">
              Place your first bet to start tracking your game history
            </p>
            <div className="flex items-center justify-center space-x-1 text-sm text-[#22AD74]">
              <FontAwesomeIcon icon={faWallet} className="text-[#22AD74]" />
              <span>Wallet connected and ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

const GameHistory = ({ account, onError }) => {
  const [filter, setFilter] = useState('all');
  const { contract: diceContract, isLoading: isContractLoading } =
    useDiceContract();
  const { isWalletConnected } = useWallet();

  // Get isNewUser state from polling service
  const { isNewUser, gameStatus } = usePollingService();

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
      isNewUser,
    });
  }, [betHistory, isLoading, account, diceContract, isNewUser]);

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
    // Count pending games from bet history
    const pendingCount = betHistory
      ? betHistory.filter(game => game.resultType === 'unknown').length
      : 0;

    // Add active game if it exists and it's not already in the history
    const hasActiveGame = gameStatus?.isActive && gameStatus?.chosenNumber;

    // Only increment if there's an active game and it's not already counted in bet history
    if (hasActiveGame) {
      // Check if we already have this game in history to avoid double counting
      const isAlreadyCounted = betHistory
        ? betHistory.some(
            game =>
              game.resultType === 'unknown' &&
              Number(game.timestamp) ===
                Number(gameStatus.lastPlayTimestamp || 0) &&
              Number(game.chosenNumber) === Number(gameStatus.chosenNumber) &&
              game.amount === gameStatus.amount?.toString()
          )
        : false;

      return pendingCount + (isAlreadyCounted ? 0 : 1);
    }

    return pendingCount;
  }, [betHistory, gameStatus]);

  // Add debugging for active game and pending count - moved after pendingGamesCount declaration
  useEffect(() => {
    console.log('DEBUG - Active Game Status:', {
      hasActiveGame: gameStatus?.isActive,
      chosenNumber: gameStatus?.chosenNumber,
      amount: gameStatus?.amount?.toString(),
      lastPlayTimestamp: gameStatus?.lastPlayTimestamp,
      pendingGamesCount,
      pendingGamesInHistory: betHistory
        ? betHistory.filter(game => game.resultType === 'unknown').length
        : 0,
    });
  }, [gameStatus, pendingGamesCount, betHistory]);

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
    // Return empty array instead of sample data
    return [];
  }, []);

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

  // We no longer use sample data
  const shouldUseSampleData = React.useMemo(() => {
    return false; // Always return false to never use sample data
  }, []);

  // Update displayBets to include active game
  const displayBets = React.useMemo(() => {
    // Start with the filtered games
    let games = [...filteredGames];

    // If there's an active game from gameStatus, add it to the list
    if (gameStatus?.isActive && gameStatus?.chosenNumber) {
      // Create a history item for the active game
      const activeBet = {
        timestamp: Number(
          gameStatus.lastPlayTimestamp || Math.floor(Date.now() / 1000)
        ),
        chosenNumber: Number(gameStatus.chosenNumber),
        rolledNumber: 0, // No result yet
        amount: gameStatus.amount?.toString() || '0',
        payout: '0', // No payout yet
        resultType: 'unknown',
        status: 'Pending',
        isPending: true,
        // Add a flag to identify this as the active game
        isActiveGame: true,
      };

      // Check if this game should be included based on current filter
      const shouldInclude =
        filter === 'all' ||
        (filter === 'pending' && activeBet.resultType === 'unknown');

      // Only add if it should be included by the filter
      if (shouldInclude) {
        // Check if we already have this game in history
        // This prevents duplicate entries when the game is both active and in history
        const isDuplicate = games.some(
          game =>
            game.timestamp === activeBet.timestamp &&
            game.chosenNumber === activeBet.chosenNumber &&
            game.amount === activeBet.amount
        );

        if (!isDuplicate) {
          // Add to the beginning of the array
          games.unshift(activeBet);
        }
      }
    }

    // Add debug logging
    console.log('DEBUG - Display Bets:', {
      hasActiveGame: gameStatus?.isActive,
      activeGameAdded: games.length > filteredGames.length,
      totalGames: games.length,
      games,
    });

    return games;
  }, [filteredGames, gameStatus, filter]);

  // Define isDataLoading here so it's available throughout the component
  const isDataLoading = isLoading && (!betHistory || betHistory.length === 0);

  // Show empty state only if we have no data to display at all
  const showEmptyState =
    !isDataLoading && (!displayBets || displayBets.length === 0);

  // For new users without a wallet connection or those who haven't placed bets yet, show a welcome message
  if (!isWalletConnected || !account) {
    return <WelcomeNewUser />;
  }

  // Show welcome message for users who have connected their wallet but haven't placed any bets
  if (isWalletConnected && account && isNewUser) {
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
      'Dice contract is missing required methods to fetch bet history'
    );
  } else if (error) {
    console.error('Error loading bet history:', error);
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

  if (isDataLoading) {
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
          className="px-4 py-2 bg-[#22AD74]/10 hover:bg-[#22AD74]/20 text-[#22AD74] rounded-xl font-medium flex items-center gap-2 border border-[#22AD74]/20"
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
