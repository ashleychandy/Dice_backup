import React from 'react';

const FilterButton = ({ onClick, active, count, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-lg text-sm transition-colors flex items-center ${
      active
        ? 'bg-green-600 text-white'
        : 'bg-green-600/20 text-green-700 hover:bg-green-600/30'
    }`}
  >
    <span>{children}</span>
    {count !== undefined && (
      <span className="ml-1 rounded-full bg-black/20 text-xs px-1.5 py-0.5 min-w-[20px] text-center">
        {count}
      </span>
    )}
  </button>
);

export default FilterButton;
