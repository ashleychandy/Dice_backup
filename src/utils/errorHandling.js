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

  if (window._lastErrorKey === errorKey) {
    return;
  }
  window._lastErrorKey = errorKey;

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

    // Log for debugging
    console.info('Balance error details:', error);
  }

  if (addToast) {
    addToast(errorMessage, errorType);
  }

  return errorMessage;
};
