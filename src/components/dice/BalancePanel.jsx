import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';

const BalancePanel = ({ userBalance, allowance, potentialWinnings }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Safe formatting function for ethers values
  const safeFormatEther = value => {
    if (!value || typeof value === 'undefined') return '0';
    try {
      return ethers.formatEther(value.toString());
    } catch (error) {
      console.error('Error formatting ether value:', error);
      return '0';
    }
  };

  const balanceItems = [
    {
      label: 'Token Balance',
      value: safeFormatEther(userBalance || 0),
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: 'Token Allowance',
      value: (allowance || 0) > 0 ? 'Approved' : 'Not Approved',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: 'Potential Win',
      value: safeFormatEther(potentialWinnings || 0),
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
  ];

  const formatValue = value => {
    if (value === 'Approved' || value === 'Not Approved' || value === '0')
      return value;

    // For token amounts, preserve all digits but remove trailing zeros
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 1) return '0';

    // Format with commas for thousands and preserve significant digits
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0, // No decimals for GAMA tokens
      useGrouping: true, // Use thousand separators
    }).format(numValue);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          className="text-2xl font-bold bg-clip-text text-transparent 
                       bg-gradient-to-r from-gaming-primary to-gaming-accent"
        >
          Balance Info
        </h2>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-secondary-400 hover:text-white transition-colors"
        >
          <svg
            className={`w-6 h-6 transform transition-transform duration-300
                          ${showDetails ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {balanceItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="balance-item"
          >
            <div
              className="flex items-center justify-between p-4 rounded-xl
                           bg-secondary-800/30 border border-secondary-700/30
                           hover:border-gaming-primary/30 transition-all duration-300"
            >
              <div className="flex items-center space-x-3">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-lg
                               bg-gaming-primary/10 text-gaming-primary
                               flex items-center justify-center"
                >
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm text-secondary-400">{item.label}</p>
                  <p className="font-medium text-white">
                    {formatValue(item.value)}{' '}
                    <span className="text-sm text-secondary-400">GAMA</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4">
              <div className="p-4 rounded-xl bg-secondary-800/30 border border-secondary-700/30">
                <h3 className="text-lg font-medium mb-3">Balance Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-400">
                      Available for Betting:
                    </span>
                    <span className="text-white">
                      {formatValue(
                        safeFormatEther(
                          (userBalance || 0) > (allowance || 0)
                            ? allowance || 0
                            : userBalance || 0
                        )
                      )}{' '}
                      GAMA
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-400">Win Multiplier:</span>
                    <span className="text-gaming-success">6x</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-400">
                      Max Potential Win:
                    </span>
                    <span className="text-gaming-primary">
                      {formatValue(
                        safeFormatEther((userBalance || BigInt(0)) * BigInt(6))
                      )}{' '}
                      GAMA
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BalancePanel;
