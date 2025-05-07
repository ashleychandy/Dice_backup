import { ethers } from 'ethers';

/**
 * Format token amount to display value
 * @param {BigInt|String|Number} value - Amount in wei
 * @param {Number} decimals - Number of decimals to display (0 for whole numbers)
 * @returns {String} Formatted amount
 */
export const formatTokenAmount = (value, decimals = 0) => {
  if (!value) return '0';

  try {
    let bigIntValue;

    if (typeof value === 'string') {
      bigIntValue = BigInt(value);
    } else if (typeof value === 'number') {
      bigIntValue = BigInt(Math.floor(value));
    } else if (typeof value === 'bigint') {
      bigIntValue = value;
    } else if (typeof value === 'object' && value.toString) {
      bigIntValue = BigInt(value.toString());
    } else {
      bigIntValue = BigInt(0);
    }

    const formatted = ethers.formatEther(bigIntValue);

    if (decimals === 0) {
      const wholePart = formatted.split('.')[0];
      return wholePart;
    }

    const parts = formatted.split('.');
    if (parts.length === 2) {
      return `${parts[0]}.${parts[1].substring(0, decimals)}`;
    }

    return parts[0];
  } catch (error) {
    return '0';
  }
};

/**
 * Parse string input to token amount in wei
 * @param {String} input - Input string representing amount (whole numbers only)
 * @returns {BigInt} Amount in wei
 */
export const parseTokenAmount = input => {
  if (!input || input === '') return BigInt(0);

  try {
    const inputStr = String(input);
    const sanitized = inputStr.replace(/[^\d]/g, '');

    if (!sanitized || sanitized === '') {
      return BigInt(0);
    }

    const result = BigInt(sanitized) * BigInt(10) ** BigInt(18);
    return result;
  } catch (error) {
    return BigInt(0);
  }
};

/**
 * Format timestamp to readable date
 * @param {Number|String} timestamp - Unix timestamp in seconds or milliseconds
 * @returns {String} Formatted date
 */
export const formatTimestamp = timestamp => {
  if (!timestamp) return 'Never';

  try {
    // Parse timestamp to number
    const ts = Number(timestamp);

    // Determine if timestamp is in seconds (standard blockchain) or milliseconds
    // Timestamps before year 2001 are assumed to be in milliseconds
    const date = new Date(ts < 10000000000 ? ts * 1000 : ts);

    // Validate the date
    if (isNaN(date.getTime()) || date.getFullYear() < 1990) {
      console.warn('Invalid timestamp detected:', timestamp);
      return 'Invalid date';
    }

    // Format with locale
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
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

/**
 * Format dice roll result for display, handling special result codes
 * @param {Number|String} result - Dice roll result (1-6 or special code)
 * @returns {String} Formatted result
 */
export const formatDiceResult = result => {
  if (!result && result !== 0) return '?';

  const num = Number(result);

  // Regular dice roll (1-6)
  if (num >= 1 && num <= 6) {
    return num.toString();
  }

  // Special result codes
  switch (num) {
    case 254: // RESULT_FORCE_STOPPED
      return 'Stopped';
    case 255: // RESULT_RECOVERED
      return 'Recovered';
    default:
      return num > 250 ? 'Special' : num.toString();
  }
};
