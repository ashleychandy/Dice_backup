import React from 'react';
import { useContractStats } from '../../hooks/useContractStats';
import { useContractState } from '../../hooks/useContractState';
import { motion } from 'framer-motion';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPause,
  faPlay,
  faSpinner,
  faRefresh,
} from '@fortawesome/free-solid-svg-icons';
import { ethers } from 'ethers';

const StatItem = ({ label, value, isLoading }) => (
  <div className="flex flex-col space-y-1">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-lg font-semibold">
      {isLoading ? (
        <FontAwesomeIcon icon={faSpinner} spin className="text-gray-400" />
      ) : (
        value
      )}
    </span>
  </div>
);

const ContractStats = () => {
  const {
    stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useContractStats();

  const {
    contractState,
    isLoading: stateLoading,
    pauseContract,
    unpauseContract,
    isPausing,
    isUnpausing,
  } = useContractState();

  const formatTokenValue = value => {
    if (!value) return '0 GAMA';
    try {
      return `${ethers.formatUnits(BigInt(value), 18)} GAMA`;
    } catch (error) {
      console.error('Error formatting token value:', error);
      return '0 GAMA';
    }
  };

  if (statsError) {
    return (
      <Card className="bg-red-50">
        <div className="text-red-600">Error loading contract statistics</div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Contract Statistics</h2>
          <Button
            onClick={refetchStats}
            variant="secondary"
            className="p-2"
            disabled={statsLoading}
          >
            <FontAwesomeIcon
              icon={faRefresh}
              className={statsLoading ? 'animate-spin' : ''}
            />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatItem
            label="Total Games Played"
            value={stats?.totalGames || '0'}
            isLoading={statsLoading}
          />
          <StatItem
            label="Total Payouts"
            value={formatTokenValue(stats?.totalPayout || '0')}
            isLoading={statsLoading}
          />
          <StatItem
            label="Total Wagered"
            value={formatTokenValue(stats?.totalWagered || '0')}
            isLoading={statsLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatItem
            label="Max Bet Amount"
            value={formatTokenValue(stats?.maxBetAmount || '0')}
            isLoading={statsLoading}
          />
          <StatItem
            label="Max History Size"
            value={stats?.maxHistorySize || '0'}
            isLoading={statsLoading}
          />
        </div>

        {contractState?.isOwner && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Admin Controls</h3>
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    contractState.isPaused
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {contractState.isPaused ? 'Paused' : 'Active'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex space-x-4">
              <Button
                onClick={
                  contractState.isPaused ? unpauseContract : pauseContract
                }
                variant={contractState.isPaused ? 'success' : 'danger'}
                disabled={isPausing || isUnpausing || stateLoading}
                className="flex items-center space-x-2"
              >
                <FontAwesomeIcon
                  icon={contractState.isPaused ? faPlay : faPause}
                  className={isPausing || isUnpausing ? 'animate-spin' : ''}
                />
                <span>
                  {contractState.isPaused
                    ? 'Unpause Contract'
                    : 'Pause Contract'}
                </span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ContractStats;
