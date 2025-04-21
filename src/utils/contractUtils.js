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
 * Checks and approves token spending for game contracts
 * @param {Object} tokenContract - The token contract instance
 * @param {String} spenderAddress - The address to approve spending for
 * @param {String} amount - The amount to approve
 * @param {String} userAddress - The user's address
 * @param {Function} setProcessingState - Function to update processing state
 * @param {Function} addToast - Function to display toast messages
 * @returns {Promise<boolean>} - Whether approval was successful
 */
export const checkAndApproveToken = async (
  tokenContract,
  spenderAddress,
  amount,
  userAddress,
  setProcessingState,
  addToast
) => {
  if (!tokenContract || !spenderAddress || !amount || !userAddress) {
    throw new Error('Missing required parameters for token approval');
  }

  try {
    setProcessingState(true);

    const currentAllowance = await tokenContract.allowance(
      userAddress,
      spenderAddress
    );

    if (currentAllowance < amount) {
      const maxApproval = ethers.MaxUint256;
      const tx = await tokenContract.approve(spenderAddress, maxApproval);
      const receipt = await tx.wait();

      if (!receipt.status) {
        throw new Error('Token approval transaction failed');
      }

      const newAllowance = await tokenContract.allowance(
        userAddress,
        spenderAddress
      );

      if (newAllowance < amount) {
        throw new Error('Allowance not set correctly');
      }

      addToast('Token approval successful', 'success');
      return true;
    }

    return true;
  } catch (error) {
    console.error('Token approval error:', error);
    throw error;
  } finally {
    setProcessingState(false);
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
