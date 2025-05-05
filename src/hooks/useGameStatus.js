import { useState, useEffect } from 'react';
import { useDiceContract } from './useDiceContract';
import { useWallet } from './useWallet';

export const useGameStatus = () => {
  const { contract } = useDiceContract();
  const { account } = useWallet();
  const [gameStatus, setGameStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGameStatus = async () => {
    if (!contract || !account) {
      setGameStatus(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const status = await contract.getGameStatus(account);

      setGameStatus({
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
      });

      setError(null);
    } catch (err) {
      setError(err.message);
      setGameStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGameStatus();

    // Set up polling interval for real-time updates
    const interval = setInterval(fetchGameStatus, 5000);

    return () => clearInterval(interval);
  }, [contract, account]);

  return {
    gameStatus,
    isLoading,
    error,
    refetch: fetchGameStatus,
  };
};
