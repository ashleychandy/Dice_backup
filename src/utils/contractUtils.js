import { ethers } from 'ethers';

/**
 * Helper function to handle contract errors and map them to user-friendly messages
 * @param {Error} error - The error object from the contract call
 * @param {Function} onError - Function to handle unknown errors
 * @param {Function} addToast - Function to display toast messages
 */
export const handleContractError = (error, onError, addToast) => {
  if (error.code === 'CALL_EXCEPTION') {
    const errorName = error.errorName;
    switch (errorName) {
      case 'InvalidBetParameters':
        addToast('Invalid bet parameters', 'error');
        break;
      case 'InsufficientUserBalance':
        addToast('Insufficient balance', 'error');
        break;
      case 'GameError':
        addToast('Game error occurred', 'error');
        break;
      case 'PayoutCalculationError':
        addToast('Error calculating payout', 'error');
        break;
      default:
        onError(error);
    }
  } else {
    onError(error);
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
    console.error('Token approval error: Missing token contract');
    if (addToast) addToast('Token contract not found', 'error');
    return false;
  }

  if (!spenderAddress) {
    console.error('Token approval error: Missing spender address');
    if (addToast) addToast('Spender address not found', 'error');
    return false;
  }

  if (!userAddress) {
    console.error('Token approval error: Missing user address');
    if (addToast) addToast('User address not found', 'error');
    return false;
  }

  console.log('Checking token approval for:', {
    tokenContract: tokenContract.target || tokenContract.address,
    spender: spenderAddress,
    userAddress,
  });

  // Set processing state if available
  if (setProcessingState) {
    setProcessingState(true);
  }

  let retryCount = 0;
  let lastError = null;

  try {
    while (retryCount <= maxRetries) {
      try {
        if (retryCount > 0) {
          console.log(
            `Retry attempt ${retryCount}/${maxRetries} for token approval`
          );
          if (addToast)
            addToast(
              `Retrying approval (${retryCount}/${maxRetries})...`,
              'info'
            );
          // Small delay before retry to allow network conditions to change
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // First check if we have enough gas (native currency) for the transaction
        try {
          const provider = tokenContract.runner || tokenContract.provider;
          const balance = await provider.getBalance(userAddress);
          const gasPrice = await provider.getGasPrice();
          const estimatedGas = await tokenContract.approve
            .estimateGas(spenderAddress, ethers.MaxUint256)
            .catch(() => ethers.parseUnits('100000', 'wei')); // fallback gas estimate

          const requiredGas =
            (gasPrice * estimatedGas * BigInt(12)) / BigInt(10); // 1.2x for safety margin

          if (balance < requiredGas) {
            console.error('Insufficient XDC for gas fees', {
              balance: ethers.formatEther(balance),
              required: ethers.formatEther(requiredGas),
            });
            if (addToast)
              addToast(
                `Insufficient XDC for transaction fees. You need approximately ${ethers.formatEther(requiredGas)} XDC.`,
                'error'
              );
            return false;
          }
        } catch (gasCheckError) {
          console.warn(
            'Could not verify gas balance, proceeding anyway:',
            gasCheckError
          );
        }

        // Check current allowance
        const currentAllowance = await tokenContract.allowance(
          userAddress,
          spenderAddress
        );

        console.log('Current allowance:', currentAllowance.toString());

        // If allowance is already high, we don't need to approve again
        // Using a threshold of 10^18 (1 token with 18 decimals) as a minimum acceptable allowance
        const minimumAllowance = BigInt(10) ** BigInt(18);
        if (currentAllowance > minimumAllowance) {
          console.log('Token already approved with sufficient allowance');
          if (addToast) addToast('Tokens already approved', 'success');
          return true;
        }

        if (addToast) addToast('Waiting for approval in wallet...', 'info');

        // Set maximum approval amount
        const maxApproval = ethers.MaxUint256;

        // Request approval with max amount
        console.log('Requesting token approval with max amount');
        const tx = await tokenContract.approve(spenderAddress, maxApproval, {
          gasLimit: ethers.parseUnits('300000', 'wei'), // Set a reasonable gas limit
        });

        if (addToast) addToast('Token approval transaction sent', 'info');
        console.log('Approval transaction sent:', tx.hash);

        // Wait for transaction confirmation with a longer timeout
        console.log('Waiting for approval transaction confirmation...');
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
          console.error('Token approval transaction failed or timed out');
          if (addToast) addToast('Token approval failed', 'error');
          // Continue to retry
          retryCount++;
          continue;
        }

        // Transaction is confirmed, give higher chance of success
        console.log('Transaction confirmed! Transaction hash:', tx.hash);
        if (addToast) addToast('Approval transaction confirmed', 'info');

        // Add a longer delay to allow blockchain state to update
        console.log('Waiting for allowance to update...');
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
            console.log(
              `Verification attempt ${verifyAttempt + 1}/${maxVerifyRetries}`
            );
            const newAllowance = await tokenContract.allowance(
              userAddress,
              spenderAddress
            );

            console.log(
              `New allowance (attempt ${verifyAttempt + 1}):`,
              newAllowance.toString()
            );

            // If we have a higher allowance, we're good!
            if (newAllowance > currentAllowance) {
              console.log('Allowance successfully increased!');
              if (addToast) addToast('Token approval successful!', 'success');
              verificationSuccess = true;
              break;
            }

            // If we're not on the last attempt, wait before trying again
            if (verifyAttempt < maxVerifyRetries - 1) {
              console.log('Allowance not yet updated, waiting...');
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
          } catch (verifyError) {
            console.error(
              `Error during verification attempt ${verifyAttempt + 1}:`,
              verifyError
            );
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
        console.log(
          'Transaction confirmed but allowance not yet visible. Treating as success.'
        );
        if (addToast) {
          addToast(
            "Approval likely successful, but couldn't verify new allowance. Proceed with your action.",
            'success'
          );
        }

        // Return true since the transaction was confirmed
        return true;
      } catch (error) {
        lastError = error;
        // Handle specific error types
        console.error(
          `Token approval error (attempt ${retryCount + 1}/${maxRetries + 1}):`,
          error
        );

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

    console.error('Token approval failed after all retry attempts', lastError);
    return false;
  } finally {
    // Clean up processing state
    if (setProcessingState) {
      setProcessingState(false);
    }
  }
};

/**
 * Parse game result event from transaction receipt
 * @param {Object} receipt - The transaction receipt
 * @param {Object} contractInterface - The contract interface to parse logs
 * @returns {Object|null} - The parsed event or null if not found
 */
export const parseGameResultEvent = (receipt, contractInterface) => {
  if (!receipt || !receipt.logs || !contractInterface) return null;

  return receipt.logs
    .map(log => {
      try {
        return contractInterface.parseLog({
          topics: log.topics,
          data: log.data,
        });
      } catch (e) {
        return null;
      }
    })
    .find(event => event && event.name === 'GameResult');
};
