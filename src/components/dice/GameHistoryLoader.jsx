import React from 'react';

const GameHistoryLoader = () => (
  <div className="space-y-2">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-secondary-800/10 px-4 py-3 rounded-lg border border-secondary-700/20">
          <div className="grid grid-cols-12 gap-2 items-center">
            {/* Dice number */}
            <div className="col-span-1 w-9 h-9 rounded-md bg-secondary-700/30"></div>

            {/* Bet details */}
            <div className="col-span-4 sm:col-span-3">
              <div className="h-4 bg-secondary-700/30 rounded w-20 mb-2"></div>
              <div className="h-3 bg-secondary-700/20 rounded w-16"></div>
            </div>

            {/* Result */}
            <div className="col-span-3 hidden sm:block">
              <div className="h-4 bg-secondary-700/30 rounded w-12"></div>
            </div>

            {/* Amount */}
            <div className="col-span-7 sm:col-span-5 flex justify-end">
              <div className="h-5 bg-secondary-700/30 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default GameHistoryLoader;
