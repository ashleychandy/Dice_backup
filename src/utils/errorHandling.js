import { ethers } from 'ethers';

// Create closure to track last error without using window global
let _lastErrorKey = '';

/**
 * Handles errors and displays appropriate toast messages
 * @param {Error} error - The error object
 * @param {Function} addToast - Function to add a toast message
 * @returns {string} The error message
 */
export const handleError = (error, addToast) => {
  const errorKey = `${error.message || 'Unknown error'}_${Math.floor(
    Date.now() / 1000
  )}`;

  if (_lastErrorKey === errorKey) {
    return;
  }
  _lastErrorKey = errorKey;

  let errorMessage = 'Something went wrong. Please try again later.';
  let errorType = 'error';

  if (error.code === 4001) {
    errorMessage = 'Transaction cancelled by user';
    errorType = 'warning';
  } else if (error.code === -32002) {
    errorMessage = 'Please check your wallet - a connection request is pending';
    errorType = 'warning';
  } else if (error.code === -32603) {
    errorMessage =
      'Network connection issue. Please check your wallet connection.';
    errorType = 'error';
  } else if (error.message?.includes('insufficient allowance')) {
    errorMessage = 'Insufficient token allowance. Please approve tokens first.';
    errorType = 'error';
  } else if (error.message?.includes('insufficient balance')) {
    errorMessage =
      "You don't have enough tokens for this transaction. Please check your balance and try again.";
    errorType = 'error';
  }

  if (addToast) {
    addToast(errorMessage, errorType);
  }

  return errorMessage;
};

// Error codes from the contract
export const ErrorCodes = {
  GAME_ERROR: 'GameError',
  INSUFFICIENT_ALLOWANCE: 'InsufficientAllowance',
  INSUFFICIENT_BALANCE: 'InsufficientUserBalance',
  ENFORCED_PAUSE: 'EnforcedPause',
  EXPECTED_PAUSE: 'ExpectedPause',
  BURN_FAILED: 'BurnFailed',
  INVALID_BET_PARAMETERS: 'InvalidBetParameters',
};

// User-friendly error messages
export const ErrorMessages = {
  [ErrorCodes.GAME_ERROR]: 'Game error occurred',
  [ErrorCodes.INSUFFICIENT_ALLOWANCE]: 'Insufficient token allowance',
  [ErrorCodes.INSUFFICIENT_BALANCE]: 'Insufficient balance',
  [ErrorCodes.ENFORCED_PAUSE]: 'Game is currently paused',
  [ErrorCodes.EXPECTED_PAUSE]: 'Game should be paused for this operation',
  [ErrorCodes.BURN_FAILED]: 'Token burn operation failed',
  [ErrorCodes.INVALID_BET_PARAMETERS]: 'Invalid bet parameters',
};

// Parse contract error data
export const parseContractError = error => {
  try {
    // Handle ethers v6 error format
    if (error.data) {
      // Try to parse the error data
      const errorName = Object.keys(ErrorCodes).find(key =>
        error.data.includes(ErrorCodes[key])
      );

      if (errorName) {
        return {
          code: ErrorCodes[errorName],
          message: ErrorMessages[ErrorCodes[errorName]],
          details: error.data,
        };
      }
    }

    // Handle user rejected transactions
    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      return {
        code: 'USER_REJECTED',
        message: 'Transaction was rejected by user',
        details: error.message,
      };
    }

    // Handle insufficient funds for gas
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return {
        code: 'INSUFFICIENT_GAS',
        message: 'Insufficient XDC for gas fees',
        details: error.message,
      };
    }

    // Handle network errors
    if (error.code === 'NETWORK_ERROR') {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection error',
        details: error.message,
      };
    }

    // Parse custom contract errors
    if (error.message && error.message.includes('execution reverted')) {
      // Extract custom error data
      const match = error.message.match(/execution reverted: (.+)/);
      if (match) {
        return {
          code: 'CONTRACT_ERROR',
          message: match[1],
          details: error.message,
        };
      }
    }

    // Default error
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      details: error.message,
    };
  } catch (parseError) {
    return {
      code: 'PARSE_ERROR',
      message: 'Error parsing contract response',
      details: error.message,
    };
  }
};

// Format error for display
export const formatErrorForDisplay = error => {
  const parsedError = parseContractError(error);

  // Return user-friendly error message
  return {
    title: parsedError.code
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' '),
    message: parsedError.message,
    details: parsedError.details,
    severity: getSeverity(parsedError.code),
  };
};

// Get error severity
const getSeverity = errorCode => {
  switch (errorCode) {
    case 'USER_REJECTED':
      return 'info';
    case 'INSUFFICIENT_ALLOWANCE':
    case 'INSUFFICIENT_BALANCE':
    case 'INSUFFICIENT_GAS':
      return 'warning';
    case 'NETWORK_ERROR':
    case 'CONTRACT_ERROR':
    case 'UNKNOWN_ERROR':
      return 'error';
    default:
      return 'error';
  }
};

// Handle contract errors
export const handleContractError = (error, addToast) => {
  const formattedError = formatErrorForDisplay(error);

  // Show toast notification
  addToast({
    title: formattedError.title,
    description: formattedError.message,
    type: formattedError.severity,
  });

  return formattedError;
};
