import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import FilterButton from '../ui/FilterButton';
import GameHistoryItem from './GameHistoryItem';
import EmptyState from './EmptyState';
import GameHistoryLoader from './GameHistoryLoader';
import gameService from '../../services/gameService';

// Minimalist pagination component
const Pagination = ({ currentPage, totalPages, onPageChange }) => (
  <div className="flex justify-center items-center mt-3 space-x-1 text-xs">
    <button
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
      className="px-2 py-0.5 rounded bg-gray-100 disabled:opacity-50 hover:bg-green-50"
    >
      ←
    </button>
    <span className="text-gray-600">
      {currentPage} / {totalPages}
    </span>
    <button
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
      className="px-2 py-0.5 rounded bg-gray-100 disabled:opacity-50 hover:bg-green-50"
    >
      →
    </button>
  </div>
);

// Game History component with a symmetric and minimalistic design
const GameHistory = ({ account, diceContract, onError }) => {
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Showing more items in compact view
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
    } else if (filter === 'special') {
      filtered = games.filter(game => {
        const rolledNumber = Number(game.rolledNumber);
        return (
          rolledNumber === RESULT_RECOVERED ||
          rolledNumber === RESULT_FORCE_STOPPED ||
          rolledNumber > 250
        );
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

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm min-h-[250px] border border-gray-100">
      {/* Header with filter buttons */}
      <div className="flex flex-wrap justify-between items-center mb-3">
        <h2 className="text-base font-medium text-gray-800 mb-1 md:mb-0">
          Game History
        </h2>

        <div className="flex flex-wrap gap-1">
          <FilterButton
            onClick={() => setFilter('all')}
            active={filter === 'all'}
            className="text-xs py-0.5 px-2 bg-white"
            activeClassName="bg-green-500 text-white"
          >
            All
          </FilterButton>
          <FilterButton
            onClick={() => setFilter('wins')}
            active={filter === 'wins'}
            className="text-xs py-0.5 px-2 bg-white"
            activeClassName="bg-green-500 text-white"
          >
            Wins
          </FilterButton>
          <FilterButton
            onClick={() => setFilter('losses')}
            active={filter === 'losses'}
            className="text-xs py-0.5 px-2 bg-white"
            activeClassName="bg-green-500 text-white"
          >
            Losses
          </FilterButton>
          <FilterButton
            onClick={() => setFilter('special')}
            active={filter === 'special'}
            className="text-xs py-0.5 px-2 bg-white"
            activeClassName="bg-green-500 text-white"
          >
            Special
          </FilterButton>
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
            className="space-y-1.5"
          >
            {displayedGames.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No games match your filter criteria
              </div>
            ) : (
              displayedGames.map((game, index) => (
                <GameHistoryItem
                  key={`${game.timestamp}-${index}`}
                  game={game}
                  index={index}
                />
              ))
            )}

            {/* Pagination */}
            {filteredGames.length > itemsPerPage && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameHistory;
