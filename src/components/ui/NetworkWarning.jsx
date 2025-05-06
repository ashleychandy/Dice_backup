import React, { useState } from 'react';
import { useNetwork, NETWORKS } from '../../contexts/NetworkContext';

const NetworkWarning = () => {
  const { switchNetwork, isNetworkSwitching, networkError } = useNetwork();
  const [activeNetwork, setActiveNetwork] = useState(null);

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
            Error: {networkError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Mainnet Card */}
          <div
            className={`bg-gray-800 rounded-lg p-4 border-2 transition-all ${activeNetwork === 'mainnet' ? 'border-[#22AD74]' : 'border-transparent'}`}
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
              disabled={isNetworkSwitching}
              className={`w-full py-2 rounded-lg font-medium transition-colors ${
                isNetworkSwitching && activeNetwork === 'mainnet'
                  ? 'bg-[#22AD74]/50 cursor-wait'
                  : 'bg-[#22AD74] hover:bg-[#22AD74]/80'
              }`}
            >
              {isNetworkSwitching && activeNetwork === 'mainnet' ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Switching...
                </span>
              ) : (
                'Switch to XDC Mainnet'
              )}
            </button>
          </div>

          {/* Testnet Card */}
          <div
            className={`bg-gray-800 rounded-lg p-4 border-2 transition-all ${activeNetwork === 'apothem' ? 'border-blue-500' : 'border-transparent'}`}
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
              disabled={isNetworkSwitching}
              className={`w-full py-2 rounded-lg font-medium transition-colors ${
                isNetworkSwitching && activeNetwork === 'apothem'
                  ? 'bg-blue-500/50 cursor-wait'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isNetworkSwitching && activeNetwork === 'apothem' ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Switching...
                </span>
              ) : (
                'Switch to Apothem Testnet'
              )}
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          If you&apos;re new to XDC, we recommend trying the Apothem testnet
          first to get familiar with the platform.
        </p>
      </div>
    </div>
  );
};

export default NetworkWarning;
