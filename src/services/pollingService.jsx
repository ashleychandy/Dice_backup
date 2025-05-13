import { createContext, useContext, useEffect, useState } from 'react';

// Create a context to share polling data
export const PollingContext = createContext(null);

export const PollingProvider = ({
  children,
  diceContract,
  account,
  defaultInterval = 5000,
  activeGameInterval = 2000, // Poll more frequently during active games
  inactiveInterval = 10000, // Poll less frequently when idle
}) => {
  // State to hold all fetched data
  const [gameData, setGameData] = useState({
    gameStatus: null,
    betHistory: [],
    contractStats: null,
    isLoading: true,
    lastUpdated: null,
    error: null,
  });

  // Add state to track if there's an active game
  const [hasActiveGame, setHasActiveGame] = useState(false);

  // Determine current polling interval based on game state
  const currentPollingInterval = hasActiveGame
    ? activeGameInterval
    : inactiveInterval;

  // Fetch all relevant data in a single batch
  const fetchData = async () => {
    if (!diceContract || !account) {
      setGameData(prev => ({
        ...prev,
        isLoading: false,
      }));
      return;
    }

    // Set loading state for initial fetch
    if (gameData.lastUpdated === null) {
      setGameData(prev => ({ ...prev, isLoading: true }));
    }

    try {
      // Start all requests concurrently
      const promises = [diceContract.getGameStatus(account)];

      // Add bet history request if the method exists
      if (
        diceContract.getBetHistory &&
        typeof diceContract.getBetHistory === 'function'
      ) {
        promises.push(diceContract.getBetHistory(account));
      } else {
        promises.push(Promise.resolve([]));
      }

      // Add contract stats request if the method exists
      if (
        diceContract.getContractStats &&
        typeof diceContract.getContractStats === 'function'
      ) {
        promises.push(diceContract.getContractStats());
      } else {
        promises.push(Promise.resolve(null));
      }

      // Wait for all promises to resolve
      const [gameStatusResult, betHistoryResult, contractStatsResult] =
        await Promise.allSettled(promises);

      // Process game status
      let gameStatus = null;
      if (gameStatusResult.status === 'fulfilled') {
        const status = gameStatusResult.value;

        // For debugging purposes, log the raw status
        console.log('Raw game status from contract:', status);

        gameStatus = {
          isActive: status.isActive,
          isWin: status.isWin,
          isCompleted: status.isCompleted,
          chosenNumber: Number(status.chosenNumber),
          amount: status.amount.toString(),
          result: Number(status.result),
          payout: status.payout.toString(),
          requestId: status.requestId.toString(),
          recoveryEligible: status.recoveryEligible,
          lastPlayTimestamp: Number(status.lastPlayTimestamp),
          requestExists: status.requestExists,
          requestProcessed: status.requestProcessed,
          // Derive requestFulfilled from requestProcessed which is what the contract returns
          requestFulfilled: status.requestProcessed,
        };

        // Update active game status
        setHasActiveGame(status.isActive);
      }

      // Process bet history
      let betHistory = [];
      if (betHistoryResult.status === 'fulfilled') {
        betHistory = processBetHistory(betHistoryResult.value);
      }

      // Process contract stats
      let contractStats = null;
      if (
        contractStatsResult.status === 'fulfilled' &&
        contractStatsResult.value
      ) {
        contractStats = contractStatsResult.value;
      }

      // Update state with all data
      setGameData({
        gameStatus,
        betHistory,
        contractStats,
        isLoading: false,
        lastUpdated: Date.now(),
        error: null,
      });
    } catch (error) {
      console.error('Error in polling service:', error);
      setGameData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch game data',
        lastUpdated: Date.now(),
      }));
    }
  };

  // Process bet history data
  const processBetHistory = bets => {
    if (!bets || !Array.isArray(bets)) return [];

    const RESULT_FORCE_STOPPED = 254;
    const RESULT_RECOVERED = 255;

    return bets
      .map(bet => {
        try {
          const rolledNumber = Number(bet.rolledNumber);
          let resultType = 'normal';

          if (rolledNumber === RESULT_FORCE_STOPPED)
            resultType = 'force_stopped';
          else if (rolledNumber === RESULT_RECOVERED) resultType = 'recovered';
          else if (rolledNumber < 1 || rolledNumber > 6) resultType = 'unknown';

          return {
            timestamp: Number(bet.timestamp),
            chosenNumber: Number(bet.chosenNumber),
            rolledNumber,
            amount: bet.amount.toString(),
            payout: bet.payout.toString(),
            isWin:
              resultType === 'normal' &&
              rolledNumber === Number(bet.chosenNumber),
            resultType,
            status:
              resultType === 'force_stopped'
                ? 'Force Stopped'
                : resultType === 'recovered'
                  ? 'Recovered'
                  : resultType === 'normal'
                    ? rolledNumber === Number(bet.chosenNumber)
                      ? 'Won'
                      : 'Lost'
                    : 'Unknown',
          };
        } catch (error) {
          console.error('Error processing bet:', error);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp);
  };

  // Set up polling interval
  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up polling interval
    const intervalId = setInterval(fetchData, currentPollingInterval);

    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [diceContract, account, currentPollingInterval]);

  // Create a manual refresh function
  const refreshData = () => {
    setGameData(prev => ({ ...prev, isLoading: true }));
    fetchData();
  };

  // Value to be provided through context
  const contextValue = {
    // Game data
    gameStatus: gameData.gameStatus,
    betHistory: gameData.betHistory,
    contractStats: gameData.contractStats,

    // Status indicators
    isLoading: gameData.isLoading,
    error: gameData.error,
    lastUpdated: gameData.lastUpdated,

    // Methods
    refreshData,
    isStale: (maxAge = 10000) =>
      gameData.lastUpdated && Date.now() - gameData.lastUpdated > maxAge,
  };

  return (
    <PollingContext.Provider value={contextValue}>
      {children}
    </PollingContext.Provider>
  );
};

// Custom hook to use the polling service
export const usePollingService = () => {
  const context = useContext(PollingContext);
  if (!context) {
    throw new Error('usePollingService must be used within a PollingProvider');
  }
  return context;
};
