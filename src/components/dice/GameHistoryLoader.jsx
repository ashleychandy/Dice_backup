import React from 'react';

const GameHistoryLoader = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="p-4 rounded-xl border border-secondary-800/30 bg-secondary-800/20">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-secondary-800/60"></div>
              <div>
                <div className="h-5 w-40 bg-secondary-800/60 rounded mb-2"></div>
                <div className="h-4 w-32 bg-secondary-800/40 rounded"></div>
              </div>
            </div>
            <div className="text-right">
              <div className="h-6 w-24 bg-secondary-800/60 rounded mb-2"></div>
              <div className="h-4 w-28 bg-secondary-800/40 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default GameHistoryLoader;
