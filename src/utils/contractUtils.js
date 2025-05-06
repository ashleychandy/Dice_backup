import { ethers } from 'ethers';

/**
 * Helper function to handle contract errors and map them to user-friendly messages
 * @param {Error} error - The error object from the contract call
 * @param {Function} onError - Function to handle unknown errors
 * @param {Function} addToast - Function to display toast messages
 */
export const handleContractError = (error, onError, addToast) => {
  // Handle null/undefined error
  if (!error) {
    addToast('An unknown error occurred', 'error');
    return;
  }

  // Log for debugging
  console.error('Contract error details:', {
    code: error.code,
    message: error.message,
    errorName: error.errorName,
    reason: error.reason,
    details: error.details,
  });

  // Handle user rejected transactions (MetaMask, etc.)
  if (
    error.code === 4001 ||
    (error.message &&
      (error.message.includes('rejected') ||
        error.message.includes('denied') ||
        error.message.includes('cancelled')))
  ) {
    addToast('Transaction rejected by user', 'warning');
    return;
  }

  // Handle gas/fee errors
  if (error.message && error.message.includes('insufficient funds')) {
    addToast('Insufficient XDC for gas fees', 'error');
    return;
  }

  // Handle RPC connection errors
  if (
    error.message &&
    (error.message.includes('network') ||
      error.message.includes('connection') ||
      error.message.includes('disconnected') ||
      error.message.includes('timeout'))
  ) {
    addToast(
      'Network connection error. Please check your internet connection and try again.',
      'error'
    );
    return;
  }

  // Handle missing revert data errors
  if (error.message && error.message.includes('missing revert data')) {
    addToast(
      'The blockchain returned an incomplete response. Please try again.',
      'warning'
    );
    return;
  }

  // Handle contract specific errors
  if (
    error.code === 'CALL_EXCEPTION' ||
    error.message?.includes('execution reverted')
  ) {
    // Try to extract error message from different formats
    const errorName =
      error.errorName ||
      error.reason ||
      (error.message &&
        error.message.match(/reverted with reason string '(.+?)'/)?.[1]);

    switch (errorName) {
      case 'InvalidBetParameters':
        addToast(
          'Invalid bet parameters. Please check your bet amount and selected number.',
          'error'
        );
        break;
      case 'InsufficientUserBalance':
        addToast('Insufficient token balance for this bet amount.', 'error');
        break;
      case 'GameError':
        addToast('Game error occurred. Please try again later.', 'error');
        break;
      case 'PayoutCalculationError':
        addToast(
          'Error calculating payout. Please try again with a different amount.',
          'error'
        );
        break;
      case 'GamePaused':
      case 'Paused':
        addToast(
          'The game is currently paused. Please try again later.',
          'info'
        );
        break;
      case 'ExceedsMaxBet':
        addToast('Bet amount exceeds the maximum allowed.', 'warning');
        break;
      case 'PendingRequest':
        addToast(
          'You already have a pending game. Please wait for it to complete.',
          'warning'
        );
        break;
      default:
        // Check for common errors in the message text
        if (error.message?.includes('max bet')) {
          addToast('Bet amount exceeds the maximum allowed.', 'warning');
        } else if (error.message?.includes('insufficient balance')) {
          // Provide more specific information about the balance issue
          addToast(
            'Insufficient token balance. Please make sure your wallet has enough tokens for this bet.',
            'error'
          );

          // Log detailed info for debugging
          console.info('Balance error details:', {
            message: error.message,
            reason: error.reason,
            code: error.code,
            data: error.data,
          });
        } else if (error.message?.includes('paused')) {
          addToast('The game is currently paused', 'info');
        } else {
          // Default to generic error message
          addToast(
            'Transaction failed: ' + (errorName || 'Contract error'),
            'error'
          );
          onError(error);
        }
    }
  } else {
    // Default error handling
    onError(error);
  }
};

/**
 * Safely call a contract method with proper error handling
 * @param {Object} contract - The contract instance
 * @param {String} methodName - The name of the method to call
 * @param {Array} params - Parameters to pass to the method
 * @param {Any} defaultValue - Default value to return if call fails
 * @param {Function} onError - Optional error handler function
 * @param {Function} addToast - Optional toast notification function
 * @param {Object} options - Optional transaction options (for writing methods)
 * @returns {Promise<Any>} - Result of the contract call or defaultValue if failed
 */
