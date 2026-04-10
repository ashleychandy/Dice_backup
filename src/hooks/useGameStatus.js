import { usePollingService } from '../services/pollingService.jsx';

export const useGameStatus = () => {
  const { gameStatus, isLoading, error, refreshData } = usePollingService();

  return {
    gameStatus,
    isLoading,
    error,
    refetch: refreshData,
  };
};
