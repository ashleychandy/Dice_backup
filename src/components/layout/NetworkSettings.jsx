import React, { useState, useEffect } from 'react';
import {
  saveUserRpcUrl,
  NETWORK_CONFIG,
  saveUserPreferredNetwork,
} from '../../config';
import { useNotification } from '../../contexts/NotificationContext';
import { useNetwork } from '../../contexts/NetworkContext';
import { useWallet } from '../wallet/WalletProvider';
import { getCurrentRpcUrlFromWallet } from '../../utils/walletUtils';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faRedo,
  faTimes,
  faSync,
} from '@fortawesome/free-solid-svg-icons';

const NetworkSettings = ({ onClose }) => {
  const { addToast } = useNotification();
  const { currentNetwork, refreshNetworkConfig } = useNetwork();
  const { provider, account, chainId } = useWallet();

  const [mainnetRpc, setMainnetRpc] = useState('');
  const [apothemRpc, setApothemRpc] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSyncingFromWallet, setIsSyncingFromWallet] = useState(false);
  const [testResults, setTestResults] = useState({
    mainnet: null,
    apothem: null,
  });

  const inputClasses =
    'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ' +
    'focus:outline-none focus:ring-primary-500 focus:border-primary-500';

  const getStatusClass = isOk => (isOk ? 'text-green-600' : 'text-red-600');

  // Load current RPC URLs on mount
  useEffect(() => {
    setMainnetRpc(NETWORK_CONFIG.mainnet.rpcUrl);
    setApothemRpc(NETWORK_CONFIG.apothem.rpcUrl);
  }, []);

  // Function to test RPC connection
  const testRpcConnection = async url => {
    if (!url) return { ok: false, error: 'No URL provided' };

    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      if (!response.ok) {
        return { ok: false, error: `HTTP error: ${response.status}` };
      }

      const data = await response.json();

      if (data.error) {
        return {
          ok: false,
          error: data.error.message || 'RPC returned an error',
        };
      }

      return {
        ok: true,
        blockNumber: parseInt(data.result, 16),
        latency,
      };
    } catch (error) {
      console.error('RPC connection test error:', error);
      return {
        ok: false,
        error: error.message || 'Failed to connect to RPC endpoint',
      };
    }
  };

  // Function to test all connections
  const testConnections = async () => {
    setIsTestingConnection(true);
    setTestResults({ mainnet: null, apothem: null });

    try {
      const [mainnetResult, apothemResult] = await Promise.all([
        testRpcConnection(mainnetRpc),
        testRpcConnection(apothemRpc),
      ]);

      setTestResults({
        mainnet: mainnetResult,
        apothem: apothemResult,
      });
    } catch (error) {
      addToast(`Error testing connections: ${error.message}`, 'error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Function to sync RPC URL from wallet
  const syncFromWallet = async () => {
    if (!provider || !account) {
      addToast('Please connect your wallet first', 'warning');
      return;
    }

    setIsSyncingFromWallet(true);

    try {
      // Determine the current network type
      let networkType = null;
      if (chainId === 50) {
        networkType = 'mainnet';
      } else if (chainId === 51) {
        networkType = 'apothem';
      } else {
        addToast(`Unsupported network: Chain ID ${chainId}`, 'error');
        setIsSyncingFromWallet(false);
        return;
      }

      // Get RPC URL from wallet
      const rpcUrl = await getCurrentRpcUrlFromWallet(provider, chainId);

      if (!rpcUrl) {
        addToast('Could not retrieve RPC URL from your wallet', 'error');
        setIsSyncingFromWallet(false);
        return;
      }

      // Update the form field based on network
      if (networkType === 'mainnet') {
        setMainnetRpc(rpcUrl);
      } else if (networkType === 'apothem') {
        setApothemRpc(rpcUrl);
      }

      // Test the connection
      const testResult = await testRpcConnection(rpcUrl);

      if (testResult.ok) {
        addToast(
          `Successfully synced ${networkType} RPC URL from your wallet`,
          'success'
        );

        // Update test results display
        setTestResults(prev => ({
          ...prev,
          [networkType]: testResult,
        }));
      } else {
        addToast(
          `Retrieved RPC URL (${rpcUrl}) failed connection test: ${testResult.error}`,
          'warning'
        );
      }
    } catch (error) {
      console.error('Error syncing RPC URL from wallet:', error);
      addToast(`Error syncing RPC URL: ${error.message}`, 'error');
    } finally {
      setIsSyncingFromWallet(false);
    }
  };

  // Function to save RPC settings
  const saveSettings = () => {
    let hasChanges = false;

    // Save mainnet RPC
    if (mainnetRpc && mainnetRpc !== NETWORK_CONFIG.mainnet.rpcUrl) {
      saveUserRpcUrl('mainnet', mainnetRpc);
      hasChanges = true;
    }

    // Save apothem RPC
    if (apothemRpc && apothemRpc !== NETWORK_CONFIG.apothem.rpcUrl) {
      saveUserRpcUrl('apothem', apothemRpc);
      hasChanges = true;
    }

    if (hasChanges) {
      addToast('Network settings saved. Refreshing application...', 'success');

      // Close the modal
      if (onClose) onClose();

      // Short delay before refreshing to allow the toast to be seen
      setTimeout(() => {
        // Use NetworkContext to refresh network config
        refreshNetworkConfig();
      }, 1500);
    } else {
      addToast('No changes detected in network settings.', 'info');
      if (onClose) onClose();
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setMainnetRpc('https://rpc.xinfin.network');
    setApothemRpc('https://rpc.apothem.network');

    // Clear localStorage settings
    localStorage.removeItem('xdc_dice_mainnet_rpc');
    localStorage.removeItem('xdc_dice_apothem_rpc');

    addToast('Network settings reset to defaults.', 'info');
  };

  return (
    <Card className="max-w-lg mx-auto p-4 bg-white shadow-lg rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Network Settings
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        )}
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Customize RPC endpoints for better performance or to use your own
          infrastructure.
        </p>
        {account && (
          <div className="mt-2">
            <Button
              variant="secondary"
              className="text-sm w-full"
              onClick={syncFromWallet}
              disabled={isSyncingFromWallet || !account}
            >
              <FontAwesomeIcon
                icon={faSync}
                className="mr-2"
                spin={isSyncingFromWallet}
              />
              {isSyncingFromWallet
                ? 'Syncing...'
                : 'Sync RPC URL from Connected Wallet'}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Mainnet RPC URL
          </label>
          <input
            type="text"
            value={mainnetRpc}
            onChange={e => setMainnetRpc(e.target.value)}
            className={inputClasses}
            placeholder="Enter Mainnet RPC URL"
          />
          <p
            className={`mt-1 text-sm ${getStatusClass(testResults.mainnet?.ok)}`}
          >
            {testResults.mainnet?.ok
              ? `Connected (Block: ${testResults.mainnet.blockNumber})`
              : `Error: ${testResults.mainnet?.error}`}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Apothem RPC URL
          </label>
          <input
            type="text"
            value={apothemRpc}
            onChange={e => setApothemRpc(e.target.value)}
            className={inputClasses}
            placeholder="Enter Apothem RPC URL"
          />
          <p
            className={`mt-1 text-sm ${getStatusClass(testResults.apothem?.ok)}`}
          >
            {testResults.apothem?.ok
              ? `Connected (Block: ${testResults.apothem.blockNumber})`
              : `Error: ${testResults.apothem?.error}`}
          </p>
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <div>
          <Button variant="secondary" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>

          <Button
            variant="secondary"
            onClick={testConnections}
            disabled={isTestingConnection}
            className="ml-2"
          >
            {isTestingConnection ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>

        <Button variant="primary" onClick={saveSettings}>
          <FontAwesomeIcon icon={faSave} className="mr-2" />
          Save Settings
        </Button>
      </div>

      {showAdvanced && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-3">
            Advanced Settings
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            These settings require technical knowledge and may affect
            application performance.
          </p>

          {/* Advanced settings can be added here */}
        </div>
      )}

      <div className="mt-4 text-center">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
        </button>
      </div>
    </Card>
  );
};

export default NetworkSettings;
