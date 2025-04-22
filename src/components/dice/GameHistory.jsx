import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../ui/Card';
import {
  formatTokenAmount,
  formatTimestamp,
  formatDiceResult,
} from '../../utils/formatting';
import gameService from '../../services/gameService';
import FilterButton from '../ui/FilterButton';

// GameHistoryLoader is now imported from separate file
import GameHistoryLoader from './GameHistoryLoader';

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="w-20 h-20 rounded-full bg-secondary-800/50 flex items-center justify-center mb-4">
      <svg
        className="w-10 h-10 text-secondary-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </div>
    <h3 className="text-xl font-bold text-white/90 mb-2">
      No games played yet
    </h3>
    <p className="text-secondary-400 mb-6">
      Your game history will appear here after you play.
    </p>
  </div>
);

// Moved GameHistoryItem to its own file
import GameHistoryItem from './GameHistoryItem';

// New Component: Stats Panel
const StatsSummary = ({ stats, totalWagered, totalPayout }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
    <div className="bg-secondary-800/30 rounded-xl p-3 text-center">
      <p className="text-sm text-secondary-400">Games Won</p>
      <p className="text-xl font-bold text-gaming-success">
        {stats.totalGamesWon || 0}
      </p>
    </div>
    <div className="bg-secondary-800/30 rounded-xl p-3 text-center">
      <p className="text-sm text-secondary-400">Games Lost</p>
      <p className="text-xl font-bold text-gaming-error">
        {stats.totalGamesLost || 0}
      </p>
    </div>
    <div className="bg-secondary-800/30 rounded-xl p-3 text-center">
      <p className="text-sm text-secondary-400">Total Wagered</p>
      <p className="text-xl font-bold text-white">
        {formatTokenAmount(totalWagered || '0', 2)} GAMA
      </p>
    </div>
    <div className="bg-secondary-800/30 rounded-xl p-3 text-center">
      <p className="text-sm text-secondary-400">Total Payout</p>
      <p className="text-xl font-bold text-white">
        {formatTokenAmount(totalPayout || '0', 2)} GAMA
      </p>
    </div>
  </div>
);

// New Component: Pagination
const Pagination = ({ currentPage, totalPages, onPageChange }) => (
  <div className="flex justify-center items-center mt-6 space-x-2">
    <button
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
      className={`px-3 py-1 rounded-lg text-sm ${
        currentPage === 1
          ? 'bg-secondary-800/30 text-secondary-500'
          : 'bg-secondary-800 text-white hover:bg-secondary-700'
      }`}
    >
      Previous
    </button>
    <span className="text-secondary-400 text-sm">
      Page {currentPage} of {totalPages || 1}
    </span>
    <button
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages || totalPages === 0}
      className={`px-3 py-1 rounded-lg text-sm ${
        currentPage === totalPages || totalPages === 0
          ? 'bg-secondary-800/30 text-secondary-500'
          : 'bg-secondary-800 text-white hover:bg-secondary-700'
      }`}
    >
      Next
    </button>
  </div>
);

