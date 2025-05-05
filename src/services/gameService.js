class GameService {
  constructor() {
    this.diceContract = null;
  }

  // Initialize game service with contracts
  init(contracts) {
    if (!contracts || !contracts.dice) {
      throw new Error('Dice contract not provided');
    }
    this.diceContract = contracts.dice;
  }

  // Place a bet on the dice game
  async placeBet(chosenNumber, amount) {
    if (!this.diceContract) {
      throw new Error('Dice contract not initialized');
    }

    if (!chosenNumber || chosenNumber < 1 || chosenNumber > 6) {
      throw new Error(
        'Invalid number selected. Choose a number between 1 and 6.'
      );
    }

    if (!amount || amount <= 0) {
      throw new Error('Invalid bet amount');
    }

    try {
      const tx = await this.diceContract.playDice(chosenNumber, amount);
      const receipt = await tx.wait();

      return {
        success: true,
        transaction: receipt,
      };
    } catch (error) {
      throw this.parseContractError(error);
    }
  }

  // Recovery and status logic is now handled by hooks (useGameStatus, useGameRecovery)
  // async recoverStuckGame() {
  //   ...
  // }

  // Parse contract errors
  parseContractError(error) {
    // Check for known error patterns
    const errorString = error.toString();

    if (errorString.includes('insufficient funds')) {
      return new Error('Insufficient funds to place this bet');
    }

    if (errorString.includes('user rejected')) {
      return new Error('Transaction rejected by user');
    }

    if (errorString.includes('Invalid chosen number')) {
      return new Error('Please choose a number between 1 and 6');
    }

    if (errorString.includes('Bet amount cannot be zero')) {
      return new Error('Bet amount cannot be zero');
    }

    if (errorString.includes('Bet amount too large')) {
      return new Error('Bet amount exceeds the maximum allowed');
    }

    if (errorString.includes('Token burn failed')) {
      return new Error('Failed to place bet. Token transfer issue.');
    }

    if (errorString.includes('InsufficientUserBalance')) {
      return new Error('Insufficient token balance');
    }

    if (errorString.includes('InsufficientAllowance')) {
      return new Error(
        'Insufficient token allowance. Please approve tokens first.'
      );
    }

    if (errorString.includes('execution reverted')) {
      return new Error('Transaction failed. Please try again.');
    }

    // Default error
    return new Error(
      'Failed to place bet: ' + (error.message || 'Unknown error')
    );
  }

  // Calculate potential payout
  calculatePotentialPayout(amount) {
    if (!amount) return BigInt(0);
    return amount * BigInt(2);
  }

  // Force stop game (admin only)
  async forceStopGame(playerAddress) {
    if (!this.diceContract) {
      throw new Error('Dice contract not initialized');
    }

    try {
      const tx = await this.diceContract.forceStopGame(playerAddress);
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      throw this.parseContractError(error);
    }
  }
}

export default new GameService();
