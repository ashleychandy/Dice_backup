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

      // Find the relevant event in the receipt to get the result
      if (receipt && receipt.logs) {
        // Parse logs based on events from the contract
        // This might need adaptation based on your contract's event structure
        // For now, we'll just return the transaction receipt
        return {
          success: true,
          transaction: receipt,
        };
      }

      return {
        success: true,
        transaction: receipt,
      };
    } catch (error) {
      console.error('Error placing bet:', error);
      throw this.parseContractError(error);
    }
  }

  // Get user's game stats
  async getUserStats(account) {
    if (!this.diceContract || !account) {
      return {
        gamesPlayed: 0,
        totalWinnings: BigInt(0),
        lastPlayed: 0,
      };
    }

    try {
      const [gamesPlayed, totalWinnings, lastPlayed] =
        await this.diceContract.getUserData(account);

      return {
        gamesPlayed: Number(gamesPlayed),
        totalWinnings,
        lastPlayed: Number(lastPlayed),
      };
    } catch (error) {
      console.error('Error fetching game stats:', error);
      throw error;
    }
  }

  // Get user's game history
  async getGameHistory(account) {
    if (!this.diceContract || !account) {
      return { games: [], stats: { totalGamesWon: 0, totalGamesLost: 0 } };
    }

    try {
      // Fetch bets using the getBetHistory function
      let bets = [];
      try {
        bets = await this.diceContract.getBetHistory(account);
      } catch (error) {
        // If we get a BAD_DATA error with "0x", it means empty history
        if (error.code === 'BAD_DATA' && error.value === '0x') {
          bets = [];
        } else {
          throw error;
        }
      }

      // Process bets and calculate stats
      const processedGames = bets
        .map(bet => {
          // Each bet is a tuple with [chosenNumber, rolledNumber, amount, timestamp, payout]
          return {
            chosenNumber: Number(bet[0]),
            rolledNumber: Number(bet[1]),
            amount: bet[2].toString(),
            timestamp: Number(bet[3]),
            payout: bet[4].toString(),
            isWin: Number(bet[1]) === Number(bet[0]),
          };
        })
        .reverse();

      // Calculate stats
      const stats = processedGames.reduce(
        (acc, game) => ({
          totalGamesWon: acc.totalGamesWon + (game.isWin ? 1 : 0),
          totalGamesLost: acc.totalGamesLost + (game.isWin ? 0 : 1),
        }),
        {
          totalGamesWon: 0,
          totalGamesLost: 0,
        }
      );

      return { games: processedGames, stats };
    } catch (error) {
      console.error('Error fetching game history:', error);
      throw error;
    }
  }

  // Calculate potential payout for a bet
  calculatePotentialPayout(amount) {
    if (!amount) return BigInt(0);

    try {
      // Dice pays 6x for a win
      return BigInt(amount) * BigInt(6);
    } catch (error) {
      console.error('Error calculating potential payout:', error);
      return BigInt(0);
    }
  }

  // Helper method to parse contract errors
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
}

export default new GameService();
