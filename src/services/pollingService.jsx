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

  // Fetch data from blockchain
  const fetchData = async () => {
    if (!diceContract || !account) {
      return;
    }

    // Update isLoading state
    setGameData(prev => ({ ...prev, isLoading: true }));

    try {
      console.log('DEBUG - Starting fetchData:', {
        hasContract: !!diceContract,
        account,
        contractMethods: Object.keys(diceContract).filter(
          key => typeof diceContract[key] === 'function'
        ),
      });

      // Check which methods exist on the contract
      const hasGetGameStatus = typeof diceContract.getGameStatus === 'function';
      const hasGetBetHistory = typeof diceContract.getBetHistory === 'function';
      const hasGetContractStats =
        typeof diceContract.getContractStats === 'function';

      console.log('DEBUG - Available contract methods:', {
        hasGetGameStatus,
        hasGetBetHistory,
        hasGetContractStats,
      });

      // Define promises based on available methods
      let promises = [];
      let promiseTypes = [];

      // 1. Game status
      if (hasGetGameStatus) {
        promises.push(
          diceContract.getGameStatus(account).catch(error => {
            console.error('Error fetching game status:', error);
            return null;
          })
        );
        promiseTypes.push('gameStatus');
      } else {
        promises.push(Promise.resolve(null));
        promiseTypes.push('gameStatus');
      }

      // 2. Bet history
      if (hasGetBetHistory) {
        promises.push(
          diceContract.getBetHistory(account).catch(error => {
            console.error('Error fetching bet history:', error);
            return [];
          })
        );
        promiseTypes.push('betHistory');
      } else {
        promises.push(Promise.resolve([]));
        promiseTypes.push('betHistory');
      }

      // 3. Contract stats (only if method exists)
      if (hasGetContractStats) {
        promises.push(
          diceContract.getContractStats().catch(error => {
            console.error('Error fetching contract stats:', error);
            return null;
          })
        );
        promiseTypes.push('contractStats');
      }

      // Wait for all promises to resolve
      const results = await Promise.allSettled(promises);

      console.log('DEBUG - Fetch results:', {
        results: results.map((r, i) => ({
          type: promiseTypes[i],
          status: r.status,
          hasValue: r.status === 'fulfilled' && r.value !== null,
        })),
      });

      // Extract results
      let gameStatus = {};
      let betHistory = [];
      let contractStats = null;

      // Process results by checking the type we stored
      results.forEach((result, index) => {
        const type = promiseTypes[index];

        if (result.status === 'fulfilled') {
          if (type === 'gameStatus' && result.value) {
            const status = result.value;

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

            // Don't set hasActiveGame here - we'll do it after all data is processed
          } else if (type === 'betHistory') {
            betHistory = processBetHistory(result.value);
          } else if (type === 'contractStats') {
            contractStats = result.value;
          }
        }
      });

      // Update active game status together with other state updates to prevent infinite loops
      if (gameStatus?.isActive !== undefined) {
        setHasActiveGame(gameStatus.isActive);
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
    console.log('DEBUG - Processing bet history:', {
      receivedData: !!bets,
      isArray: Array.isArray(bets),
      length: bets?.length || 0,
      rawData: bets,
    });

    if (!bets || !Array.isArray(bets)) return [];

    const RESULT_FORCE_STOPPED = 254;
    const RESULT_RECOVERED = 255;

    const processedBets = bets
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

    console.log('DEBUG - Processed bet history:', {
      processedLength: processedBets.length,
      processedData: processedBets,
    });

    return processedBets;
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