export const safeContractCall = async (
  contract,
  methodName,
  params = [],
  defaultValue = null,
  onError = null,
  addToast = null,
  options = null
) => {
  // Check if contract exists
  if (!contract) {
    console.warn('Contract is not available for method:', methodName);
    if (addToast) addToast('Contract is not available', 'error');
    return defaultValue;
  }

  // Check if method exists on contract
  if (!contract[methodName] || typeof contract[methodName] !== 'function') {
    console.warn(`Method ${methodName} not found on contract`);
    return defaultValue;
  }

  try {
    // Call the contract method with optional transaction options
    return options
      ? await contract[methodName](...params, options)
      : await contract[methodName](...params);
  } catch (error) {
    // Log the error for debugging
    console.error(`Error calling ${methodName}:`, error);

    // Handle specific "missing revert data" error separately
    if (error.message && error.message.includes('missing revert data')) {
      console.warn(
        `Caught missing revert data error on ${methodName} call:`,
        error.message
      );
      if (addToast) {
        addToast(
          'The blockchain returned an incomplete response. Please try again.',
          'warning'
        );
      }
      return defaultValue;
    }

    // Handle other errors if handlers are provided
    if (onError || addToast) {
      handleContractError(
        error,
        onError || console.error,
        addToast || (() => {})
      );
    }

    return defaultValue;
  }
};

/**
 * Enhanced token approval function with retry mechanism and better error handling
 * @param {Object} tokenContract - The token contract instance
 * @param {String} spenderAddress - The address to approve spending for
 * @param {String} userAddress - The user's address
 * @param {Function} setProcessingState - Function to update processing state (optional)
 * @param {Function} addToast - Function to display toast messages (optional)
 * @param {Number} maxRetries - Maximum number of retry attempts (default: 2)
 * @returns {Promise<boolean>} - Whether approval was successful
 */
