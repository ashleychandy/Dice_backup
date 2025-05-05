import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
// eslint-disable-next-line no-unused-vars
import { formatTokenAmount, formatTimestamp } from '../../utils/formatting';
import { useGameStatus } from '../../hooks/useGameStatus';
import { useGameRecovery } from '../../hooks/useGameRecovery';
import { useRequestTracking } from '../../hooks/useRequestTracking';

// Helper function to format time elapsed
const formatTimeElapsed = seconds => {
  if (!seconds) return '0s';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
};

const GameStats = ({
  // eslint-disable-next-line no-unused-vars
  account,
  onError,
  addToast,
}) => {
  const {
    gameStatus,
    isLoading: statusLoading,
    error: statusError,
    refetch,
  } = useGameStatus();
  const { recoverGame, isRecovering, recoveryError } = useGameRecovery({
    onSuccess: () => {
      addToast?.('Game recovered successfully!', 'success');
      refetch();
    },
    onError: error => {
      addToast?.('Failed to recover game: ' + error.message, 'error');
      onError?.(error);
    },
  });

  // VRF request tracking
  const requestId =
    gameStatus?.requestId && gameStatus?.requestId !== '0'
      ? gameStatus.requestId
      : null;
  const {
    data: requestInfo,
    isLoading: requestLoading,
    error: requestError,
  } = useRequestTracking(requestId);

  // Timer for active games
  const [activeGameTimer, setActiveGameTimer] = useState(0);

  useEffect(() => {
    let interval;
    if (gameStatus?.isActive) {
      interval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const lastPlayed = gameStatus?.lastPlayTimestamp;
        if (lastPlayed > 0) {
          const elapsed = now - lastPlayed;
          setActiveGameTimer(elapsed);
        }
      }, 1000);
    } else {
      setActiveGameTimer(0);
    }
    return () => clearInterval(interval);
  }, [gameStatus?.isActive, gameStatus?.lastPlayTimestamp]);

  if (statusLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-secondary-800/50 rounded w-1/3"></div>
        <div className="h-8 bg-secondary-800/50 rounded w-2/3"></div>
        <div className="h-8 bg-secondary-800/50 rounded w-1/2"></div>
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="text-red-600">
        Error loading game status: {statusError.message}
      </div>
    );
  }

  // Calculate recovery progress percentage
  let recoveryProgressPercentage = 0;
  const recoveryTimeoutPeriod = 3600; // 1 hour in seconds
  if (recoveryTimeoutPeriod > 0 && activeGameTimer > 0) {
    recoveryProgressPercentage = Math.min(
      100,
      (activeGameTimer / recoveryTimeoutPeriod) * 100
    );
  }

  return (
    <div className="space-y-6">
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
            onClick={recoverGame}
            isLoading={isRecovering}
            disabled={!gameStatus?.recoveryEligible}
            title={
              !gameStatus?.recoveryEligible
                ? 'Game is not eligible for recovery yet.'
                : 'Recover stuck game'
            }
          >
            Recover Game
          </Button>
        </div>
        {recoveryError && (
          <div className="text-red-500 mt-2 text-xs">
            {recoveryError.message}
          </div>
        )}
      </Card>
      <Card className="bg-gray-800/20 p-4 border border-gray-700">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-white/80">Game Active:</span>
            <span
              className={
                gameStatus?.isActive ? 'text-yellow-500' : 'text-green-500'
              }
            >
              {gameStatus?.isActive ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/80">Recovery Eligible:</span>
            <span
              className={
                gameStatus?.recoveryEligible
                  ? 'text-green-500'
                  : 'text-yellow-500'
              }
            >
              {gameStatus?.recoveryEligible ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/80">Last Played:</span>
            <span className="text-secondary-400">
              {gameStatus?.lastPlayTimestamp
                ? formatTimestamp(gameStatus.lastPlayTimestamp)
                : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/80">Time Since Last Play:</span>
            <span className="text-secondary-400">
              {activeGameTimer ? formatTimeElapsed(activeGameTimer) : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/80">Recovery Progress:</span>
            <span className="text-secondary-400">
              {recoveryProgressPercentage}%
            </span>
          </div>
        </div>
      </Card>
      {/* VRF Request Tracking Section */}
      {requestId && (
        <Card className="bg-gray-800/20 p-4 border border-gray-700">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-white/80">VRF Request ID:</span>
              <span className="text-secondary-400">{requestId}</span>
            </div>
            {requestLoading ? (
              <div className="text-secondary-400">Loading request info...</div>
            ) : requestError ? (
              <div className="text-red-500 text-xs">{requestError.message}</div>
            ) : requestInfo ? (
              <>
                <div className="flex justify-between">
                  <span className="text-white/80">Request Exists:</span>
                  <span
                    className={
                      requestInfo.exists ? 'text-green-500' : 'text-yellow-500'
                    }
                  >
                    {requestInfo.exists ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Request Processed:</span>
                  <span
                    className={
                      requestInfo.gameStatus?.requestProcessed
                        ? 'text-green-500'
                        : 'text-yellow-500'
                    }
                  >
                    {requestInfo.gameStatus?.requestProcessed ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Recovery Eligible:</span>
                  <span
                    className={
                      requestInfo.gameStatus?.recoveryEligible
                        ? 'text-green-500'
                        : 'text-yellow-500'
                    }
                  >
                    {requestInfo.gameStatus?.recoveryEligible ? 'Yes' : 'No'}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
};

export default GameStats;
