import React from 'react';

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-6 text-center">
    <div className="w-16 h-16 mb-4 rounded-full bg-secondary-800/40 flex items-center justify-center">
      <span className="text-2xl">🎲</span>
    </div>
    <h3 className="text-lg font-medium text-secondary-200 mb-2">
      No Game History
    </h3>
    <p className="text-sm text-secondary-400">
      Your dice game history will appear here after you play.
    </p>
  </div>
);

export default EmptyState;
