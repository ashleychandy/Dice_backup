import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Card from '../ui/Card';
import { formatTokenAmount, formatTimestamp } from '../../utils/formatting';
import gameService from '../../services/gameService';

const GameStats = ({ account }) => {
  // Use React Query for fetching stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['gameStats', account],
    queryFn: async () => {
      if (!account) {
        return {
          gamesPlayed: 0,
          totalWinnings: BigInt(0),
          lastPlayed: 0,
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

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-secondary-800/50 rounded w-1/3"></div>
        <div className="h-8 bg-secondary-800/50 rounded w-2/3"></div>
        <div className="h-8 bg-secondary-800/50 rounded w-1/2"></div>
      </div>
    );
  }

  return (
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
  );
};

export default GameStats;
