import React, { useState, useEffect } from 'react';
import { useNetwork, NETWORKS } from '../../contexts/NetworkContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faInfoCircle,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

const NetworkWarning = () => {
  const { currentNetwork, switchNetwork, isNetworkSwitching, networkError } =
    useNetwork();
  const [activeNetwork, setActiveNetwork] = useState(null);
  const [showRetryTip, setShowRetryTip] = useState(false);

  // Reset active network when switching is completed
  useEffect(() => {
    if (!isNetworkSwitching && activeNetwork) {
      // Add a small delay before resetting to ensure UI updates are seen
      const timer = setTimeout(() => setActiveNetwork(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [isNetworkSwitching, activeNetwork]);

  // Show retry tip when error persists
  useEffect(() => {
    if (networkError) {
      const timer = setTimeout(() => setShowRetryTip(true), 5000);
      return () => {
        clearTimeout(timer);
        setShowRetryTip(false);
      };
    }
  }, [networkError]);

  const handleSwitchNetwork = async networkId => {
    setActiveNetwork(networkId);
    await switchNetwork(networkId);
  };

  return (
    <div className="bg-gray-900 text-white px-4 py-4 text-center w-full">
      <div className="max-w-3xl mx-auto">
        <h3 className="text-lg font-semibold mb-2">Network Switch Required</h3>
        <p className="mb-3">
          Please connect to one of the supported XDC networks to continue:
        </p>

        {networkError && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-sm">
            <div className="flex items-center space-x-2">
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                className="text-red-400"
              />
              <span className="text-red-200">{networkError}</span>
            </div>

            {showRetryTip && (
              <div className="mt-2 text-xs text-red-300 italic flex items-center space-x-2">
                <FontAwesomeIcon icon={faInfoCircle} />
                <span>
                  If you&apos;re having trouble switching networks, try manually
                  switching in your wallet first and then refreshing this page.
                </span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Mainnet Card */}
          <div
            className={`bg-gray-800 rounded-lg p-4 border-2 transition-all ${
              currentNetwork?.id === 'mainnet'
                ? 'border-green-500'
                : activeNetwork === 'mainnet'
                  ? 'border-[#22AD74]'
                  : 'border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-[#22AD74] flex items-center justify-center mr-2">
                  <span className="font-bold text-sm">XDC</span>
                </div>
                <h4 className="font-semibold">XDC Mainnet</h4>
              </div>
              <span className="text-xs font-mono bg-gray-700 px-2 py-1 rounded">
                Chain ID: {NETWORKS.MAINNET.chainId}
              </span>
            </div>

            <ul className="text-sm text-left mb-3 text-gray-300">
              <li className="flex items-center mb-1">
                <span className="mr-2">•</span>
                <span>Use for real transactions with actual value</span>
              </li>
              <li className="flex items-center mb-1">
                <span className="mr-2">•</span>
                <span>Requires real XDC tokens for gas fees</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                <span>Compatible with official XDC wallets</span>
              </li>
            </ul>

            <button
              onClick={() => handleSwitchNetwork('mainnet')}
              disabled={isNetworkSwitching || currentNetwork?.id === 'mainnet'}
              className={`w-full py-2 rounded-lg font-medium transition-colors ${
                currentNetwork?.id === 'mainnet'
                  ? 'bg-green-700 cursor-default'
                  : isNetworkSwitching && activeNetwork === 'mainnet'
                    ? 'bg-[#22AD74]/50 cursor-wait'
                    : 'bg-[#22AD74] hover:bg-[#22AD74]/80'
              }`}
            >
              {currentNetwork?.id === 'mainnet' ? (
                'Currently Connected'
              ) : isNetworkSwitching && activeNetwork === 'mainnet' ? (
                <span className="flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="animate-spin mr-2"
                  />
                  Switching...
                </span>
              ) : (
                'Switch to XDC Mainnet'
              )}
            </button>
          </div>

          {/* Testnet Card */}
          <div
            className={`bg-gray-800 rounded-lg p-4 border-2 transition-all ${
              currentNetwork?.id === 'apothem'
                ? 'border-green-500'
                : activeNetwork === 'apothem'
                  ? 'border-blue-500'
                  : 'border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-2">
                  <span className="font-bold text-sm">Test</span>
                </div>
                <h4 className="font-semibold">Apothem Testnet</h4>
              </div>
              <span className="text-xs font-mono bg-gray-700 px-2 py-1 rounded">
                Chain ID: {NETWORKS.APOTHEM.chainId}
              </span>
            </div>

            <ul className="text-sm text-left mb-3 text-gray-300">
              <li className="flex items-center mb-1">
                <span className="mr-2">•</span>
                <span>Use for testing with no real value at risk</span>
              </li>
              <li className="flex items-center mb-1">
                <span className="mr-2">•</span>
                <span>Test tokens available via faucets</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                <span>Ideal for developers and learning</span>
              </li>
            </ul>

            <button
              onClick={() => handleSwitchNetwork('apothem')}
              disabled={isNetworkSwitching || currentNetwork?.id === 'apothem'}
              className={`w-full py-2 rounded-lg font-medium transition-colors ${
                currentNetwork?.id === 'apothem'
                  ? 'bg-green-700 cursor-default'
                  : isNetworkSwitching && activeNetwork === 'apothem'
                    ? 'bg-blue-500/50 cursor-wait'
                    : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {currentNetwork?.id === 'apothem' ? (
                'Currently Connected'
              ) : isNetworkSwitching && activeNetwork === 'apothem' ? (
                <span className="flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="animate-spin mr-2"
                  />
                  Switching...
                </span>
              ) : (
                'Switch to Apothem Testnet'
              )}
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          {!networkError ? (
            'If you&apos;re new to XDC, we recommend trying the Apothem testnet first to get familiar with the platform.'
          ) : (
            <>
              Having trouble? Make sure your wallet is unlocked and refresh the
              page after switching networks manually.
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default NetworkWarning;
