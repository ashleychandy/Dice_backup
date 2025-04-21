import React from 'react';

const FilterButton = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
      active
        ? 'bg-gaming-primary text-white'
        : 'bg-gaming-primary/20 text-gaming-primary hover:bg-gaming-primary/30'
    }`}
  >
    {children}
  </button>
);

export default FilterButton;
