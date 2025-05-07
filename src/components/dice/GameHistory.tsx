import React from 'react';
import { formatEther, formatTimestamp } from '../../utils/formatting';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';

interface GameHistoryProps {
  history: Array<{
    selectedNumber: number;
    result: number;
    betAmount: string;
    timestamp: number;
    won: boolean;
    payout: string;
    transactionHash: string;
  }>;
  isLoading: boolean;
  onRetry: () => void;
}

const GameHistory: React.FC<GameHistoryProps> = ({
  history,
  isLoading,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No games played yet</p>
        <Button onClick={onRetry} variant="secondary">
          Refresh History
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Selected
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Result
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Bet Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Payout
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {history.map((game, index) => (
            <tr
              key={`${game.transactionHash}-${index}`}
              className={`
                ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                hover:bg-gray-100 transition-colors duration-150
              `}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatTimestamp(game.timestamp)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                  {game.selectedNumber}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                  {game.result}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatEther(game.betAmount)} GAMA
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {game.won ? `${formatEther(game.payout)} GAMA` : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`
                    px-3 py-1 rounded-full text-sm font-semibold
                    ${
                      game.won
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }
                  `}
                >
                  {game.won ? 'Won' : 'Lost'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <Button onClick={onRetry} variant="secondary" size="small">
          Refresh
        </Button>
      </div>
    </div>
  );
};

export default GameHistory;
