import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';

// Create a context to share polling data
export const PollingContext = createContext(null);

export const PollingProvider = ({
  children,
  diceContract,
  account,
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
    isNewUser: true, // Add new state to track if user is new
  });

  // Add state to track if there's an active game
  const [hasActiveGame, setHasActiveGame] = useState(false);

  // Use refs for values we need to access in effects but don't want to cause re-renders
  const isNewUserRef = useRef(gameData.isNewUser);
  const diceContractRef = useRef(diceContract);
  const accountRef = useRef(account);

  // Update refs when dependencies change
  useEffect(() => {
    isNewUserRef.current = gameData.isNewUser;
    diceContractRef.current = diceContract;
    accountRef.current = account;
  }, [gameData.isNewUser, diceContract, account]);

  // Determine current polling interval based on game state
  const currentPollingInterval = hasActiveGame
    ? activeGameInterval
    : inactiveInterval;

  // Fetch data from blockchain
  const fetchData = useCallback(async () => {
    const currentContract = diceContractRef.current;
    const currentAccount = accountRef.current;

    if (!currentContract || !currentAccount) {
      return;
    }

    // Update isLoading state
    setGameData(prev => ({ ...prev, isLoading: true }));

    try {
      // Check which methods exist on the contract
      const hasGetGameStatus =
        typeof currentContract.getGameStatus === 'function';
      const hasGetBetHistory =
        typeof currentContract.getBetHistory === 'function';
      const hasGetContractStats =
        typeof currentContract.getContractStats === 'function';

      // Define promises based on available methods
      let promises = [];
      let promiseTypes = [];

      // 1. Game status
      if (hasGetGameStatus) {
        promises.push(
          currentContract.getGameStatus(currentAccount).catch(_error => {
            // Handle error silently
            return null;
          })
        );
        promiseTypes.push('gameStatus');
      } else {
        promises.push(Promise.resolve(null));
        promiseTypes.push('gameStatus');
      }

      // 2. Bet history - Only fetch if user has placed bets before or there's an active game
      // For new users without any bets yet, we'll skip this call to save resources
      const currentIsNewUser = isNewUserRef.current;
      if (hasGetBetHistory && (!currentIsNewUser || hasActiveGame)) {
        promises.push(
          currentContract.getBetHistory(currentAccount).catch(_error => {
            // Handle error silently
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
          currentContract.getContractStats().catch(_error => {
            // Handle error silently
            return null;
          })
        );
        promiseTypes.push('contractStats');
      }

      // Wait for all promises to resolve
      const results = await Promise.allSettled(promises);

      // Extract results
      let gameStatus = {};
      let betHistory = [];
      let contractStats = null;
      let userHasPlacedBets = false;

      // Process results by checking the type we stored
      results.forEach((result, index) => {
        const type = promiseTypes[index];

        if (result.status === 'fulfilled') {
          if (type === 'gameStatus' && result.value) {
            const status = result.value;

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

            // Check if user has placed bets before based on lastPlayTimestamp
            if (status.lastPlayTimestamp > 0) {
              userHasPlacedBets = true;
            }
          } else if (type === 'betHistory') {
            betHistory = processBetHistory(result.value);

            // If we got any bet history, user is not new
            if (betHistory && betHistory.length > 0) {
              userHasPlacedBets = true;
            }
          } else if (type === 'contractStats') {
            contractStats = result.value;
          }
        }
      });

      // Update state with all data in a single setState call to avoid multiple re-renders
      setGameData({
        gameStatus,
        betHistory,
        contractStats,
        isLoading: false,
        lastUpdated: Date.now(),
        error: null,
        isNewUser: !userHasPlacedBets, // Update new user state
      });

      // Update active game status after state update to avoid circular dependencies
      if (gameStatus?.isActive !== undefined) {
        setHasActiveGame(gameStatus.isActive);
      }
    } catch (error) {
      setGameData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch game data',
        lastUpdated: Date.now(),
      }));
    }
  }, [hasActiveGame]); // Only depend on hasActiveGame, use refs for other values

  // Process bet history data
  const processBetHistory = bets => {
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
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp);

    return processedBets;
  };

  // Set up polling interval - Only poll if user has placed bets or has an active game
  useEffect(() => {
    // Initial fetch (we'll always do one fetch to determine if user is new)
    fetchData();

    // Only set up polling if user has placed bets or has an active game
    if (!isNewUserRef.current || hasActiveGame) {
      const intervalId = setInterval(fetchData, currentPollingInterval);
      return () => clearInterval(intervalId);
    }

    // If new user and no active game, don't set up polling
    return undefined;
  }, [fetchData, currentPollingInterval]);

  // Create a manual refresh function that uses the useCallback for stability
  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Value to be provided through context
  const contextValue = {
    // Game data
    gameStatus: gameData.gameStatus,
    betHistory: gameData.betHistory,
    contractStats: gameData.contractStats,
    isNewUser: gameData.isNewUser,

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
