import React from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

const BalancePanel = ({ userBalance, allowance, betAmount = BigInt(0) }) => {
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

  // Check if approval is sufficient for the current bet amount
  const checkApprovalStatus = () => {
    if (!allowance) return { sufficient: false, status: 'Not Approved' };

    // Check if allowance is enough for current bet amount
    const isSufficient = betAmount <= BigInt(0) || allowance >= betAmount;

    // For large allowances, show as "Fully Approved"
    const highThreshold = ethers.MaxUint256 / BigInt(2);
    const status = !isSufficient
      ? 'Not Approved'
      : allowance > highThreshold
        ? 'Fully Approved'
        : 'Approved';

    return { sufficient: isSufficient, status };
  };

  const approvalStatus = checkApprovalStatus();

  // Format token balance nicely
  const formatBalance = value => {
    const floatValue = parseFloat(value);
    if (isNaN(floatValue)) return '0';

    // For large numbers, use K/M/B notation
    if (floatValue >= 1_000_000_000) {
      return `${(floatValue / 1_000_000_000).toFixed(2)}B`;
    } else if (floatValue >= 1_000_000) {
      return `${(floatValue / 1_000_000).toFixed(2)}M`;
    } else if (floatValue >= 1_000) {
      return `${(floatValue / 1_000).toFixed(2)}K`;
    }

    // For small numbers, show more precision
    if (floatValue < 0.0001 && floatValue > 0) {
      return '<0.0001';
    }

    return floatValue.toLocaleString(undefined, {
      maximumFractionDigits: 4,
      minimumFractionDigits: floatValue < 1 ? 4 : 0,
    });
  };

  const formattedBalance = formatBalance(safeFormatEther(userBalance || 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl border border-primary-200 shadow-lg overflow-hidden h-full"
    >
      <div className="bg-gradient-to-r from-gaming-primary to-gaming-accent py-3 px-4 text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Your Balance</h2>
          <div
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              approvalStatus.sufficient
                ? 'bg-white/20 text-white'
                : 'bg-red-100 text-red-700'
            }`}
          >
            <div className="flex items-center">
              <div
                className={`w-1.5 h-1.5 rounded-full mr-1 ${
                  approvalStatus.sufficient ? 'bg-white' : 'bg-red-500'
                }`}
              ></div>
              {approvalStatus.sufficient ? 'Approved' : 'Not Approved'}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex items-center">
        <div className="mr-4 relative flex-shrink-0">
          <div className="bg-primary-100 rounded-full p-2 w-12 h-12 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gaming-primary"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
            </svg>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-bold font-mono text-secondary-900">
            {formattedBalance}
          </h3>
          <p className="text-secondary-500 text-xs">GAMA Token</p>
        </div>
      </div>
    </motion.div>
  );
};

export default BalancePanel;
