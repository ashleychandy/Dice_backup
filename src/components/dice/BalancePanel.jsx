import React from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

const BalancePanel = ({
  userBalance,
  allowance,
  betAmount = BigInt(0),
  isLoading = false,
}) => {
  // Safe formatting function for token values
  const safeFormatUnits = value => {
    if (!value || typeof value === 'undefined') return '0';
    try {
      // Ensure we're handling BigInt values correctly
      const valueStr =
        typeof value === 'bigint' ? value.toString() : value.toString();
      return ethers.formatUnits(BigInt(valueStr), 18);
    } catch (error) {
      console.error('Error formatting token value:', error);
      return '0';
    }
  };

  // Check if approval is sufficient for the current bet amount
  const checkApprovalStatus = () => {
    if (!allowance) return { sufficient: false, status: 'Not Approved' };

    try {
      // Ensure both values are BigInt for comparison
      const allowanceBigInt =
        typeof allowance === 'bigint'
          ? allowance
          : BigInt(allowance.toString());

      const betAmountBigInt =
        typeof betAmount === 'bigint'
          ? betAmount
          : BigInt(betAmount.toString());

      // Check if allowance is enough for current bet amount
      const isSufficient =
        betAmountBigInt <= BigInt(0) || allowanceBigInt >= betAmountBigInt;

      // For large allowances, show as "Fully Approved"
      const highThreshold = ethers.MaxUint256 / BigInt(2);
      const status = !isSufficient
        ? 'Not Approved'
        : allowanceBigInt > highThreshold
          ? 'Fully Approved'
          : 'Approved';

      return { sufficient: isSufficient, status };
    } catch (error) {
      console.error('Error checking approval status:', error);
      return { sufficient: false, status: 'Error' };
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

  // Safely convert userBalance to formatted string
  const formattedBalance = React.useMemo(() => {
    try {
      const balance =
        userBalance !== undefined && userBalance !== null ? userBalance : 0;
      return formatBalance(safeFormatUnits(balance));
    } catch (error) {
      console.error('Error formatting balance:', error);
      return '0';
    }
  }, [userBalance]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-end gap-3"
    >
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-secondary-500">Balance:</span>
        {isLoading ? (
          <span className="font-mono font-medium text-secondary-700 animate-pulse">
            ...
          </span>
        ) : (
          <span className="font-mono font-medium text-secondary-700">
            {formattedBalance}
          </span>
        )}
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
