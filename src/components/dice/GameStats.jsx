import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { formatTokenAmount, formatTimestamp } from '../../utils/formatting';
import gameService from '../../services/gameService';

// Helper function to format time elapsed
const formatTimeElapsed = seconds => {
  if (!seconds) return '0s';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
};

const GameStats = ({ account, diceContract, onError, addToast }) => {
  const [recoveryState, setRecoveryState] = useState({
    eligible: false,
    isLoading: false,
    timeElapsed: 0,
    lastPlayTimestamp: 0,
    secondsUntilEligible: null,
    recoveryTimeoutPeriod: 300, // Default 5 minutes
  });

  // Timer for active games
  const [activeGameTimer, setActiveGameTimer] = useState(0);

  // Countdown timer for recovery eligibility
  const [recoveryCountdown, setRecoveryCountdown] = useState(null);

  // Debug state
  const [debugInfo, setDebugInfo] = useState(null);
  const [isDebugging, setIsDebugging] = useState(false);

  // Use React Query for fetching stats
  const {
    data: stats,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['gameStats', account],
    queryFn: async () => {
      if (!account) {
        return {
          gamesPlayed: 0,
          totalWinnings: BigInt(0),
          lastPlayed: 0,
          currentGameActive: false,
          currentGameWin: false,
        };
      }

      try {
        return await gameService.getUserStats(account);
      } catch (error) {
        console.error('Error fetching game stats:', error);
        throw error;
      }
    },
    refetchInterval: 10000,
    enabled: !!account,
  });

  // Initialize gameService with contract when available
  useEffect(() => {
    if (diceContract) {
      try {
        gameService.init({ dice: diceContract });
        console.log('GameStats DEBUG: gameService initialized with contract');
      } catch (error) {
        console.error(
          'GameStats DEBUG: Error initializing gameService:',
          error
        );
        onError?.(error);
      }
    }
  }, [diceContract, onError]);

  // Update the timer for active games
  useEffect(() => {
    let interval;

    if (stats?.currentGameActive || recoveryState.eligible) {
      interval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const lastPlayed = stats?.lastPlayed || recoveryState.lastPlayTimestamp;
        if (lastPlayed > 0) {
          const elapsed = now - lastPlayed;
          setActiveGameTimer(elapsed);
        }
      }, 1000);
    } else {
      setActiveGameTimer(0);
    }

    return () => clearInterval(interval);
  }, [
    stats?.currentGameActive,
    stats?.lastPlayed,
    recoveryState.eligible,
    recoveryState.lastPlayTimestamp,
  ]);

  // Update the countdown timer for recovery eligibility
  useEffect(() => {
    let interval;

    if (
      recoveryState.secondsUntilEligible !== null &&
      recoveryState.secondsUntilEligible > 0
    ) {
      setRecoveryCountdown(recoveryState.secondsUntilEligible);

      interval = setInterval(() => {
        setRecoveryCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            // Trigger a check for recovery eligibility when countdown reaches zero
            refetch();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setRecoveryCountdown(null);
    }

    return () => clearInterval(interval);
  }, [recoveryState.secondsUntilEligible, refetch]);

  // Check if user has a game eligible for recovery
  useEffect(() => {
    if (!account) return;

    const checkRecovery = async () => {
      try {
        // DEBUG LOGS - REMOVE AFTER DEBUGGING
        console.log('GameStats DEBUG: Checking recovery eligibility');

        const {
          eligible,
          isActive,
          lastPlayTimestamp,
          secondsUntilEligible,
          timeElapsed,
          recoveryTimeoutPeriod,
        } = await gameService.checkGameRecoveryEligibility(account);

        // DEBUG LOGS - REMOVE AFTER DEBUGGING
        console.log('GameStats DEBUG: Recovery check result:', {
          eligible,
          isActive,
          lastPlayTimestamp,
          secondsUntilEligible,
          timeSinceLastPlay: timeElapsed,
          recoveryTimeoutPeriod,
          currentRecoveryState: recoveryState,
        });

        // Update recovery state
        setRecoveryState(prev => ({
          ...prev,
          eligible,
          lastPlayTimestamp,
          timeElapsed,
          secondsUntilEligible,
          recoveryTimeoutPeriod,
        }));
      } catch (error) {
        console.error(
          'GameStats DEBUG: Failed to check recovery eligibility:',
          error
        );
      }
    };

    checkRecovery();
    const interval = setInterval(checkRecovery, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [account]);

  const handleRecoverGame = async () => {
    if (!account || !recoveryState.eligible) return;

    // DEBUG LOGS - REMOVE AFTER DEBUGGING
    console.log('GameStats DEBUG: Attempting to recover game');
    setRecoveryState(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await gameService.recoverStuckGame();

      // DEBUG LOGS - REMOVE AFTER DEBUGGING
      console.log('GameStats DEBUG: Recovery result:', result);

      if (result.success) {
        addToast?.('Game recovered successfully!', 'success');
        // Update recovery eligibility and refresh stats
        setRecoveryState(prev => ({
          ...prev,
          eligible: false,
          isLoading: false,
          timeElapsed: 0,
          secondsUntilEligible: null,
        }));
        console.log('GameStats DEBUG: Refreshing stats after recovery');
        refetch();
      }
    } catch (error) {
      console.error('GameStats DEBUG: Error recovering game:', error);
      onError?.(error);
      addToast?.('Failed to recover game: ' + error.message, 'error');
    } finally {
      setRecoveryState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Debug game state function
  const handleDebugGameState = async () => {
    if (!account) {
      addToast?.(
        'Please connect your wallet to debug your game state.',
        'error'
      );
      return;
    }

    setIsDebugging(true);
    setDebugInfo(null);

    try {
      console.log('GameStats DEBUG: Running advanced debugging');
      const debugResult = await gameService.debugGameState(account);

      if (debugResult.error) {
        console.error('GameStats DEBUG: Debug error:', debugResult.error);
        addToast?.(debugResult.details || debugResult.error, 'error');
        setDebugInfo(null);
      } else {
        setDebugInfo(debugResult);
        console.log('GameStats DEBUG: Debug results obtained', debugResult);
        addToast?.(
          'Debug information collected. Check browser console.',
          'info'
        );
      }
    } catch (error) {
      console.error('GameStats DEBUG: Error during debugging:', error);
      addToast?.('Error debugging game state: ' + error.message, 'error');
    } finally {
      setIsDebugging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-secondary-800/50 rounded w-1/3"></div>
        <div className="h-8 bg-secondary-800/50 rounded w-2/3"></div>
        <div className="h-8 bg-secondary-800/50 rounded w-1/2"></div>
      </div>
    );
  }

  // Calculate recovery progress percentage
  let recoveryProgressPercentage = 0;
  if (recoveryState.recoveryTimeoutPeriod > 0 && activeGameTimer > 0) {
    recoveryProgressPercentage = Math.min(
      100,
      (activeGameTimer / recoveryState.recoveryTimeoutPeriod) * 100
    );
  }

  return (
    <div className="space-y-6">
      {/* Always visible debug button */}
      <Card className="bg-gray-800/20 p-4 border border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-medium text-white/80">
              Game Troubleshooting
            </h3>
            <p className="text-xs text-gray-400">
              Having issues with your game? Click debug to check your game
              state.
            </p>
          </div>
          <Button
            variant="primary"
            size="small"
            onClick={handleDebugGameState}
            isLoading={isDebugging}
            disabled={!account || !gameService.diceContract}
            title={
              !account || !gameService.diceContract
                ? 'Connect wallet and ensure contract is available to debug'
                : 'Run game state diagnostics'
            }
          >
            Debug My Game
          </Button>
        </div>

        {/* Always visible debug info */}
        {debugInfo && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-medium text-white/80 mb-2">
              Game State Debug Summary:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-secondary-800/30 p-2 rounded">
                <span className="text-secondary-400">Game Active:</span>{' '}
                <span
                  className={
                    debugInfo?.gameStatus?.isActive === true ||
                    debugInfo?.gameStatus?.isActive === 'true'
                      ? 'text-yellow-500'
                      : 'text-green-500'
                  }
                >
                  {debugInfo?.gameStatus?.isActive === true ||
                  debugInfo?.gameStatus?.isActive === 'true'
                    ? 'Yes'
                    : 'No'}
                </span>
              </div>
              <div className="bg-secondary-800/30 p-2 rounded">
                <span className="text-secondary-400">Recovery Eligible:</span>{' '}
                <span
                  className={
                    debugInfo?.gameStatus?.recoveryEligible === true ||
                    debugInfo?.gameStatus?.recoveryEligible === 'true'
                      ? 'text-green-500'
                      : 'text-yellow-500'
                  }
                >
                  {debugInfo?.gameStatus?.recoveryEligible === true ||
                  debugInfo?.gameStatus?.recoveryEligible === 'true'
                    ? 'Yes'
                    : 'No'}
                </span>
              </div>
              <div className="bg-secondary-800/30 p-2 rounded">
                <span className="text-secondary-400">VRF Request Exists:</span>{' '}
                <span
                  className={
                    debugInfo?.gameStatus?.requestExists === true ||
                    debugInfo?.gameStatus?.requestExists === 'true'
                      ? 'text-yellow-500'
                      : 'text-green-500'
                  }
                >
                  {debugInfo?.gameStatus?.requestExists === true ||
                  debugInfo?.gameStatus?.requestExists === 'true'
                    ? 'Yes'
                    : 'No'}
                </span>
              </div>
              <div className="bg-secondary-800/30 p-2 rounded">
                <span className="text-secondary-400">
                  VRF Request Processed:
                </span>{' '}
                <span
                  className={
                    debugInfo?.gameStatus?.requestProcessed === true ||
                    debugInfo?.gameStatus?.requestProcessed === 'true'
                      ? 'text-green-500'
                      : 'text-yellow-500'
                  }
                >
                  {debugInfo?.gameStatus?.requestProcessed === true ||
                  debugInfo?.gameStatus?.requestProcessed === 'true'
                    ? 'Yes'
                    : 'No'}
                </span>
              </div>
              <div className="bg-secondary-800/30 p-2 rounded">
                <span className="text-secondary-400">Can Start New Game:</span>{' '}
                <span
                  className={
                    debugInfo?.canStartNewGame === true ||
                    debugInfo?.canStartNewGame === 'true'
                      ? 'text-green-500'
                      : 'text-yellow-500'
                  }
                >
                  {debugInfo?.canStartNewGame === true ||
                  debugInfo?.canStartNewGame === 'true'
                    ? 'Yes'
                    : 'No'}
                </span>
              </div>
              <div className="bg-secondary-800/30 p-2 rounded">
                <span className="text-secondary-400">Result:</span>{' '}
                <span className="font-semibold">
                  {debugInfo?.gameStatus?.result === '0'
                    ? 'Not rolled yet'
                    : debugInfo?.gameStatus?.result}
                </span>
              </div>

              {/* Additional troubleshooting information */}
              <div className="bg-secondary-800/30 p-2 rounded col-span-3">
                <span className="text-secondary-400">Current Request ID:</span>{' '}
                <span className="font-mono">
                  {debugInfo?.gameStatus?.requestId &&
                  debugInfo?.gameStatus?.requestId !== '0'
                    ? debugInfo?.gameStatus?.requestId
                    : 'None'}
                </span>
              </div>

              <div className="bg-secondary-800/30 p-2 rounded col-span-3">
                <span className="text-secondary-400">Betting Status:</span>{' '}
                <span className="font-semibold">
                  {!debugInfo?.canStartNewGame
                    ? "Can't place new bet - "
                    : 'Can place new bet'}
                  {!debugInfo?.canStartNewGame && (
                    <>
                      {debugInfo?.gameStatus?.isActive &&
                      !debugInfo?.gameStatus?.recoveryEligible
                        ? 'Game active but not recovery eligible yet'
                        : debugInfo?.gameStatus?.isActive &&
                            debugInfo?.gameStatus?.recoveryEligible
                          ? 'Game active and recovery eligible - try recovery'
                          : debugInfo?.gameStatus?.requestId !== '0'
                            ? 'Request ID still exists'
                            : 'Unknown reason - try refresh'}
                    </>
                  )}
                </span>
              </div>

              <div className="bg-secondary-800/30 p-2 rounded col-span-3">
                <span className="text-secondary-400">Last Play Timestamp:</span>{' '}
                <span className="font-semibold">
                  {debugInfo?.gameStatus?.lastPlayTimestamp
                    ? new Date(
                        Number(debugInfo?.gameStatus?.lastPlayTimestamp) * 1000
                      ).toLocaleString()
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Show recovery button if eligible but UI doesn't show it */}
            {(debugInfo?.gameStatus?.recoveryEligible === true ||
              debugInfo?.gameStatus?.recoveryEligible === 'true') &&
              !recoveryState.eligible && (
                <div className="mt-4 bg-yellow-500/10 p-3 rounded border border-yellow-500/30">
                  <p className="text-sm text-yellow-500 mb-2">
                    Recovery eligible but not showing in UI!
                  </p>
                  <Button
                    variant="warning"
                    size="small"
                    onClick={() => {
                      // Force recovery state update and then try recovery
                      setRecoveryState(prev => ({ ...prev, eligible: true }));
                      setTimeout(handleRecoverGame, 500);
                    }}
                  >
                    Force Recovery
                  </Button>
                </div>
              )}

            <p className="text-xs text-secondary-400 mt-3">
              See browser console for full debug information (Press F12 &gt;
              Console)
            </p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="stat-card">
          <h3 className="text-secondary-400">Games Played</h3>
          <p className="text-2xl font-bold text-gaming-primary">
            {stats?.gamesPlayed || 0}
          </p>
        </Card>
        <Card className="stat-card">
          <h3 className="text-secondary-400">Total Winnings</h3>
          <p className="text-2xl font-bold text-gaming-accent">
            {formatTokenAmount(stats?.totalWinnings || BigInt(0))} GAMA
          </p>
        </Card>
        <Card className="stat-card">
          <h3 className="text-secondary-400">Last Played</h3>
          <p className="text-2xl font-bold text-gaming-primary">
            {formatTimestamp(stats?.lastPlayed)}
          </p>
        </Card>
      </div>

      {stats?.currentGameActive && (
        <Card className="stat-card bg-gaming-primary/10 border border-gaming-primary/30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="w-full">
              <h3 className="text-secondary-300 font-medium">Active Game</h3>
              <p className="text-lg font-bold text-gaming-primary">
                Game in progress -{' '}
                {stats.currentGameWin ? 'Winning!' : 'Waiting for result...'}
              </p>
              <p className="text-sm text-secondary-400 mt-1">
                Running for{' '}
                <span className="font-medium text-gaming-primary">
                  {formatTimeElapsed(activeGameTimer)}
                </span>
              </p>

              {/* Recovery progress bar */}
              {activeGameTimer > 0 &&
                recoveryState.recoveryTimeoutPeriod > 0 &&
                !recoveryState.eligible && (
                  <div className="mt-3 w-full">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-secondary-400">
                        Recovery eligibility:
                      </span>
                      <span className="text-secondary-400">
                        {recoveryCountdown !== null
                          ? `Available in ${formatTimeElapsed(recoveryCountdown)}`
                          : recoveryProgressPercentage >= 100
                            ? 'Check eligibility'
                            : ''}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gaming-primary to-yellow-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${recoveryProgressPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}
            </div>

            {activeGameTimer > 120 && !recoveryState.eligible && (
              <div className="flex-shrink-0">
                <p className="text-xs text-secondary-400 mb-1 text-right">
                  {recoveryCountdown !== null
                    ? 'Waiting for recovery eligibility'
                    : 'Game might be stuck'}
                </p>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => refetch()}
                >
                  {recoveryCountdown !== null
                    ? 'Refresh Status'
                    : 'Check Recovery Status'}
                </Button>
              </div>
            )}

            {/* Debug button */}
            <div>
              <Button
                variant="outline"
                size="small"
                className="mt-2 text-xs"
                onClick={handleDebugGameState}
                isLoading={isDebugging}
              >
                Debug Game State
              </Button>
              <p className="text-xs text-secondary-400 mt-1 text-right">
                Check console for details
              </p>
            </div>
          </div>

          {/* Debug information display */}
          {debugInfo && (
            <div className="mt-4 pt-4 border-t border-gaming-primary/20">
              <h4 className="text-sm font-medium text-gaming-primary mb-2">
                Debug Summary:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-secondary-800/10 p-2 rounded">
                  <span className="text-secondary-400">Game Active:</span>{' '}
                  <span
                    className={
                      debugInfo?.gameStatus?.isActive === true ||
                      debugInfo?.gameStatus?.isActive === 'true'
                        ? 'text-yellow-500'
                        : 'text-green-500'
                    }
                  >
                    {debugInfo?.gameStatus?.isActive === true ||
                    debugInfo?.gameStatus?.isActive === 'true'
                      ? 'Yes'
                      : 'No'}
                  </span>
                </div>
                <div className="bg-secondary-800/10 p-2 rounded">
                  <span className="text-secondary-400">Recovery Eligible:</span>{' '}
                  <span
                    className={
                      debugInfo?.gameStatus?.recoveryEligible === true ||
                      debugInfo?.gameStatus?.recoveryEligible === 'true'
                        ? 'text-green-500'
                        : 'text-yellow-500'
                    }
                  >
                    {debugInfo?.gameStatus?.recoveryEligible === true ||
                    debugInfo?.gameStatus?.recoveryEligible === 'true'
                      ? 'Yes'
                      : 'No'}
                  </span>
                </div>
                <div className="bg-secondary-800/10 p-2 rounded">
                  <span className="text-secondary-400">
                    VRF Request Exists:
                  </span>{' '}
                  <span
                    className={
                      debugInfo?.gameStatus?.requestExists === true ||
                      debugInfo?.gameStatus?.requestExists === 'true'
                        ? 'text-yellow-500'
                        : 'text-green-500'
                    }
                  >
                    {debugInfo?.gameStatus?.requestExists === true ||
                    debugInfo?.gameStatus?.requestExists === 'true'
                      ? 'Yes'
                      : 'No'}
                  </span>
                </div>
                <div className="bg-secondary-800/10 p-2 rounded">
                  <span className="text-secondary-400">
                    VRF Request Processed:
                  </span>{' '}
                  <span
                    className={
                      debugInfo?.gameStatus?.requestProcessed === true ||
                      debugInfo?.gameStatus?.requestProcessed === 'true'
                        ? 'text-green-500'
                        : 'text-yellow-500'
                    }
                  >
                    {debugInfo?.gameStatus?.requestProcessed === true ||
                    debugInfo?.gameStatus?.requestProcessed === 'true'
                      ? 'Yes'
                      : 'No'}
                  </span>
                </div>
                <div className="bg-secondary-800/10 p-2 rounded">
                  <span className="text-secondary-400">
                    Can Start New Game:
                  </span>{' '}
                  <span
                    className={
                      debugInfo?.canStartNewGame === true ||
                      debugInfo?.canStartNewGame === 'true'
                        ? 'text-green-500'
                        : 'text-yellow-500'
                    }
                  >
                    {debugInfo?.canStartNewGame === true ||
                    debugInfo?.canStartNewGame === 'true'
                      ? 'Yes'
                      : 'No'}
                  </span>
                </div>
                <div className="bg-secondary-800/10 p-2 rounded">
                  <span className="text-secondary-400">Result:</span>{' '}
                  <span className="font-semibold">
                    {debugInfo?.gameStatus?.result === '0'
                      ? 'Not rolled yet'
                      : debugInfo?.gameStatus?.result}
                  </span>
                </div>
              </div>
              <p className="text-xs text-secondary-400 mt-3">
                See browser console for full debug information. Use F12 to open
                developer tools.
              </p>
            </div>
          )}
        </Card>
      )}

      {recoveryState.eligible && (
        <Card className="stat-card bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-yellow-500 font-medium">
                Stuck Game Detected
              </h3>
              <p className="text-sm text-secondary-300">
                A previous game seems to be stuck. You can try to recover it.
              </p>
              <p className="text-xs text-yellow-500/80 mt-1">
                Game has been running for{' '}
                <span className="font-bold">
                  {formatTimeElapsed(activeGameTimer)}
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="warning"
                isLoading={recoveryState.isLoading}
                onClick={handleRecoverGame}
              >
                Recover Game
              </Button>

              {/* Debug button for recovery panel */}
              <Button
                variant="outline"
                size="small"
                className="text-xs"
                onClick={handleDebugGameState}
                isLoading={isDebugging}
              >
                Debug Game State
              </Button>
            </div>
          </div>

          {/* Debug information display for recovery panel */}
          {debugInfo && (
            <div className="mt-4 pt-4 border-t border-yellow-500/20">
              <h4 className="text-sm font-medium text-yellow-500 mb-2">
                Debug Summary:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-secondary-800/10 p-2 rounded">
                  <span className="text-secondary-400">Game Active:</span>{' '}
                  <span
                    className={
                      debugInfo?.gameStatus?.isActive === true ||
                      debugInfo?.gameStatus?.isActive === 'true'
                        ? 'text-yellow-500'
                        : 'text-green-500'
                    }
                  >
                    {debugInfo?.gameStatus?.isActive === true ||
                    debugInfo?.gameStatus?.isActive === 'true'
                      ? 'Yes'
                      : 'No'}
                  </span>
                </div>
                <div className="bg-secondary-800/10 p-2 rounded">
                  <span className="text-secondary-400">Recovery Eligible:</span>{' '}
                  <span
                    className={
                      debugInfo?.gameStatus?.recoveryEligible === true ||
                      debugInfo?.gameStatus?.recoveryEligible === 'true'
                        ? 'text-green-500'
                        : 'text-yellow-500'
                    }
                  >
                    {debugInfo?.gameStatus?.recoveryEligible === true ||
                    debugInfo?.gameStatus?.recoveryEligible === 'true'
                      ? 'Yes'
                      : 'No'}
                  </span>
                </div>
                <div className="bg-secondary-800/10 p-2 rounded">
                  <span className="text-secondary-400">
                    VRF Request Exists:
                  </span>{' '}
                  <span
                    className={
                      debugInfo?.gameStatus?.requestExists === true ||
                      debugInfo?.gameStatus?.requestExists === 'true'
                        ? 'text-yellow-500'
                        : 'text-green-500'
                    }
                  >
                    {debugInfo?.gameStatus?.requestExists === true ||
                    debugInfo?.gameStatus?.requestExists === 'true'
                      ? 'Yes'
                      : 'No'}
                  </span>
                </div>
                <div className="bg-secondary-800/10 p-2 rounded">
                  <span className="text-secondary-400">
                    VRF Request Processed:
                  </span>{' '}
                  <span
                    className={
                      debugInfo?.gameStatus?.requestProcessed === true ||
                      debugInfo?.gameStatus?.requestProcessed === 'true'
                        ? 'text-green-500'
                        : 'text-yellow-500'
                    }
                  >
                    {debugInfo?.gameStatus?.requestProcessed === true ||
                    debugInfo?.gameStatus?.requestProcessed === 'true'
                      ? 'Yes'
                      : 'No'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-secondary-400 mt-3">
                See browser console for full debug information. Use F12 to open
                developer tools.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default GameStats;
