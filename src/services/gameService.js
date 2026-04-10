class GameService {
  constructor() {
    this.diceContract = null;
  }

  // Initialize game service with contracts
  init(contracts) {
    if (!contracts) {
      throw new Error('Contracts object not provided');
    }

    // Handle different contract formats
    if (contracts.dice) {
      this.diceContract = contracts.dice;
    } else if (contracts.diceContract) {
      this.diceContract = contracts.diceContract;
    } else {
      throw new Error('Dice contract not provided');
    }

    // Validate that the contract has the necessary methods
    if (
      !this.diceContract.playDice ||
      typeof this.diceContract.playDice !== 'function'
    ) {
      throw new Error('Invalid dice contract: missing playDice method');
    }

    return this;
  }

  // Play dice game
  async playDice(chosenNumber, amount) {
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
}

export default new GameService();
