import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import GameHistoryItem from './GameHistoryItem';
import EmptyState from './EmptyState';
import GameHistoryLoader from './GameHistoryLoader';
import gameService from '../../services/gameService';

// Minimalist pagination component
const Pagination = ({ currentPage, totalPages, onPageChange }) => (
  <div className="flex justify-center items-center mt-5 space-x-2">
    <button
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
      className="px-3 py-1 rounded bg-white border border-gray-200 shadow-sm disabled:opacity-50 hover:bg-green-50 text-secondary-700 text-sm"
    >
      ← Prev
    </button>
    <span className="text-secondary-600 px-3 py-1 bg-white border border-gray-200 rounded shadow-sm">
      {currentPage} / {totalPages}
    </span>
    <button
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
      className="px-3 py-1 rounded bg-white border border-gray-200 shadow-sm disabled:opacity-50 hover:bg-green-50 text-secondary-700 text-sm"
    >
      Next →
    </button>
  </div>
);

// Tab component for cleaner filter UI
const Tab = ({ label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 text-sm transition-colors duration-200 relative ${
      active
        ? 'bg-white text-secondary-800 shadow-sm font-medium rounded-t-md border border-gray-200 border-b-white relative z-10'
        : 'text-secondary-500 hover:text-secondary-700'
    }`}
  >
    {label}
    {count > 0 && (
      <span
        className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full inline-flex items-center justify-center ${
          active
            ? 'bg-primary-100 text-primary-700'
            : 'bg-gray-200 text-gray-700'
        }`}
      >
        {count}
      </span>
    )}
  </button>
);

// Game History component with a more modern tab design
const GameHistory = ({ account, diceContract, onError }) => {
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const queryClient = useQueryClient();

  // Reset to page 1 when changing filters
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // Initialize gameService with the dice contract when it changes
  React.useEffect(() => {
    if (diceContract) {
      try {
        gameService.init({ dice: diceContract });
        if (account) {
          queryClient.invalidateQueries(['gameHistory', account]);
        }
      } catch (error) {
        console.error('Error initializing gameService:', error);
        if (onError) onError(error);
      }
    }
  }, [diceContract, onError, queryClient, account]);

  // Query game history data
  const { data: gameData, isLoading } = useQuery({
    queryKey: ['gameHistory', account],
    queryFn: async () => {
      if (!account || !diceContract) {
        return {
          games: [],
          stats: { totalGamesWon: 0, totalGamesLost: 0 },
        };
      }
      return await gameService.getGameHistory(account);
    },
    refetchOnWindowFocus: false,
    staleTime: 30000,
    enabled: !!account && !!diceContract,
  });

  // Process game data for display
  const { filteredGames, totalPages, displayedGames } = useMemo(() => {
    const games = gameData?.games || [];

    // Define constants for special result codes
    const RESULT_FORCE_STOPPED = 254;
    const RESULT_RECOVERED = 255;

    // Filter games based on selected filter
    let filtered = games;
    if (filter === 'wins') {
      filtered = games.filter(game => {
        const rolledNumber = Number(game.rolledNumber);
        const chosenNumber = Number(game.chosenNumber);
        return (
          rolledNumber === chosenNumber &&
          rolledNumber >= 1 &&
          rolledNumber <= 6
        );
      });
    } else if (filter === 'losses') {
      filtered = games.filter(game => {
        const rolledNumber = Number(game.rolledNumber);
        const chosenNumber = Number(game.chosenNumber);
        return (
          rolledNumber !== chosenNumber &&
          rolledNumber >= 1 &&
          rolledNumber <= 6
        );
      });
    } else if (filter === 'pending') {
      filtered = games.filter(game => {
        // Implement pending criteria here
        return game.isPending;
      });
    }

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    const validatedCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
    const startIndex = (validatedCurrentPage - 1) * itemsPerPage;
    const displayedGames = filtered.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    return {
      filteredGames: filtered,
      totalPages,
      displayedGames,
    };
  }, [gameData, filter, currentPage, itemsPerPage]);

  // Count stats for badges
  const stats = useMemo(() => {
    const games = gameData?.games || [];

    const wins = games.filter(game => {
      const rolledNumber = Number(game.rolledNumber);
      const chosenNumber = Number(game.chosenNumber);
      return (
        rolledNumber === chosenNumber && rolledNumber >= 1 && rolledNumber <= 6
      );
    }).length;

    const losses = games.filter(game => {
      const rolledNumber = Number(game.rolledNumber);
      const chosenNumber = Number(game.chosenNumber);
      return (
        rolledNumber !== chosenNumber && rolledNumber >= 1 && rolledNumber <= 6
      );
    }).length;

    const pending = games.filter(game => game.isPending).length;

    return { wins, losses, pending, all: games.length };
  }, [gameData]);

  return (
    <div className="bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-200">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-secondary-800 ml-1 mb-4">
          Betting History
        </h2>

        {/* New tab design */}
        <div className="flex border-b border-gray-200 relative">
          <Tab
            label="All"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            count={stats.all}
          />
          <Tab
            label="Pending"
            active={filter === 'pending'}
            onClick={() => setFilter('pending')}
            count={stats.pending}
          />
          <Tab
            label="Wins"
            active={filter === 'wins'}
            onClick={() => setFilter('wins')}
            count={stats.wins}
          />
          <Tab
            label="Losses"
            active={filter === 'losses'}
            onClick={() => setFilter('losses')}
            count={stats.losses}
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && <GameHistoryLoader />}

      {/* Empty state */}
      {!isLoading && (!gameData?.games || gameData.games.length === 0) && (
        <EmptyState />
      )}

      {/* Game list */}
      <AnimatePresence>
        {!isLoading && gameData && gameData.games.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {displayedGames.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm bg-white rounded-lg border border-gray-100">
                No games match your filter criteria
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {displayedGames.map((game, index) => (
                  <GameHistoryItem
                    key={`${game.timestamp}-${index}`}
                    game={game}
                    index={index}
                    compact={true}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {filteredGames.length > itemsPerPage && (
              <div className="mt-6 mb-2">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameHistory;
