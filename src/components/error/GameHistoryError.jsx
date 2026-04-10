import React from 'react';
import { useWallet } from '../wallet/WalletProvider';

const GameHistoryError = ({ error, resetError }) => {
  const { isWalletConnected, account } = useWallet();

  // Customize message based on error and wallet connection state
  const getErrorMessage = () => {
    // If wallet is not connected, show a more friendly message
    if (!isWalletConnected || !account) {
      return 'Connect your wallet to view your game history';
    }

    // Handle specific error messages
    if (error?.message?.includes('Dice contract not initialized')) {
      return 'Game data will be available after connecting to the network';
    }

    // Default error message
    return error?.message || 'An unknown error occurred';
  };

  return (
    <div
      className={`rounded-lg border p-4 ${!isWalletConnected || !account ? 'border-secondary-200 bg-secondary-50' : 'border-red-200 bg-red-50'}`}
    >
      <div className="flex flex-col gap-2">
        <h3
          className={`${!isWalletConnected || !account ? 'text-secondary-800' : 'text-red-800'} font-medium`}
        >
          {!isWalletConnected || !account
            ? 'Game History'
            : 'Error Loading Game History'}
        </h3>
        <p
          className={`${!isWalletConnected || !account ? 'text-secondary-600' : 'text-red-600'} text-sm`}
        >
          {getErrorMessage()}
        </p>
        {resetError && isWalletConnected && account && (
          <button
            onClick={resetError}
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
          >
            Try Again
          </button>
        )}
        {!isWalletConnected && !account && (
          <p className="text-xs text-secondary-500 mt-1">
            Your betting history will appear here after you connect your wallet
          </p>
        )}
      </div>
    </div>
  );
};

export default GameHistoryError;