// Enhanced GameHistory Component
const GameHistory = ({ account, diceContract, onError }) => {
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Default 10 items per page
  const queryClient = useQueryClient();
  const localCacheRef = useRef(null);
  const serviceInitializedRef = useRef(false);

  // Reset to page 1 when changing filters
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // Initialize the gameService with the dice contract when it changes
  useEffect(() => {
    if (diceContract && !serviceInitializedRef.current) {
      try {
        gameService.init({ dice: diceContract });
        serviceInitializedRef.current = true;
      } catch (error) {
        console.error('Error initializing gameService:', error);
        if (onError) onError(error);
      }
    }
  }, [diceContract, onError]);

  // Get previous query data immediately for instant UI
  useEffect(() => {
    if (account) {
      const previousData = queryClient.getQueryData(['gameHistory', account]);
      if (previousData) {
        localCacheRef.current = previousData;
      }
    }
  }, [account, queryClient]);

  // Optimized query with instant loading
  const { data: gameData, isLoading } = useQuery({
    queryKey: ['gameHistory', account],
    queryFn: async () => {
      if (!account) {
        return {
          games: [],
          stats: {
            totalGamesWon: 0,
            totalGamesLost: 0,
            totalGamesRecovered: 0,
            totalGamesForceStopped: 0,
          },
        };
      }

      if (!diceContract || !gameService.diceContract) {
        console.error('GameHistory: No dice contract available');
        return {
          games: [],
          stats: {
            totalGamesWon: 0,
            totalGamesLost: 0,
            totalGamesRecovered: 0,
            totalGamesForceStopped: 0,
          },
        };
      }

      try {
        // Return cached data immediately if available
        if (localCacheRef.current) {
          // Schedule a background refresh without blocking the UI
          setTimeout(() => {
            gameService.getGameHistory(account).then(freshData => {
              if (freshData && freshData.games) {
                localCacheRef.current = freshData;
                queryClient.setQueryData(['gameHistory', account], freshData);
              }
            });
          }, 0);

          return localCacheRef.current;
        }

        return await gameService.getGameHistory(account);
      } catch (error) {
        console.error('Error in game history query:', error);
        // Don't show UI error, just return empty data
        return {
          games: [],
          stats: {
            totalGamesWon: 0,
            totalGamesLost: 0,
            totalGamesRecovered: 0,
            totalGamesForceStopped: 0,
          },
        };
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  });

  // Computed properties for UI from game data
  const {
    filteredGames,
    totalGames,
    totalPages,
    displayedGames,
    stats,
    totalWagered,
    totalPayout,
  } = useMemo(() => {
    const games = gameData?.games || [];
    const stats = gameData?.stats || {
      totalGamesWon: 0,
      totalGamesLost: 0,
      totalGamesRecovered: 0,
      totalGamesForceStopped: 0,
    };

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

    // Calculate stats for all games
    const totalWagered = games.reduce(
      (sum, game) => sum + BigInt(game.amount || '0'),
      BigInt(0)
    );

    const totalPayout = games.reduce(
      (sum, game) => sum + BigInt(game.payout || '0'),
      BigInt(0)
    );

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
      totalGames: games.length,
      totalPages,
      displayedGames,
      stats,
      totalWagered,
      totalPayout,
    };
  }, [gameData, filter, currentPage, itemsPerPage]);

  // Handle page change
  const handlePageChange = page => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <Card className="min-h-[300px] mt-6">
      <div className="flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h2 className="text-xl font-bold mb-4 md:mb-0">Game History</h2>

          <div className="flex flex-wrap gap-2">
            <FilterButton
              onClick={() => setFilter('all')}
              active={filter === 'all'}
              count={totalGames}
            >
              All Games
            </FilterButton>
            <FilterButton
              onClick={() => setFilter('wins')}
              active={filter === 'wins'}
              count={stats.totalGamesWon}
            >
              Wins
            </FilterButton>
            <FilterButton
              onClick={() => setFilter('losses')}
              active={filter === 'losses'}
              count={stats.totalGamesLost}
            >
              Losses
            </FilterButton>
            <FilterButton
              onClick={() => setFilter('special')}
              active={filter === 'special'}
              count={
                (stats.totalGamesRecovered || 0) +
                (stats.totalGamesForceStopped || 0)
              }
            >
              Special
            </FilterButton>
          </div>
        </div>

        {/* Stats Summary Panel */}
        {gameData && gameData.games.length > 0 && (
          <StatsSummary
            stats={stats}
            totalWagered={totalWagered}
            totalPayout={totalPayout}
          />
        )}

        {isLoading && <GameHistoryLoader />}

        {!isLoading &&
          (!gameData || !gameData.games || gameData.games.length === 0) && (
            <EmptyState />
          )}

        <AnimatePresence>
          {!isLoading && gameData && gameData.games.length > 0 && (
            <div className="space-y-3">
              {displayedGames.length === 0 ? (
                <div className="text-center py-8 text-secondary-400">
                  No games match your selected filter.
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

              {filteredGames.length > itemsPerPage && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};

export default GameHistory;
