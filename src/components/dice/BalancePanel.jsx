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
      className="bg-white rounded-md border border-primary-200 shadow-lg overflow-hidden h-full"
    >
      <div className=" bg-green-300 p-2 text-sm  text-green-700">
        <div className="flex items-center justify-between ">
          <h2 className=" flex  font-bold">
            Balance :
            <div className="flex text-black items-center">
              <h3 className="text-sm font-mono ">{formattedBalance}</h3>
              <p>GAMA</p>
            </div>
            <div
              className={`px-2 py-0.5 ml-4 rounded-full text-sm font-medium ${
                approvalStatus.sufficient
                  ? 'bg-black/30 text-black'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              <div className="flex text-sm items-center">
                <div
                  className={`w-1.5 h-1.5 rounded-full mr-1 ${
                    approvalStatus.sufficient ? 'bg-white' : 'bg-red-500'
                  }`}
                ></div>
                {approvalStatus.sufficient ? 'Approved' : 'Not Approved'}
              </div>
            </div>
          </h2>
        </div>
      </div>
    </motion.div>
  );
};

export default BalancePanel;
