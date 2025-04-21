import React from 'react';

const EmptyState = () => (
  <div className="text-center py-8">
    <div className="inline-block p-3 rounded-full bg-secondary-800/50 mb-4">
      <svg
        className="w-6 h-6 text-secondary-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </div>
    <p className="text-secondary-400">No games found</p>
  </div>
);

export default EmptyState;
