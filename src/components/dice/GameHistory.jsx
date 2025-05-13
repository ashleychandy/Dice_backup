import { AnimatePresence } from 'framer-motion';
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHistory,
  faSpinner,
  faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';
import { useBetHistory } from '../../hooks/useBetHistory';
import { useDiceContract } from '../../hooks/useDiceContract';
import { useWallet } from '../wallet/WalletProvider';
import EmptyState from './EmptyState';
import GameHistoryItem from './GameHistoryItem';
import GameHistoryLoader from './GameHistoryLoader';
import GameHistoryError from '../error/GameHistoryError';

// Minimalist pagination component
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  hasPreviousPage,
}) => (
  <div className="flex justify-center items-center mt-5 space-x-2">
    <button
      onClick={() => onPageChange(currentPage - 1)}
      disabled={!hasPreviousPage}
      className={`
        px-4 py-2 rounded-lg text-sm font-medium transition-all
        ${
          !hasPreviousPage
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white hover:bg-green-50 text-secondary-700 hover:text-green-700 border border-gray-200 hover:border-green-200 shadow-sm'
        }
      `}
    >
      ← Previous
    </button>
    <span className="px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-sm text-secondary-600">
      Page {currentPage} of {totalPages}
    </span>
    <button
      onClick={() => onPageChange(currentPage + 1)}
      disabled={!hasNextPage}
      className={`
        px-4 py-2 rounded-lg text-sm font-medium transition-all
        ${
          !hasNextPage
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white hover:bg-green-50 text-secondary-700 hover:text-green-700 border border-gray-200 hover:border-green-200 shadow-sm'
        }
      `}
    >
      Next →
    </button>
  </div>
);

// Tab component for cleaner filter UI
const Tab = ({ label, active, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`
      px-4 py-2 text-sm transition-all duration-200 rounded-lg flex items-center gap-2
      ${
        active
          ? 'bg-white text-green-700 shadow-sm border border-gray-200 font-medium'
          : 'text-secondary-600 hover:text-secondary-800 hover:bg-white/50'
      }
    `}
  >
    <FontAwesomeIcon
      icon={icon}
      className={active ? 'text-green-500' : 'text-secondary-400'}
    />
    {label}
  </button>
);

// Welcome component for new users
const WelcomeNewUser = () => (
  <div className="bg-white rounded-lg border border-secondary-200 p-6 text-center">
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="bg-secondary-50 p-4 rounded-full inline-flex">
        <FontAwesomeIcon
          icon={faHistory}
          className="text-3xl text-secondary-400"
        />
      </div>
      <h3 className="text-xl font-semibold text-secondary-800">
        Your Game History
      </h3>
      <p className="text-secondary-600 max-w-md">
        Connect your wallet to start playing. Once you place bets, your game
        history will appear here.
      </p>
      <div className="bg-secondary-50 p-3 rounded-lg text-secondary-700 text-sm flex items-start mt-2 max-w-md">
        <FontAwesomeIcon
          icon={faInfoCircle}
          className="text-secondary-500 mr-2 mt-0.5"
        />
        <p className="text-left">
          The dice game runs on XDC blockchain. Your bets are transparent,
          verifiable, and fair, with provably random results.
        </p>
      </div>
    </div>
  </div>
);

// Game History component with a more modern tab design
const GameHistory = ({ account, onError }) => {
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const { contract: diceContract, isLoading: isContractLoading } =
    useDiceContract();
  const { isWalletConnected } = useWallet();

  // Use the bet history hook
  const {
    betHistory,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    goToPage,
    isLoading,
    error,
    refetch: forceRefresh,
  } = useBetHistory({
    playerAddress: account,
    pageSize: 12,
    autoRefresh: true,
    diceContract,
  });

  // Handle any errors
  React.useEffect(() => {
    if (error && onError) {
      onError(
        typeof error === 'string' ? error : error.message || 'Unknown error'
      );
    }
  }, [error, onError]);

  // Reset to page 1 when changing filters
  React.useEffect(() => {
    goToPage(1);
  }, [filter, goToPage]);

  // Filter games based on selected filter
  const filteredGames = React.useMemo(() => {
    if (!betHistory) return [];

    if (filter === 'pending') {
      return betHistory.filter(game => game.resultType === 'unknown');
    }
    return betHistory;
  }, [betHistory, filter]);

  // Check if there are any pending games
  const hasPendingGames = React.useMemo(() => {
    return betHistory && betHistory.some(game => game.resultType === 'unknown');
  }, [betHistory]);

  // For new users without a wallet connection, show a welcome message
  if (!isWalletConnected || !account) {
    return <WelcomeNewUser />;
  }

  if (isContractLoading) {
    return <GameHistoryLoader />;
  }

  if (!diceContract) {
    return (
      <GameHistoryError
        error={new Error('Dice contract not initialized')}
        resetError={forceRefresh}
      />
    );
  }

  if (error) {
    return <GameHistoryError error={error} resetError={forceRefresh} />;
  }

  if (isLoading) {
    return <GameHistoryLoader />;
  }

  if (!filteredGames || !filteredGames.length) {
    return (
      <EmptyState message="No games found. Place your first bet to get started!" />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <AnimatePresence>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredGames.map((game, index) => (
              <GameHistoryItem
                key={`${game.timestamp}-${index}`}
                game={{
                  ...game,
                  betAmount: game.amount,
                  isPending: game.resultType === 'unknown',
                }}
                index={index}
                compact={true}
              />
            ))}
          </div>
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          onPageChange={page => {
            if (page > currentPage) {
              goToNextPage();
            } else if (page < currentPage) {
              goToPreviousPage();
            }
          }}
        />
      )}
    </div>
  );
};

export default GameHistory;
