import { ethers } from 'ethers';

/**
 * DataSyncService - Manages automatic data synchronization for the application
 *
 * This service centralizes all data fetching logic to ensure consistent
 * and efficient data synchronization across all components.
 */
class DataSyncService {
  constructor() {
    this.intervals = {};
    this.listeners = {};
    this.queryClient = null;
    this.contracts = null;
    this.refreshInterval = 5000; // 5 second default
    this.isInitialized = false;
  }

  /**
   * Initialize the service with necessary dependencies
   * @param {Object} options - Configuration options
   * @param {Object} options.queryClient - React Query client for data management
   * @param {Object} options.contracts - Application contract instances
   * @param {number} options.refreshInterval - Refresh interval in milliseconds
   */
  init({ queryClient, contracts, refreshInterval = 5000 }) {
    if (this.isInitialized) {
      this.stop();
    }

    this.queryClient = queryClient;
    this.contracts = contracts;
    this.refreshInterval = refreshInterval;
    this.isInitialized = true;

    // Start the data synchronization
    this.start();

    return this;
  }

  /**
   * Start all data synchronization mechanisms
   */
  start() {
    if (!this.isInitialized) {
      // Not initialized, can't start
      return;
    }

    // Start polling for all data types
    this.startPolling();

    // Set up contract event listeners
    this.setupEventListeners();
  }

  /**
   * Stop all data synchronization
   */
  stop() {
    // Clear all active intervals
    Object.keys(this.intervals).forEach(key => {
      clearInterval(this.intervals[key]);
      delete this.intervals[key];
    });

    // Remove all contract event listeners
    this.removeEventListeners();
  }

  /**
   * Set up polling for all data types
   */
  startPolling() {
    // Add balance and allowance polling
    this.intervals.balance = setInterval(() => {
      this.refreshData('balance');
    }, this.refreshInterval);

    // Add game history polling
    this.intervals.gameHistory = setInterval(() => {
      this.refreshData('betHistory');
    }, this.refreshInterval);

    // Add contract stats polling
    this.intervals.contractStats = setInterval(() => {
      this.refreshData('contractStats');
    }, this.refreshInterval);

    // Add game status polling
    this.intervals.gameStatus = setInterval(() => {
      this.refreshData('gameStatus');
    }, this.refreshInterval);

    // Add contract state polling
    this.intervals.contractState = setInterval(() => {
      this.refreshData('contractState');
    }, this.refreshInterval);

    // Add request tracking polling
    this.intervals.requestTracking = setInterval(() => {
      this.refreshData('requestInfo');
    }, this.refreshInterval);
  }

  /**
   * Set up contract event listeners for real-time updates
   */
  setupEventListeners() {
    if (!this.contracts?.dice) return;

    try {
      // Listen for bet events
      this.listeners.betPlaced = (player, requestId, chosenNumber, amount) => {
        // Only refresh data for the current player
        if (player.toLowerCase() === this.account?.toLowerCase()) {
          this.refreshData(['betHistory', 'balance', 'gameStatus']);
        }
      };

      // Listen for game completed events
      this.listeners.gameCompleted = (player, requestId, result, payout) => {
        // Only refresh data for the current player
        if (player.toLowerCase() === this.account?.toLowerCase()) {
          this.refreshData(['betHistory', 'balance', 'gameStatus']);
        }
      };

      // Listen for recovery events
      this.listeners.gameRecovered = (player, requestId, refundAmount) => {
        // Only refresh data for the current player
        if (player.toLowerCase() === this.account?.toLowerCase()) {
          this.refreshData(['betHistory', 'balance', 'gameStatus']);
        }
      };

      // Listen for contract state changes
      this.listeners.paused = () => {
        this.refreshData('contractState');
      };

      this.listeners.unpaused = () => {
        this.refreshData('contractState');
      };

      // Add the listeners to the contract
      this.contracts.dice.on('BetPlaced', this.listeners.betPlaced);
      this.contracts.dice.on('GameCompleted', this.listeners.gameCompleted);
      this.contracts.dice.on('GameRecovered', this.listeners.gameRecovered);
      this.contracts.dice.on('Paused', this.listeners.paused);
      this.contracts.dice.on('Unpaused', this.listeners.unpaused);
    } catch (error) {
      // Error handling without logging
    }
  }

  /**
   * Remove all contract event listeners
   */
  removeEventListeners() {
    if (!this.contracts?.dice) return;

    try {
      // Clean up all listeners
      this.contracts.dice.removeAllListeners('BetPlaced');
      this.contracts.dice.removeAllListeners('GameCompleted');
      this.contracts.dice.removeAllListeners('GameRecovered');
      this.contracts.dice.removeAllListeners('Paused');
      this.contracts.dice.removeAllListeners('Unpaused');
    } catch (error) {
      // Error handling without logging
    }
  }

  /**
   * Refresh specified data in React Query
   * @param {string|string[]} dataTypes - Data type(s) to refresh
   */
  refreshData(dataTypes) {
    if (!this.queryClient) return;

    const types = Array.isArray(dataTypes) ? dataTypes : [dataTypes];
    const timestamp = Date.now(); // Add timestamp for cache busting

    types.forEach(type => {
      this.queryClient.invalidateQueries({
        queryKey: [type],
        refetchActive: true,
        refetchInactive: true,
      });
    });
  }

  /**
   * Manually trigger a data refresh for specific data types
   * @param {string|string[]} dataTypes - Data type(s) to refresh
   */
  manualRefresh(dataTypes) {
    this.refreshData(dataTypes);
  }

  /**
   * Update the refresh interval for all polling operations
   * @param {number} interval - New interval in milliseconds
   */
  setRefreshInterval(interval) {
    if (interval < 1000) {
      // Enforce minimum interval
      interval = 1000;
    }

    this.refreshInterval = interval;

    // Restart polling with new interval
    this.stop();
    this.start();
  }
}

// Create a singleton instance
const dataSyncService = new DataSyncService();

// Add to window for debugging purposes
if (typeof window !== 'undefined') {
  window.dataSyncService = dataSyncService;
}

export default dataSyncService;
