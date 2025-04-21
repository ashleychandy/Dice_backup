import { ethers } from 'ethers';

/**
 * Format token amount to display value
 * @param {BigInt|String|Number} value - Amount in wei
 * @param {Number} decimals - Number of decimals to display
 * @returns {String} Formatted amount
 */
export const formatTokenAmount = (value, decimals = 4) => {
  if (!value) return '0';

  try {
    let bigIntValue;

    // Ensure we have a BigInt
    if (typeof value === 'string') {
      bigIntValue = BigInt(value);
    } else if (typeof value === 'number') {
      bigIntValue = BigInt(Math.floor(value));
    } else {
      bigIntValue = value;
    }

    // Format with ethers
    const formatted = ethers.formatEther(bigIntValue);

    // Limit decimal places
    if (decimals > 0) {
      const parts = formatted.split('.');
      if (parts.length === 2) {
        return `${parts[0]}.${parts[1].substring(0, decimals)}`;
      }
    }

    return formatted;
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0';
  }
};

/**
 * Parse string input to token amount in wei
 * @param {String} input - Input string representing amount
 * @returns {BigInt} Amount in wei
 */
export const parseTokenAmount = input => {
  if (!input || input === '') return BigInt(0);

  try {
    // Remove all non-numeric characters except decimal point
    const sanitized = input.replace(/[^0-9.]/g, '');

    // Handle multiple decimal points
    const parts = sanitized.split('.');
    const cleanInput = parts[0] + (parts.length > 1 ? '.' + parts[1] : '');

    return ethers.parseEther(cleanInput);
  } catch (error) {
    console.error('Error parsing token amount:', error);
    return BigInt(0);
  }
};

/**
 * Format timestamp to readable date
 * @param {Number} timestamp - Unix timestamp in seconds
 * @returns {String} Formatted date
 */
export const formatTimestamp = timestamp => {
  if (!timestamp) return 'Never';

  try {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid date';
  }
};

/**
 * Truncate address for display
 * @param {String} address - Ethereum address
 * @param {Number} startChars - Number of characters to show at start
 * @param {Number} endChars - Number of characters to show at end
 * @returns {String} Truncated address
 */
export const truncateAddress = (address, startChars = 6, endChars = 4) => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;

  return `${address.substring(0, startChars)}...${address.substring(
    address.length - endChars
  )}`;
};

/**
 * Calculate percentage of a value
 * @param {BigInt|String|Number} value - Base value
 * @param {Number} percentage - Percentage to calculate
 * @returns {BigInt} Calculated amount
 */
export const calculatePercentage = (value, percentage) => {
  if (!value || percentage <= 0) return BigInt(0);

  try {
    const bigIntValue = typeof value === 'bigint' ? value : BigInt(value);
    return (bigIntValue * BigInt(Math.floor(percentage * 100))) / BigInt(10000);
  } catch (error) {
    console.error('Error calculating percentage:', error);
    return BigInt(0);
  }
};
