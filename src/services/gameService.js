class GameService {
  constructor() {
    this.diceContract = null;
    this.cacheStorage = {
      gameHistory: new Map(),
      userStats: new Map(),
      gameStatus: new Map(),
    };
    this.lastUpdatedTimestamps = {
      gameHistory: new Map(),
      userStats: new Map(),
      gameStatus: new Map(),
    };
    // Cache expiry in milliseconds (5 seconds)
    this.cacheExpiry = 5000;
  }

  // Initialize game service with contracts
  init(contracts) {
    // DEBUG LOGS - REMOVE AFTER DEBUGGING
    console.log('GameService DEBUG: init called with contracts:', {
      contractsProvided: Boolean(contracts),
      diceContractProvided: Boolean(contracts?.dice),
      diceContractAddress: contracts?.dice?.target || 'N/A',
    });

    if (!contracts || !contracts.dice) {
      console.error('GameService DEBUG: Dice contract not provided');
      throw new Error('Dice contract not provided');
    }
    this.diceContract = contracts.dice;

    // DEBUG LOGS - REMOVE AFTER DEBUGGING
    console.log('GameService DEBUG: Dice contract initialized:', {
      address: this.diceContract.target,
      hasGetBetHistory: typeof this.diceContract.getBetHistory === 'function',
      signer: this.diceContract.runner?.address || 'Unknown',
    });
  }

  // Clear specific or all cache entries
  clearCache(type, account) {
    if (type && account) {
      // Clear specific entry
      this.cacheStorage[type].delete(account);
      this.lastUpdatedTimestamps[type].delete(account);
    } else if (type) {
      // Clear all entries of a type
      this.cacheStorage[type].clear();
      this.lastUpdatedTimestamps[type].clear();
    } else {
      // Clear all cache
      Object.keys(this.cacheStorage).forEach(key => {
        this.cacheStorage[key].clear();
        this.lastUpdatedTimestamps[key].clear();
      });
    }
  }

  // Check if cache is valid
  isCacheValid(type, account) {
    if (!this.cacheStorage[type].has(account)) return false;

    const lastUpdated = this.lastUpdatedTimestamps[type].get(account) || 0;
    const now = Date.now();
    return now - lastUpdated < this.cacheExpiry;
  }

  // Place a bet on the dice game
  async placeBet(chosenNumber, amount) {
    // DEBUG LOGS - REMOVE AFTER DEBUGGING
    console.log('GameService DEBUG: Placing bet', {
      chosenNumber,
      amount: amount.toString(),
    });

    if (!this.diceContract) {
      console.error('GameService DEBUG: Dice contract not initialized for bet');
      throw new Error('Dice contract not initialized');
    }

    if (!chosenNumber || chosenNumber < 1 || chosenNumber > 6) {
      console.error('GameService DEBUG: Invalid number selected', chosenNumber);
      throw new Error(
        'Invalid number selected. Choose a number between 1 and 6.'
      );
    }

    if (!amount || amount <= 0) {
      console.error(
        'GameService DEBUG: Invalid bet amount',
        amount?.toString()
      );
      throw new Error('Invalid bet amount');
    }

    try {
      // Check if there's a stuck game before placing a new bet
      try {
        // DEBUG LOGS - REMOVE AFTER DEBUGGING
        console.log(
          'GameService DEBUG: Checking for stuck game before placing bet'
        );
        const gameStatus = await this.diceContract.getGameStatus(
          await this.diceContract.runner.getAddress()
        );
        console.log('GameService DEBUG: Current game status:', {
          isActive: gameStatus.isActive,
          isCompleted: gameStatus.isCompleted,
          recoveryEligible: gameStatus.recoveryEligible,
        });

        if (gameStatus.isActive) {
          console.warn(
            'GameService DEBUG: Attempting to place bet while another game is active!'
          );
        }
      } catch (statusError) {
        console.error(
          'GameService DEBUG: Error checking game status before bet:',
          statusError
        );
      }

      console.log('GameService DEBUG: Calling playDice on contract');
      const tx = await this.diceContract.playDice(chosenNumber, amount);
      console.log('GameService DEBUG: Bet transaction submitted:', tx.hash);

      const receipt = await tx.wait();
      console.log('GameService DEBUG: Bet transaction confirmed:', {
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        events: receipt.logs.length,
      });

      // Clear relevant caches after a bet is placed
      const account = await this.diceContract.runner.getAddress();
      this.clearCache('gameHistory', account);
      this.clearCache('userStats', account);
      this.clearCache('gameStatus', account);

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
      console.error('GameService DEBUG: Error placing bet:', error);
      throw this.parseContractError(error);
    }
  }

  // Get user's game stats with cache
  async getUserStats(_account) {
    if (!this.diceContract || !_account) {
      return {
        gamesPlayed: 0,
        totalWinnings: BigInt(0),
        lastPlayed: 0,
      };
    }

    // Check cache first for instant response
    if (this.isCacheValid('userStats', _account)) {
      return this.cacheStorage.userStats.get(_account);
    }

    try {
      // Call the updated getGameStatus function instead of getUserData
      const gameStatus = await this.diceContract.getGameStatus(_account);

      // Extract relevant data from gameStatus
      // The contract now returns multiple fields in a structured format
      const {
        isActive,
        isWin,
        isCompleted: _isCompleted,
        chosenNumber: _chosenNumber,
        amount: _amount,
        result: _gameResult,
        payout: _payout,
        requestId: _requestId,
        lastPlayTimestamp,
      } = gameStatus;

      // Also get the total games played from the contract
      const _totalGamesPlayed = await this.diceContract.totalGamesPlayed();

      // For the individual player stats, we need to use the bet history
      const { games, stats: _stats } = await this.getGameHistory(_account);

      // Safely convert each payout to BigInt
      const totalWinnings = games.reduce((acc, game) => {
        try {
          // Parse the payout string to BigInt
          const gamePayout = BigInt(game.payout);
          return acc + gamePayout;
        } catch (error) {
          console.error(
            'Error converting payout to BigInt:',
            game.payout,
            error
          );
          return acc;
        }
      }, BigInt(0));

      // Create result object
      const result = {
        gamesPlayed: games.length,
        totalWinnings,
        lastPlayed: Number(lastPlayTimestamp) || 0,
        currentGameActive: isActive,
        currentGameWin: isWin,
      };

      // Update cache
      this.cacheStorage.userStats.set(_account, result);
      this.lastUpdatedTimestamps.userStats.set(_account, Date.now());

      return result;
    } catch (error) {
      console.error('Error fetching game stats:', error);
      return {
        gamesPlayed: 0,
        totalWinnings: BigInt(0),
        lastPlayed: 0,
      };
    }
  }

  // Get user's game history with cache
  async getGameHistory(_account) {
    console.log('GameService.getGameHistory: Starting with account:', _account);
    console.log(
      'GameService.getGameHistory: diceContract initialized:',
      !!this.diceContract
    );

    if (!this.diceContract || !_account) {
      console.log(
        'GameService.getGameHistory: Missing contract or account, returning empty data'
      );
      return { games: [], stats: { totalGamesWon: 0, totalGamesLost: 0 } };
    }

    // Check cache first for instant response
    if (this.isCacheValid('gameHistory', _account)) {
      console.log('GameService.getGameHistory: Returning cached data');
      return this.cacheStorage.gameHistory.get(_account);
    }

    try {
      console.log(
        'GameService.getGameHistory: Fetching fresh data from blockchain'
      );
      console.log(
        'GameService.getGameHistory: Contract address:',
        this.diceContract.target
      );
      console.log(
        'GameService.getGameHistory: Contract has getBetHistory:',
        typeof this.diceContract.getBetHistory === 'function'
      );

      // Get the special result constants from the contract
      let RESULT_FORCE_STOPPED = 254;
      let RESULT_RECOVERED = 255;

      try {
        // Try to fetch constants from contract if available
        RESULT_FORCE_STOPPED = await this.diceContract.RESULT_FORCE_STOPPED();
        RESULT_RECOVERED = await this.diceContract.RESULT_RECOVERED();
        console.log(
          'GameService.getGameHistory: Retrieved constants successfully'
        );
      } catch (err) {
        console.log(
          'GameService.getGameHistory: Could not fetch result constants, using defaults:',
          err
        );
      }

      // Fetch bets using the getBetHistory function
      let bets = [];

      try {
        console.log(
          'GameService.getGameHistory: Calling getBetHistory with account:',
          _account
        );
        bets = await this.diceContract.getBetHistory(_account);
        console.log('GameService.getGameHistory: Got bets:', bets?.length || 0);

        // Inspect the raw bet data structure
        if (bets && bets.length > 0) {
          console.log(
            'GameService.getGameHistory: Raw bet structure of first item:',
            this.safeSerialize(bets[0])
          );
        }
      } catch (error) {
        console.error(
          'GameService.getGameHistory: Error fetching bet history:',
          error
        );
      }

      // Process bet history data
      const processedBets = [];
      let totalGamesWon = 0;
      let totalGamesLost = 0;
      let totalGamesRecovered = 0;
      let totalGamesForceStopped = 0;

      if (bets && bets.length > 0) {
        console.log(
          'GameService.getGameHistory: Processing',
          bets.length,
          'bets'
        );

        for (let i = 0; i < bets.length; i++) {
          const bet = bets[i];
          try {
            console.log(
              `GameService.getGameHistory: Processing bet ${i}:`,
              this.safeSerialize(bet)
            );

            // The contract returns BetHistory structs which have these fields:
            // - chosenNumber (uint8)
            // - rolledNumber (uint8)
            // - timestamp (uint32)
            // - amount (uint256)
            // - payout (uint256)

            // Access fields directly without trying to guess the format
            const chosenNumber = Number(bet.chosenNumber || 0);
            const rolledNumber = Number(bet.rolledNumber || 0);
            const timestamp = Number(bet.timestamp || 0);
            const amount = bet.amount ? bet.amount.toString() : '0';
            const payout = bet.payout ? bet.payout.toString() : '0';

            // Calculate if this is a winning bet
            const isWin =
              rolledNumber === chosenNumber &&
              rolledNumber >= 1 &&
              rolledNumber <= 6;

            const isRecovered = rolledNumber === Number(RESULT_RECOVERED);
            const isForceStopped =
              rolledNumber === Number(RESULT_FORCE_STOPPED);
            const isSpecialResult = isRecovered || isForceStopped;

            // Increment counters
            if (isWin && !isSpecialResult) totalGamesWon++;
            if (!isWin && !isSpecialResult) totalGamesLost++;
            if (isRecovered) totalGamesRecovered++;
            if (isForceStopped) totalGamesForceStopped++;

            // Add processed bet to array
            processedBets.push({
              timestamp: timestamp.toString(),
              chosenNumber: chosenNumber.toString(),
              rolledNumber: rolledNumber.toString(),
              amount,
              payout,
              isWin,
              isRecovered,
              isForceStopped,
              isSpecialResult,
            });
          } catch (error) {
            console.error(
              'GameService.getGameHistory: Error processing bet history item:',
              error,
              this.safeSerialize(bet)
            );
          }
        }
      }

      // Sort bets by timestamp (newest first)
      processedBets.sort((a, b) => {
        return Number(b.timestamp) - Number(a.timestamp);
      });

      // Create result object
      const stats = {
        totalGamesWon,
        totalGamesLost,
        totalGamesRecovered,
        totalGamesForceStopped,
      };

      const historyResult = {
        games: processedBets,
        stats,
      };

      console.log('GameService.getGameHistory: Final result:', {
        gamesCount: processedBets.length,
        stats,
        firstGame:
          processedBets.length > 0
            ? this.safeSerialize(processedBets[0])
            : null,
      });

      // Update cache
      this.cacheStorage.gameHistory.set(_account, historyResult);
      this.lastUpdatedTimestamps.gameHistory.set(_account, Date.now());

      return historyResult;
    } catch (error) {
      console.error('Error in getGameHistory:', error);
      return {
        games: [],
        stats: {
          totalGamesWon: 0,
          totalGamesLost: 0,
          totalGamesRecovered: 0,
          totalGamesForceStopped: 0,
        },
      };
    }
  }

  // Helper method to safely serialize objects with BigInt values for logging
  safeSerialize(obj) {
    try {
      if (obj === null || obj === undefined) {
        return obj;
      }

      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => this.safeSerialize(item));
      }

      // Handle BigInt directly
      if (typeof obj === 'bigint') {
        return obj.toString();
      }

      // Handle objects
      if (typeof obj === 'object') {
        const newObj = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'bigint') {
            newObj[key] = value.toString();
          } else if (typeof value === 'object' && value !== null) {
            newObj[key] = this.safeSerialize(value);
          } else {
            newObj[key] = value;
          }
        }
        return newObj;
      }

      return obj;
    } catch (error) {
      console.error('Error serializing object:', error);
      return '[Unserializable Object]';
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

  // Recover user's own stuck game
  async recoverStuckGame() {
    // DEBUG LOGS - REMOVE AFTER DEBUGGING
    console.log('GameService DEBUG: Attempting to recover stuck game');

    if (!this.diceContract) {
      console.error(
        'GameService DEBUG: Dice contract not initialized for recovery'
      );
      throw new Error('Dice contract not initialized');
    }

    try {
      console.log('GameService DEBUG: Calling recoverOwnStuckGame on contract');
      const tx = await this.diceContract.recoverOwnStuckGame();
      console.log('GameService DEBUG: Recovery transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('GameService DEBUG: Recovery transaction confirmed:', {
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        events: receipt.logs.length,
      });

      // Clear relevant caches after recovery
      const account = await this.diceContract.runner.getAddress();
      this.clearCache('gameHistory', account);
      this.clearCache('userStats', account);
      this.clearCache('gameStatus', account);

      return {
        success: true,
        transaction: receipt,
      };
    } catch (error) {
      console.error('GameService DEBUG: Error recovering stuck game:', error);
      throw this.parseContractError(error);
    }
  }

  // Get game status with cache
  async checkGameRecoveryEligibility(account) {
    if (!this.diceContract || !account) {
      return {
        eligible: false,
        lastPlayTimestamp: 0,
        secondsUntilEligible: null,
      };
    }

    // Check cache first for instant response
    if (this.isCacheValid('gameStatus', account)) {
      return this.cacheStorage.gameStatus.get(account);
    }

    try {
      // Get the game status
      const gameStatus = await this.diceContract.getGameStatus(account);

      // Default recovery timeout to 1 hour (3600 seconds) if we can't get it from contract
      // This is the value used in the contract (defined as GAME_TIMEOUT = 1 hours)
      const DEFAULT_RECOVERY_TIMEOUT = 3600;
      let recoveryTimeoutPeriod = DEFAULT_RECOVERY_TIMEOUT;

      const lastPlayTimestamp = Number(gameStatus.lastPlayTimestamp);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const elapsedTime = currentTimestamp - lastPlayTimestamp;

      // If the game is already eligible for recovery according to the contract,
      // set secondsUntilEligible to 0, otherwise estimate based on our default timeout
      const secondsUntilEligible = gameStatus.recoveryEligible
        ? 0
        : Math.max(0, recoveryTimeoutPeriod - elapsedTime);

      // Create result object
      const result = {
        eligible: gameStatus.recoveryEligible,
        isActive: gameStatus.isActive,
        isCompleted: gameStatus.isCompleted,
        lastPlayTimestamp: lastPlayTimestamp,
        currentTimestamp: currentTimestamp,
        elapsedTime: elapsedTime,
        secondsUntilEligible: secondsUntilEligible,
        recoveryTimeoutPeriod: recoveryTimeoutPeriod,
      };

      // Update cache
      this.cacheStorage.gameStatus.set(account, result);
      this.lastUpdatedTimestamps.gameStatus.set(account, Date.now());

      return result;
    } catch (error) {
      console.error('Error checking game recovery eligibility:', error);
      return {
        eligible: false,
        lastPlayTimestamp: 0,
        secondsUntilEligible: null,
      };
    }
  }

  // Advanced debugging function for incomplete games
  async debugGameState(account) {
    if (!this.diceContract) {
      console.error('DEBUG: No contract initialized for debug');
      return {
        error: 'Contract not initialized',
        details:
          'The dice contract is not available. Please ensure you are connected to the proper network and the app is properly initialized.',
      };
    }

    if (!account) {
      console.error('DEBUG: No account provided for debug');
      return {
        error: 'No wallet account available',
        details: 'Please connect your wallet to enable game debugging.',
      };
    }

    try {
      console.log(
        'DEBUG: Getting detailed game state information for account:',
        account
      );

      // Get full game status
      const gameStatus = await this.diceContract.getGameStatus(account);

      // Format bigints to strings for readability and map numeric keys to named properties
      const formattedStatus = {};

      // First convert all values to strings if they're bigints
      Object.entries(gameStatus).forEach(([key, value]) => {
        formattedStatus[key] =
          typeof value === 'bigint' ? value.toString() : value;
      });

      // If the gameStatus response has numeric keys, map them to named properties
      // This handles different contract return structures
      if (formattedStatus['0'] !== undefined) {
        // This is likely an array-like object from the contract
        const propertyMap = {
          0: 'isActive',
          1: 'isWin',
          2: 'isCompleted',
          3: 'chosenNumber',
          4: 'amount',
          5: 'result',
          6: 'payout',
          7: 'requestId',
          8: 'requestExists',
          9: 'requestProcessed',
          10: 'recoveryEligible',
          11: 'lastPlayTimestamp',
        };

        // Create a more readable object with named properties
        const namedStatus = {};
        Object.entries(propertyMap).forEach(([numKey, propName]) => {
          if (formattedStatus[numKey] !== undefined) {
            namedStatus[propName] = formattedStatus[numKey];
          }
        });

        // Replace the formattedStatus with our better named version
        Object.assign(formattedStatus, namedStatus);
      }

      console.log(
        'DEBUG: Full game status:',
        this.safeSerialize(formattedStatus)
      );

      // Check if user can start a new game
      const canStartNewGame = await this.diceContract.canStartNewGame(account);
      console.log('DEBUG: Can start new game:', canStartNewGame);

      // Get token information
      try {
        const tokenContract = await this.diceContract.gamaToken();
        console.log('DEBUG: Token contract retrieved:', tokenContract);

        // Check if the contract has the expected methods before calling them
        if (typeof tokenContract.balanceOf === 'function') {
          const balance = await tokenContract.balanceOf(account);
          console.log('DEBUG: Token balance:', balance.toString());

          if (typeof tokenContract.allowance === 'function') {
            const allowance = await tokenContract.allowance(
              account,
              this.diceContract.target
            );
            console.log('DEBUG: Token allowance:', allowance.toString());
          } else {
            console.log('DEBUG: Token contract does not have allowance method');
          }
        } else {
          console.log('DEBUG: Token contract does not have balanceOf method');
          // Try alternative access methods for older ethers versions or different contract structure

          // Try direct property access (for some contract implementations)
          if (tokenContract.target) {
            console.log('DEBUG: Token address:', tokenContract.target);
          }
        }
      } catch (tokenError) {
        console.error('DEBUG: Error fetching token information:', tokenError);
      }

      // Check for active VRF request
      if (gameStatus.requestExists) {
        console.log(
          'DEBUG: Pending VRF request found:',
          gameStatus.requestId.toString()
        );

        try {
          // Try to get request details if contract supports it
          // Note: Contract uses s_requests mapping, not getRequestDetails function
          if (typeof this.diceContract.s_requests === 'function') {
            const requestDetails = await this.diceContract.s_requests(
              gameStatus.requestId
            );
            console.log(
              'DEBUG: VRF request details:',
              this.safeSerialize(requestDetails)
            );
          }
        } catch (requestError) {
          console.log('DEBUG: Error fetching request details:', requestError);
        }
      }

      // Try to check game history length for reference
      try {
        const bets = await this.diceContract.getBetHistory(account);
        console.log('DEBUG: Bet history found, length:', bets.length);
      } catch (historyError) {
        console.log(
          'DEBUG: No bet history found or error fetching:',
          historyError
        );
      }

      return {
        gameStatus: formattedStatus,
        canStartNewGame,
        isStuck: gameStatus.isActive && !gameStatus.recoveryEligible,
        needsRecovery: gameStatus.recoveryEligible,
        hasPendingRequest:
          gameStatus.requestExists && !gameStatus.requestProcessed,
      };
    } catch (error) {
      console.error('DEBUG: Error during game state debugging:', error);
      return { error: error.message || 'Unknown error during debugging' };
    }
  }
}

export default new GameService();
