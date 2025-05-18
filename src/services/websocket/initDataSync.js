import dataSyncService from './DataSyncService';

/**
 * Initialize the data synchronization service with the application's dependencies
 * This should be called once during application startup
 *
 * @param {Object} options Configuration options for the service
 * @param {Object} options.queryClient React Query client instance
 * @param {Object} options.contracts Contract instances (dice, token, etc.)
 * @param {number} options.refreshInterval Refresh interval in milliseconds (default: 5000)
 * @returns {Object} The initialized DataSyncService instance
 */
export const initDataSync = options => {
  try {
    if (!options.queryClient) {
      return null;
    }

    // Initialize the service with provided options
    dataSyncService.init({
      queryClient: options.queryClient,
      contracts: options.contracts,
      refreshInterval: options.refreshInterval || 5000, // Default to 5 seconds
    });

    return dataSyncService;
  } catch (error) {
    return null;
  }
};

/**
 * Force refresh all application data
 * @param {string|string[]} dataTypes Specific data types to refresh, or all if not specified
 */
export const refreshAllData = dataTypes => {
  const typesToRefresh = dataTypes || [
    'balance',
    'betHistory',
    'contractStats',
    'gameStatus',
    'contractState',
    'requestInfo',
  ];

  dataSyncService.manualRefresh(typesToRefresh);
};

/**
 * Change the refresh interval for all data synchronization
 * @param {number} milliseconds New refresh interval in milliseconds
 */
export const setDataRefreshInterval = milliseconds => {
  dataSyncService.setRefreshInterval(milliseconds);
};

export default dataSyncService;
