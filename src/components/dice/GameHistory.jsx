import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../ui/Card';
import { formatTokenAmount, formatTimestamp } from '../../utils/formatting';
import gameService from '../../services/gameService';
import FilterButton from '../ui/FilterButton';

const GameHistoryLoader = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-20 bg-secondary-800/50 rounded-xl w-full"></div>
    <div className="h-20 bg-secondary-800/50 rounded-xl w-full"></div>
    <div className="h-20 bg-secondary-800/50 rounded-xl w-full"></div>
  </div>
);

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

const GameHistoryItem = ({ game, index }) => {
  const validateGameNumber = num => {
    if (!num || isNaN(num)) return 1;
    const number = Number(num);
    if (number < 1 || number > 6) return 1;
    return number;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`history-item ${
        game.isWin ? 'bg-gaming-success/10' : 'bg-gaming-error/10'
      }`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white border-2 
              ${
                game.isWin
                  ? 'border-gaming-success bg-gaming-success/20'
                  : 'border-gaming-error bg-gaming-error/20'
              }`}
          >
            {validateGameNumber(game.rolledNumber)}
          </div>
          <div>
            <p className="font-semibold text-white">
              You bet on{' '}
              <span className="font-bold text-gaming-primary">
                {validateGameNumber(game.chosenNumber)}
              </span>{' '}
              and rolled a{' '}
              <span
                className={
                  game.isWin ? 'text-gaming-success' : 'text-gaming-error'
                }
              >
                {validateGameNumber(game.rolledNumber)}
              </span>
            </p>
            <p className="text-sm text-secondary-400">
              {formatTimestamp(game.timestamp)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={`font-semibold ${
              game.isWin ? 'text-gaming-success' : 'text-gaming-error'
            }`}
          >
            {game.isWin
              ? `+${formatTokenAmount(game.payout)} GAMA`
              : `-${formatTokenAmount(game.amount)} GAMA`}
          </p>
          <p className="text-xs text-secondary-400">
            Bet: {formatTokenAmount(game.amount)} GAMA
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const GameHistory = ({ account }) => {
  const [filter, setFilter] = useState('all');

  const { data: gameData, isLoading } = useQuery({
    queryKey: ['gameHistory', account],
    queryFn: async () => {
      if (!account) {
        return { games: [], stats: { totalGamesWon: 0, totalGamesLost: 0 } };
      }

      try {
        return await gameService.getGameHistory(account);
      } catch (error) {
        console.error('Error fetching game history:', error);
        return { games: [], stats: { totalGamesWon: 0, totalGamesLost: 0 } };
      }
    },
    refetchInterval: 10000,
    enabled: !!account,
  });

  // Filter games based on selected filter
  const filteredGames = useMemo(() => {
    if (!gameData?.games) return [];
    if (filter === 'all') return gameData.games;
    if (filter === 'wins') return gameData.games.filter(game => game.isWin);
    if (filter === 'losses') return gameData.games.filter(game => !game.isWin);
    return gameData.games;
  }, [gameData?.games, filter]);

  return (
    <Card className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white/90">Game History</h2>
        {gameData?.stats && (
          <div className="flex gap-3">
            <div className="text-center">
              <span className="text-sm text-secondary-400">Won</span>
              <p className="font-bold text-gaming-success">
                {gameData.stats.totalGamesWon}
              </p>
            </div>
            <div className="text-center">
              <span className="text-sm text-secondary-400">Lost</span>
              <p className="font-bold text-gaming-error">
                {gameData.stats.totalGamesLost}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All Games
        </FilterButton>
        <FilterButton
          active={filter === 'wins'}
          onClick={() => setFilter('wins')}
        >
          Wins
        </FilterButton>
        <FilterButton
          active={filter === 'losses'}
          onClick={() => setFilter('losses')}
        >
          Losses
        </FilterButton>
      </div>

      {/* Game List */}
      <div className="space-y-4">
        {isLoading ? (
          <GameHistoryLoader />
        ) : filteredGames.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence>
            {filteredGames.map((game, index) => (
              <GameHistoryItem key={game.timestamp} game={game} index={index} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </Card>
  );
};

export default GameHistory;
