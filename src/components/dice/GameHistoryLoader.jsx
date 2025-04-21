import React from 'react';

const GameHistoryLoader = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="h-24 bg-secondary-800/50 rounded-xl" />
      </div>
    ))}
  </div>
);

export default GameHistoryLoader;
