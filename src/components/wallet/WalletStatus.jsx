import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { truncateAddress } from '../../utils/formatting';

const WalletStatus = () => {
  const {
    account,
    chainId,
    isWalletConnected,
    isNetworkSupported,
    loadingStates,
    handleSwitchNetwork,
  } = useWallet();

  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [switchingNetwork, setSwitchingNetwork] = useState(null);
  const dropdownRef = useRef(null);

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNetworkDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const switchToNetwork = async networkType => {
    try {
      setSwitchingNetwork(networkType);
      await handleSwitchNetwork(networkType);
      setShowNetworkDropdown(false);
    } catch (error) {
      console.error('Failed to switch network:', error);
    } finally {
      setSwitchingNetwork(null);
    }
  };

  if (loadingStates.provider) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-800 rounded-lg text-sm text-white">
        <div className="w-3 h-3 rounded-full border-2 border-white/20 border-t-white/80 animate-spin"></div>
        <span>Connecting...</span>
      </div>
    );
  }

  if (!isWalletConnected) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-800 rounded-lg text-sm text-white/70">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <span>Not connected</span>
      </div>
    );
  }

  // Get network details
  const getNetworkDetails = () => {
    if (!chainId)
      return {
        name: 'Unknown',
        color: 'bg-gray-500',
        textColor: 'text-gray-500',
      };

    switch (chainId) {
      case 50:
        return {
          name: 'XDC Mainnet',
          color: 'bg-green-500',
          textColor: 'text-green-500',
        };
      case 51:
        return {
          name: 'Apothem Testnet',
          color: 'bg-blue-500',
          textColor: 'text-blue-500',
        };
      default:
        return {
          name: `Chain ID: ${chainId}`,
          color: 'bg-red-500',
          textColor: 'text-red-500',
        };
    }
  };

  const network = getNetworkDetails();

  if (!isNetworkSupported) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-900/30 border border-red-500/30 rounded-lg text-sm text-white">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <span>Unsupported Network: {network.name}</span>
        <div className="relative ml-2" ref={dropdownRef}>
          <button
            onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
            className="px-2 py-0.5 text-xs bg-red-500/20 hover:bg-red-500/30 rounded"
          >
            Switch Network
          </button>

          {showNetworkDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-secondary-900 border border-secondary-700 rounded-lg shadow-lg z-50 py-2">
              <div className="px-3 py-1 text-xs text-secondary-400 border-b border-secondary-700 mb-1">
                Available Networks
              </div>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-800 flex items-center"
                onClick={() => switchToNetwork('mainnet')}
                disabled={switchingNetwork === 'mainnet'}
              >
                {switchingNetwork === 'mainnet' ? (
                  <div className="w-3 h-3 mr-2 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin"></div>
                ) : (
                  <div className="w-3 h-3 mr-2 rounded-full bg-green-500"></div>
                )}
                XDC Mainnet
                <span className="ml-auto text-xs text-secondary-500">
                  ID: 50
                </span>
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-800 flex items-center"
                onClick={() => switchToNetwork('apothem')}
                disabled={switchingNetwork === 'apothem'}
              >
                {switchingNetwork === 'apothem' ? (
                  <div className="w-3 h-3 mr-2 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin"></div>
                ) : (
                  <div className="w-3 h-3 mr-2 rounded-full bg-blue-500"></div>
                )}
                Apothem Testnet
                <span className="ml-auto text-xs text-secondary-500">
                  ID: 51
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-800 rounded-lg text-sm text-white">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className={`w-3 h-3 rounded-full ${network.color}`}></div>
          <span>{network.name}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-secondary-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {showNetworkDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-secondary-900 border border-secondary-700 rounded-lg shadow-lg z-50 py-2">
            <div className="px-3 py-1 text-xs text-secondary-400 border-b border-secondary-700 mb-1">
              Switch Network
            </div>
            <button
              className={`w-full text-left px-3 py-2 text-sm ${chainId === 50 ? 'bg-secondary-800' : 'hover:bg-secondary-800'} flex items-center`}
              onClick={() => switchToNetwork('mainnet')}
              disabled={chainId === 50 || switchingNetwork === 'mainnet'}
            >
              {switchingNetwork === 'mainnet' ? (
                <div className="w-3 h-3 mr-2 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin"></div>
              ) : (
                <div className="w-3 h-3 mr-2 rounded-full bg-green-500"></div>
              )}
              XDC Mainnet
              {chainId === 50 && (
                <span className="ml-auto text-xs text-green-500">✓</span>
              )}
            </button>
            <button
              className={`w-full text-left px-3 py-2 text-sm ${chainId === 51 ? 'bg-secondary-800' : 'hover:bg-secondary-800'} flex items-center`}
              onClick={() => switchToNetwork('apothem')}
              disabled={chainId === 51 || switchingNetwork === 'apothem'}
            >
              {switchingNetwork === 'apothem' ? (
                <div className="w-3 h-3 mr-2 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin"></div>
              ) : (
                <div className="w-3 h-3 mr-2 rounded-full bg-blue-500"></div>
              )}
              Apothem Testnet
              {chainId === 51 && (
                <span className="ml-auto text-xs text-blue-500">✓</span>
              )}
            </button>
          </div>
        )}
      </div>

      <span className="mx-1 text-secondary-400">|</span>
      <span className="text-secondary-300">{truncateAddress(account)}</span>
    </div>
  );
};

export default WalletStatus;