export const checkAndApproveToken = async (
  tokenContract,
  spenderAddress,
  userAddress,
  setProcessingState = null,
  addToast = null,
  maxRetries = 2
) => {
  // Verify required parameters
  if (!tokenContract) {
    if (addToast) addToast('Token contract not found', 'error');
    return false;
  }

  if (!spenderAddress) {
    if (addToast) addToast('Spender address not found', 'error');
    return false;
  }

  if (!userAddress) {
    if (addToast) addToast('User address not found', 'error');
    return false;
  }

  // Set processing state if available
  if (setProcessingState) {
    setProcessingState(true);
  }

  let retryCount = 0;
  // We'll use this for debugging only, don't need to track every error
  let _lastError = null;

  try {
    while (retryCount <= maxRetries) {
      try {
        if (retryCount > 0) {
          // Small delay before retry to allow network conditions to change
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // First check if we have enough gas (native currency) for the transaction
        try {
          const provider = tokenContract.runner || tokenContract.provider;

          if (!provider) {
            if (addToast)
              addToast(
                'Provider not available, check wallet connection',
                'error'
              );
            return false;
          }

          // Check if provider is connected
          if (
            provider.getBalance &&
            typeof provider.getBalance === 'function'
          ) {
            const balance = await provider.getBalance(userAddress);
            let gasPrice;

            try {
              // Try to get gas price, fall back to estimated value if it fails
              gasPrice = await provider.getGasPrice();
            } catch (gasPriceError) {
              console.warn(
                'Failed to get gas price, using default:',
                gasPriceError
              );
              gasPrice = ethers.parseUnits('50', 'gwei'); // Default fallback
            }

            let estimatedGas;
            try {
              estimatedGas = await tokenContract.approve.estimateGas(
                spenderAddress,
                ethers.MaxUint256
              );
            } catch (gasEstimateError) {
              console.warn(
                'Failed to estimate gas, using default:',
                gasEstimateError
              );
              estimatedGas = ethers.parseUnits('100000', 'wei'); // fallback gas estimate
            }

            const requiredGas =
              (gasPrice * estimatedGas * BigInt(12)) / BigInt(10); // 1.2x for safety margin

            if (balance < requiredGas) {
              if (addToast)
                addToast(
                  `Insufficient XDC for transaction fees. You need approximately ${ethers.formatEther(requiredGas)} XDC.`,
                  'error'
                );
              return false;
            }
          } else {
            console.warn(
              'Provider does not support getBalance method, skipping gas check'
            );
          }
        } catch (gasCheckError) {
          console.error('Error during gas check:', gasCheckError);
          // Continue with approval anyway since this is just a pre-check
        }

        // Check if allowance method exists and is callable
        if (
          !tokenContract.allowance ||
          typeof tokenContract.allowance !== 'function'
        ) {
          if (addToast)
            addToast(
              'Token contract does not support allowance checks',
              'error'
            );
          return false;
        }

        // Check current allowance with retry logic
        let currentAllowance;
        try {
          currentAllowance = await tokenContract.allowance(
            userAddress,
            spenderAddress
          );
        } catch (allowanceError) {
          console.error('Error checking allowance:', allowanceError);
          if (retryCount === maxRetries) {
            if (addToast) addToast('Failed to check token allowance', 'error');
            return false;
          }
          retryCount++;
          continue;
        }

        // If allowance is already high, we don't need to approve again
        // Using a threshold of 10^18 (1 token with 18 decimals) as a minimum acceptable allowance
        const minimumAllowance = BigInt(10) ** BigInt(18);
        if (currentAllowance > minimumAllowance) {
          if (addToast) addToast('Tokens already approved', 'success');
          return true;
        }

        if (addToast) addToast('Waiting for approval in wallet...', 'info');

        // Set maximum approval amount
        const maxApproval = ethers.MaxUint256;

        // Request approval with max amount
        const tx = await tokenContract.approve(spenderAddress, maxApproval, {
          gasLimit: ethers.parseUnits('300000', 'wei'), // Set a reasonable gas limit
        });

        if (addToast) addToast('Token approval transaction sent', 'info');

        // Wait for transaction confirmation with a longer timeout
        const receipt = await Promise.race([
          tx.wait(2), // Wait for 2 confirmations
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Transaction confirmation timeout')),
              60000
            )
          ),
        ]);

        if (!receipt || !receipt.status) {
          if (addToast) addToast('Token approval failed', 'error');
          // Continue to retry
          retryCount++;
          continue;
        }

        // Add a longer delay to allow blockchain state to update
        await new Promise(resolve => setTimeout(resolve, 7000));

        // Verify the new allowance with multiple retries
        let verificationSuccess = false;
        const maxVerifyRetries = 3;

        for (
          let verifyAttempt = 0;
          verifyAttempt < maxVerifyRetries;
          verifyAttempt++
        ) {
          try {
            const newAllowance = await tokenContract.allowance(
              userAddress,
              spenderAddress
            );

            // If we have a higher allowance, we're good!
            if (newAllowance > currentAllowance) {
              if (addToast) addToast('Token approval successful!', 'success');
              verificationSuccess = true;
              break;
            }

            // If we're not on the last attempt, wait before trying again
            if (verifyAttempt < maxVerifyRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
          } catch (verifyError) {
            // If not the last attempt, wait and continue
            if (verifyAttempt < maxVerifyRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }

        // If verification was successful at any point, return success
        if (verificationSuccess) {
          return true;
        }

        // Even if verification failed, the transaction was confirmed by the network
        // Some networks are slow to update the RPC state, so we'll consider it a success
        if (addToast) {
          addToast(
            "Approval likely successful, but couldn't verify new allowance. Proceed with your action.",
            'success'
          );
        }

        // Return true since the transaction was confirmed
        return true;
      } catch (error) {
        _lastError = error;
        // Handle specific error types
        if (error.code === 4001) {
          // User rejected transaction - no need to retry
          if (addToast)
            addToast('Token approval rejected in wallet', 'warning');
          return false;
        } else if (error.code === -32603) {
          // Internal error, could be gas related
          if (addToast)
            addToast(
              'Transaction error. Please check your wallet connection',
              'error'
            );
        } else if (
          error.message &&
          error.message.includes('insufficient funds')
        ) {
          if (addToast) addToast('Insufficient XDC for gas fees', 'error');
          return false; // No point in retrying if there are insufficient funds
        } else if (
          error.message &&
          error.message.includes('execution reverted')
        ) {
          if (addToast)
            addToast('Transaction reverted by the token contract', 'error');
        } else if (error.message && error.message.includes('timeout')) {
          if (addToast)
            addToast(
              'Transaction confirmation timed out. Network may be congested.',
              'warning'
            );
        } else {
          // Generic error message
          if (addToast)
            addToast(
              'Token approval failed: ' + (error.message || 'Unknown error'),
              'error'
            );
        }

        // Increment retry counter and try again if we haven't exceeded max retries
        retryCount++;
        if (retryCount > maxRetries) {
          break;
        }
      }
    }

    // If we've reached here, all retries have failed
    if (addToast)
      addToast(
        `Token approval failed after ${maxRetries + 1} attempts. Please try again later.`,
        'error'
      );

    return false;
  } finally {
    // Clean up processing state
    if (setProcessingState) {
      setProcessingState(false);
    }
  }
};

/**
 * Parse the GameResult event from a transaction receipt
 * @param {Object} receipt - Transaction receipt
 * @param {Object} contractInterface - Optional contract interface for parsing events
 * @returns {Object|null} - Parsed game result or null if not found
 */
export const parseGameResultEvent = (receipt, contractInterface = null) => {
  try {
    if (!receipt || !receipt.logs) {
      console.error('Invalid receipt or missing logs:', receipt);
      return null;
    }

    // Look for GameResult event in logs
    // First try to find it using event topics (more reliable)
    const gameResultEventTopic =
      '0x79c91f4abb197e52a27e63ec317408e5ea1e736ce859fd1cf8e49a4fe3c92c33';
    const gameResultLogs = receipt.logs.filter(log => {
      // Check for GameResult event using topic hash
      return log.topics && log.topics[0] === gameResultEventTopic;
    });

    // If we found matching logs, try to parse them
    if (gameResultLogs.length > 0) {
      const log = gameResultLogs[0];

      try {
        // If we have a contract interface, use it to parse
        if (
          contractInterface &&
          typeof contractInterface.parseLog === 'function'
        ) {
          const parsedLog = contractInterface.parseLog(log);

          if (parsedLog && parsedLog.args) {
            const {
              player,
              chosenNumber,
              rolledNumber,
              betAmount,
              payout,
              win,
            } = parsedLog.args;

            // Create result object ensuring all values are properly converted
            return {
              player: player || ethers.ZeroAddress,
              chosenNumber:
                typeof chosenNumber !== 'undefined'
                  ? typeof chosenNumber === 'object'
                    ? Number(chosenNumber)
                    : Number(chosenNumber)
                  : 0,
              rolledNumber:
                typeof rolledNumber !== 'undefined'
                  ? typeof rolledNumber === 'object'
                    ? Number(rolledNumber)
                    : Number(rolledNumber)
                  : 0,
              betAmount:
                typeof betAmount !== 'undefined'
                  ? BigInt(betAmount.toString())
                  : BigInt(0),
              payout:
                typeof payout !== 'undefined'
                  ? BigInt(payout.toString())
                  : BigInt(0),
              isWin: win === true,
              isSpecialResult: false,
            };
          }
        }

        // Alternative parsing method if contract interface is not available
        // This makes a best effort to parse the data in the log
        const data = log.data.slice(2); // Remove '0x' prefix

        if (data.length >= 192) {
          try {
            // 6 32-byte values (192 hex chars)
            // Parse event data assuming it's packed as follows:
            // [0-31]: address player
            // [32-63]: uint256 chosenNumber
            // [64-95]: uint256 rolledNumber
            // [96-127]: uint256 betAmount
            // [128-159]: uint256 payout
            // [160-191]: bool win (stored as uint256, so 0 = false, 1 = true)

            // Extract rolledNumber (3rd parameter)
            const rolledNumberHex = '0x' + data.substring(64, 96);
            const rolledNumber = parseInt(rolledNumberHex, 16);

            // Extract payout (5th parameter)
            const payoutHex = '0x' + data.substring(128, 160);
            const payout = payoutHex ? BigInt(payoutHex) : BigInt(0);

            // Extract win status (6th parameter)
            const winHex = '0x' + data.substring(160, 192);
            const isWin = parseInt(winHex, 16) === 1;

            // Return a properly formed result object
            return {
              rolledNumber: isNaN(rolledNumber) ? 0 : rolledNumber,
              payout,
              isWin,
              isSpecialResult: false,
            };
          } catch (dataParseError) {
            console.error('Error parsing log data:', dataParseError);
          }
        }
      } catch (parseError) {
        console.error('Error parsing GameResult event:', parseError);
      }
    }

    // Fallback: Try to extract data from any event that might contain result info
    // This is a last resort when we can't find or parse the expected GameResult event
    for (const log of receipt.logs) {
      // Skip logs without data
      if (!log.data || log.data === '0x') continue;

      try {
        // Check if this log has enough data to potentially contain result info
        const data = log.data.slice(2);

        if (data.length >= 64) {
          // At least 2 32-byte values
          try {
            // Try to extract what might be rolledNumber and win status
            const possibleRolledNumberHex = '0x' + data.substring(0, 64);
            const possibleRolledNumber = parseInt(possibleRolledNumberHex, 16);

            // Only consider valid dice numbers
            if (possibleRolledNumber >= 1 && possibleRolledNumber <= 6) {
              console.warn('Using fallback log parsing to extract game result');

              // If we found a valid dice number, make a best guess about the game result
              return {
                rolledNumber: possibleRolledNumber,
                payout: BigInt(0),
                isWin: false, // Conservative default
                isSpecialResult: false,
                isFallbackParsed: true,
              };
            }
          } catch (numberParseError) {
            // Continue to next log if this one fails
            continue;
          }
        }
      } catch (fallbackError) {
        // Ignore errors in fallback parsing and continue to next log
        continue;
      }
    }

    // If we get here, we couldn't find or parse a GameResult event
    console.error('Could not find GameResult event in transaction receipt');
    return null;
  } catch (error) {
    console.error('Error parsing game result:', error);
    return null;
  }
};
