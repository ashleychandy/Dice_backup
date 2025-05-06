import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const Tab = ({ label, active, onClick, icon, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      px-4 py-2 text-sm transition-all duration-200 rounded-lg flex items-center gap-2
      ${
        active
          ? 'bg-white text-green-700 shadow-sm border border-gray-200 font-medium'
          : 'text-secondary-600 hover:text-secondary-800 hover:bg-white/50'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    {icon && (
      <FontAwesomeIcon
        icon={icon}
        className={active ? 'text-green-500' : 'text-secondary-400'}
      />
    )}
    {label}
  </button>
);

export default Tab;
