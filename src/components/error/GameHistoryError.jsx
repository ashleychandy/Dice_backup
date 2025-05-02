import React from 'react';

const GameHistoryError = ({ error, resetError }) => {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-red-800 font-medium">Error Loading Game History</h3>
        <p className="text-red-600 text-sm">
          {error?.message || 'An unknown error occurred'}
        </p>
        {resetError && (
          <button
            onClick={resetError}
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default GameHistoryError;
