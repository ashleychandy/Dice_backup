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
    // Log the incoming props for debugging
    console.log('BalancePanel props:', {
      userBalance: userBalance ? userBalance.toString() : 'undefined',
      allowance: allowance ? allowance.toString() : 'undefined',
      betAmount: betAmount ? betAmount.toString() : 'undefined',
    });

    if (!allowance) {
      console.log('No allowance data available');
      return { sufficient: false, status: 'Not Approved' };
    }

    try {
      // Ensure both are proper BigInt with safe fallbacks
      const allowanceBigInt = BigInt(allowance.toString());
      const betAmountBigInt = betAmount
        ? BigInt(betAmount.toString())
        : BigInt(0);

      // Log values for debugging
      console.log('Approval check:', {
        allowance: String(allowanceBigInt),
        betAmount: String(betAmountBigInt),
        userBalance: userBalance ? String(userBalance) : 'undefined',
      });

      // If bet amount is zero, we consider it approved (nothing to approve)
      if (betAmountBigInt <= BigInt(0)) {
        return { sufficient: true, status: 'No Bet Amount' };
      }

      // Check if allowance is enough for current bet amount
      const isSufficient = allowanceBigInt >= betAmountBigInt;

      // For large allowances, show as "Fully Approved"
      const highThreshold = ethers.MaxUint256 / BigInt(2);
      const status = !isSufficient
        ? 'Not Approved'
        : allowanceBigInt > highThreshold
          ? 'Fully Approved'
          : 'Approved';

      console.log(`Approval status: ${status} (sufficient: ${isSufficient})`);
      return { sufficient: isSufficient, status };
    } catch (error) {
      console.error('Error in approval status check:', error);
      return { sufficient: false, status: 'Not Approved' };
    }
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
      transition={{ duration: 0.3 }}
      className="flex items-center justify-end gap-3"
    >
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-secondary-500">Balance:</span>
        <span className="font-mono font-medium text-secondary-700">
          {formattedBalance}
        </span>
        <span className="text-secondary-500 text-xs">GAMA</span>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5
          ${
            approvalStatus.sufficient
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }
        `}
      >
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            approvalStatus.sufficient
              ? 'bg-green-500 animate-pulse'
              : 'bg-red-500'
          }`}
        />
        <span className="leading-none">
          {approvalStatus.sufficient ? 'Approved' : 'Not Approved'}
        </span>
      </motion.div>
    </motion.div>
  );
};

export default BalancePanel;
