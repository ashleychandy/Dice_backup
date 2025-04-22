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
  // Use our new formatting function instead of the custom validation
  const formattedRolledNumber = formatDiceResult(game.rolledNumber || '0');
  const formattedChosenNumber = formatDiceResult(game.chosenNumber || '0');

  // Ensure required boolean properties have default values
  const isWin = game.isWin === true;
  const isRecovered = game.isRecovered === true;
  const isForceStopped = game.isForceStopped === true;
  const isSpecialResult = game.isSpecialResult === true;

  // Background color based on game result
  const getBgColor = () => {
    try {
      if (isRecovered) return 'bg-blue-500/10';
      if (isForceStopped) return 'bg-yellow-500/10';
      return isWin ? 'bg-gaming-success/10' : 'bg-gaming-error/10';
    } catch (e) {
      // Fallback for any errors
      return 'bg-gray-100';
    }
  };

  // Border color based on game result
  const getBorderColor = () => {
    try {
      if (isRecovered) return 'border-blue-500 bg-blue-500/20';
      if (isForceStopped) return 'border-yellow-500 bg-yellow-500/20';
      return isWin
        ? 'border-gaming-success bg-gaming-success/20'
        : 'border-gaming-error bg-gaming-error/20';
    } catch (e) {
      // Fallback for any errors
      return 'border-gray-300 bg-gray-200';
    }
  };

  // Text color based on game result
  const getTextColor = () => {
    try {
      if (isRecovered) return 'text-blue-500';
      if (isForceStopped) return 'text-yellow-500';
      return isWin ? 'text-gaming-success' : 'text-gaming-error';
    } catch (e) {
      // Fallback for any errors
      return 'text-gray-700';
    }
  };

  // Game result message
  const getResultMessage = () => {
    if (isRecovered) return 'Game was recovered';
    if (isForceStopped) return 'Game was force stopped';

    return (
      <>
        You bet on{' '}
        <span className="font-bold text-gaming-primary">
          {formattedChosenNumber}
        </span>{' '}
        and rolled a{' '}
        <span className={getTextColor()}>{formattedRolledNumber}</span>
      </>
    );
  };

  // Financial result message
  const getFinancialResult = () => {
    if (isSpecialResult) {
      if (Number(game.payout || '0') > 0) {
        return `Refunded ${formatTokenAmount(game.payout || '0')} GAMA`;
      }
      return 'No refund';
    }

    return isWin
      ? `+${formatTokenAmount(game.payout || '0')} GAMA`
      : `-${formatTokenAmount(game.amount || '0')} GAMA`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`history-item ${getBgColor()} p-4 rounded-xl my-2 border border-gray-200 shadow-sm hover:shadow-md`}
      style={{ minHeight: '80px' }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white border-2 
              ${getBorderColor()}`}
          >
            {formattedRolledNumber}
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-white">
              {getResultMessage()}
            </p>
            <p className="text-sm text-gray-500 dark:text-secondary-400">
              {formatTimestamp(game.timestamp || Date.now())}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`font-semibold ${getTextColor()}`}>
            {getFinancialResult()}
          </p>
          <p className="text-xs text-secondary-400">
            Bet: {formatTokenAmount(game.amount || '0')} GAMA
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const GameHistory = ({ account, diceContract, onError }) => {
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();
  const localCacheRef = useRef(null);
  const serviceInitializedRef = useRef(false);

  // Initialize the gameService with the dice contract when it changes
  useEffect(() => {
    if (diceContract && !serviceInitializedRef.current) {
      try {
        console.log(
          'GameHistory: Initializing gameService with contract:',
          diceContract?.target
        );
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
      console.log('GameHistory: Fetching history with account:', account);
      console.log(
        'GameHistory: diceContract initialized:',
        !!diceContract,
        diceContract?.target
      );
      console.log(
        'GameHistory: gameService.diceContract initialized:',
        !!gameService.diceContract
      );

      if (!account) {
        console.log('GameHistory: No account, returning empty data');
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

        const result = await gameService.getGameHistory(account);
        console.log('GameHistory: Fetch result:', result);
        if (result && result.games) {
          localCacheRef.current = result;
        }
        return result;
      } catch (error) {
        console.error('Game history fetch error:', error);
        if (onError) onError(error);
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
    staleTime: 0, // Always fetch fresh data
    cacheTime: 10 * 60 * 1000, // Keep cache for 10 minutes
    enabled: !!account && !!diceContract && serviceInitializedRef.current,
  });

  // Add a method to register a new game result
  const addNewGameResult = gameResult => {
    if (!gameResult || !account) return;

    // Get current data
    const currentData = queryClient.getQueryData(['gameHistory', account]) || {
      games: [],
      stats: {
        totalGamesWon: 0,
        totalGamesLost: 0,
        totalGamesRecovered: 0,
        totalGamesForceStopped: 0,
      },
    };

    // Create updated data with the new game at the beginning
    const updatedData = {
      games: [gameResult, ...currentData.games],
      stats: {
        ...currentData.stats,
        totalGamesWon: gameResult.isWin
          ? currentData.stats.totalGamesWon + 1
          : currentData.stats.totalGamesWon,
        totalGamesLost: !gameResult.isWin
          ? currentData.stats.totalGamesLost + 1
          : currentData.stats.totalGamesLost,
        totalGamesRecovered: gameResult.isRecovered
          ? currentData.stats.totalGamesRecovered + 1
          : currentData.stats.totalGamesRecovered,
        totalGamesForceStopped: gameResult.isForceStopped
          ? currentData.stats.totalGamesForceStopped + 1
          : currentData.stats.totalGamesForceStopped,
      },
    };

    // Update cache and queryClient data
    localCacheRef.current = updatedData;
    queryClient.setQueryData(['gameHistory', account], updatedData);
  };

  // Expose the addNewGameResult method to parent components
  useEffect(() => {
    if (account) {
      // Register this method globally so it can be called from other components
      window.addNewGameResult = addNewGameResult;
    }

    return () => {
      // Clean up global reference when component unmounts
      delete window.addNewGameResult;
    };
  }, [account]);

  // Add a utility function to validate and log game structure
  useEffect(() => {
    if (gameData?.games && gameData.games.length > 0) {
      console.log('GameHistory.validateGames: Checking first game structure:');
      const firstGame = gameData.games[0];
      const requiredFields = [
        'timestamp',
        'chosenNumber',
        'rolledNumber',
        'amount',
        'payout',
        'isWin',
        'isRecovered',
        'isForceStopped',
        'isSpecialResult',
      ];

      const missingFields = requiredFields.filter(
        field => firstGame[field] === undefined || firstGame[field] === null
      );

      console.log('GameHistory.validateGames: Game data structure check:', {
        fieldsPresent: Object.keys(firstGame),
        missingRequiredFields:
          missingFields.length > 0 ? missingFields : 'None',
        sampleGame: firstGame,
      });
    }
  }, [gameData?.games]);

  // Filter games based on selected filter
  const filteredGames = useMemo(() => {
    if (!gameData?.games) return [];

    console.log(
      'GameHistory.filteredGames: Filtering games with filter:',
      filter
    );
    console.log(
      'GameHistory.filteredGames: Total games before filtering:',
      gameData.games.length
    );

    let result = [];
    if (filter === 'all') {
      result = gameData.games;
    } else if (filter === 'wins') {
      result = gameData.games.filter(
        game => game.isWin && !game.isSpecialResult
      );
    } else if (filter === 'losses') {
      result = gameData.games.filter(
        game => !game.isWin && !game.isSpecialResult
      );
      console.log(
        'GameHistory.filteredGames: Losses filtering - checking first few games:',
        gameData.games.slice(0, 3).map(game => ({
          isWin: game.isWin,
          isSpecialResult: game.isSpecialResult,
          matchesFilter: !game.isWin && !game.isSpecialResult,
        }))
      );
    } else if (filter === 'recovered') {
      result = gameData.games.filter(
        game => game.isRecovered || game.isForceStopped
      );
    } else {
      result = gameData.games;
    }

    console.log(
      `GameHistory.filteredGames: After filtering for "${filter}":`,
      result.length
    );
    return result;
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
            {(gameData.stats.totalGamesRecovered > 0 ||
              gameData.stats.totalGamesForceStopped > 0) && (
              <div className="text-center">
                <span className="text-sm text-secondary-400">Recovered</span>
                <p className="font-bold text-blue-500">
                  {gameData.stats.totalGamesRecovered +
                    gameData.stats.totalGamesForceStopped}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          count={gameData?.games?.length || 0}
        >
          All
        </FilterButton>
        <FilterButton
          active={filter === 'wins'}
          onClick={() => setFilter('wins')}
          count={gameData?.stats?.totalGamesWon || 0}
        >
          Wins
        </FilterButton>
        <FilterButton
          active={filter === 'losses'}
          onClick={() => setFilter('losses')}
          count={gameData?.stats?.totalGamesLost || 0}
        >
          Losses
        </FilterButton>
        {(gameData?.stats?.totalGamesRecovered > 0 ||
          gameData?.stats?.totalGamesForceStopped > 0) && (
          <FilterButton
            active={filter === 'recovered'}
            onClick={() => setFilter('recovered')}
            count={
              (gameData?.stats?.totalGamesRecovered || 0) +
              (gameData?.stats?.totalGamesForceStopped || 0)
            }
          >
            Recovered
          </FilterButton>
        )}
      </div>

      {/* Game History List */}
      {isLoading && !localCacheRef.current ? (
        <GameHistoryLoader />
      ) : (
        <>
          {/* Force console output to debug */}
          <div className="hidden">
            {console.log('DIRECT DEBUG - gameData:', gameData)}
            {console.log('DIRECT DEBUG - filteredGames:', filteredGames)}
            {console.log('DIRECT DEBUG - rendering with filter:', filter)}
            {filteredGames &&
              filteredGames.length === 0 &&
              console.log('DIRECT DEBUG - No games to display after filtering')}
          </div>

          {filteredGames.length === 0 ? (
            <EmptyState />
          ) : (
            <AnimatePresence>
              <div className="space-y-1">
                {Array.isArray(filteredGames) ? (
                  filteredGames.length > 0 ? (
                    filteredGames.map((game, index) => {
                      console.log(
                        `DIRECT DEBUG - Rendering game at index ${index}:`,
                        game
                      );
                      return (
                        <GameHistoryItem
                          key={`game-${index}-${game.timestamp || index}`}
                          game={game}
                          index={index}
                        />
                      );
                    })
                  ) : (
                    // Display test data template if no games are found
                    <div>
                      <div className="p-4 mb-4 bg-blue-100 text-blue-800 rounded-lg">
                        No games found in data. Showing sample template:
                      </div>
                      {/* Template items to test rendering */}
                      <GameHistoryItem
                        key="template-1"
                        game={{
                          timestamp: Date.now().toString(),
                          chosenNumber: '3',
                          rolledNumber: '2',
                          amount: '1000000000000000000',
                          payout: '0',
                          isWin: false,
                          isRecovered: false,
                          isForceStopped: false,
                          isSpecialResult: false,
                        }}
                        index={0}
                      />
                      <GameHistoryItem
                        key="template-2"
                        game={{
                          timestamp: (Date.now() - 3600000).toString(),
                          chosenNumber: '4',
                          rolledNumber: '4',
                          amount: '2000000000000000000',
                          payout: '12000000000000000000',
                          isWin: true,
                          isRecovered: false,
                          isForceStopped: false,
                          isSpecialResult: false,
                        }}
                        index={1}
                      />
                    </div>
                  )
                ) : (
                  <div className="p-4 bg-red-100 text-red-700 rounded-lg">
                    Error: Game data is not properly formatted
                  </div>
                )}
              </div>
            </AnimatePresence>
          )}
        </>
      )}
    </Card>
  );
};

export default GameHistory;
