import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetwork, NETWORKS } from '../../contexts/NetworkContext';
import { useWallet } from '../../components/wallet/WalletProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faExclamationTriangle,
  faCheckCircle,
  faChevronRight,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';

const NetworkSwitcher = ({ isInDropdown = false }) => {
  const { currentNetwork, switchNetwork, isNetworkSwitching, networkError } =
    useNetwork();
  const { chainId } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const [switchTarget, setSwitchTarget] = useState(null);
  const [localSwitchState, setLocalSwitchState] = useState({
    inProgress: false,
    error: null,
  });

  // Make sure our local state matches the global state
  useEffect(() => {
    setLocalSwitchState(prev => ({
      ...prev,
      inProgress: isNetworkSwitching,
    }));

    if (!isNetworkSwitching) {
      const timer = setTimeout(() => {
        setSwitchTarget(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isNetworkSwitching]);

  // Update local error state from global
  useEffect(() => {
    if (networkError) {
      setLocalSwitchState(prev => ({
        ...prev,
        error: networkError,
      }));

      // Clear error after some time
      const timer = setTimeout(() => {
        setLocalSwitchState(prev => ({
          ...prev,
          error: null,
        }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [networkError]);

  // Make sure our UI reflects the actual wallet chain ID
  useEffect(() => {
    if (chainId === 50 && currentNetwork.id !== 'mainnet') {
      console.log(
        'ChainID is 50 (Mainnet) but UI shows different network, fixing...'
      );
      // No need to do anything, NetworkContext should handle this
    } else if (chainId === 51 && currentNetwork.id !== 'apothem') {
      console.log(
        'ChainID is 51 (Apothem) but UI shows different network, fixing...'
      );
      // No need to do anything, NetworkContext should handle this
    }
  }, [chainId, currentNetwork.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = event => {
      // If the dropdown is shown and user clicks outside, close it
      if (
        showDropdown &&
        !event.target.closest('.network-switcher-container')
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const toggleDropdown = () => {
    setShowDropdown(prev => !prev);
  };

  const handleNetworkSwitch = async networkId => {
    // Don't attempt switch if already switching
    if (isNetworkSwitching || localSwitchState.inProgress) {
      console.log('Already switching networks, ignoring request');
      return;
    }

    // Don't switch if we're already on this network
    if (currentNetwork?.id === networkId) {
      console.log(`Already on ${networkId} network, no switch needed`);
      return;
    }

    // Throttle rapid switch attempts
    try {
      const lastSwitchAttempt = sessionStorage.getItem(
        'xdc_last_switch_attempt'
      );
      const lastSwitchTime = parseInt(lastSwitchAttempt || '0');
      const now = Date.now();

      if (lastSwitchAttempt && now - lastSwitchTime < 3000) {
        console.log('Ignoring rapid network switch attempt');
        return;
      }

      // Record this attempt time
      sessionStorage.setItem('xdc_last_switch_attempt', now.toString());
    } catch (e) {
      console.warn('Error accessing sessionStorage:', e);
    }

    // Update UI to show which network we're switching to
    setSwitchTarget(networkId);
    setShowDropdown(false);
    setLocalSwitchState({
      inProgress: true,
      error: null,
    });

    try {
      // Attempt the network switch
      const success = await switchNetwork(networkId);

      if (!success) {
        console.warn('Network switch was unsuccessful');
        // Let the effects handle state updates from global state
      }
    } catch (error) {
      console.error('Error in network switch handler:', error);
      setLocalSwitchState({
        inProgress: false,
        error: error.message || 'Network switch failed',
      });

      // Store the error for debugging
      try {
        sessionStorage.setItem(
          'xdc_switch_error',
          error.message || 'Unknown error'
        );
      } catch (e) {
        // Ignore storage errors
      }
    }
  };

  // Get the other network (the one we're not currently on)
  const getOtherNetwork = () => {
    // Make sure we have a valid current network
    if (!currentNetwork || !currentNetwork.id) {
      console.warn(
        'Current network not properly defined, defaulting to Apothem'
      );
      return NETWORKS.APOTHEM;
    }

    return currentNetwork.id === 'mainnet'
      ? NETWORKS.APOTHEM
      : NETWORKS.MAINNET;
  };

  // Check if a specific network is being switched to
  const isSwitchingTo = networkId => {
    return (
      (isNetworkSwitching || localSwitchState.inProgress) &&
      (switchTarget === networkId ||
        (currentNetwork.id !== networkId && !switchTarget))
    );
  };

  // If component is rendered inside the dropdown menu
  if (isInDropdown) {
    return (
      <div className="space-y-1.5">
        {/* Current network */}
        <div className="flex items-center p-2 rounded-md bg-gray-50/80 border border-gray-100 group">
          <div className="flex items-center space-x-2 flex-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: currentNetwork.color }}
            ></div>
            <div className="text-sm font-medium text-gray-800">
              {currentNetwork.name}
            </div>
            <div className="ml-auto flex items-center text-xs text-green-600">
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="mr-1 text-[10px]"
              />
              <span className="text-[10px] font-medium">Active</span>
            </div>
          </div>
        </div>

        {/* Other network option */}
        <button
          onClick={() => handleNetworkSwitch(getOtherNetwork().id)}
          disabled={isNetworkSwitching || localSwitchState.inProgress}
          className={`
            w-full flex items-center p-2 rounded-md border border-transparent hover:bg-gray-50/80 hover:border-gray-100 transition-all
            ${isNetworkSwitching || localSwitchState.inProgress ? 'opacity-50 cursor-wait' : ''}
          `}
        >
          <div className="flex items-center space-x-2 flex-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getOtherNetwork().color }}
            ></div>
            <div className="text-sm text-gray-600">
              {getOtherNetwork().name}
            </div>

            {isSwitchingTo(getOtherNetwork().id) && (
              <div className="ml-auto">
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="text-xs animate-spin text-blue-500"
                />
              </div>
            )}
          </div>
        </button>

        {/* Display error if there is one */}
        {(networkError || localSwitchState.error) && (
          <div className="mt-2 p-2 text-xs text-red-600 bg-red-50 rounded-md border border-red-100">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
            {networkError || localSwitchState.error}
          </div>
        )}
      </div>
    );
  }

  // Standalone version (minimalist)
  return (
    <div className="network-switcher-container relative">
      <button
        className={`
          flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all
          ${showDropdown ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/20'}
          ${isNetworkSwitching || localSwitchState.inProgress ? 'opacity-70 cursor-wait' : ''}
        `}
        onClick={toggleDropdown}
        disabled={isNetworkSwitching || localSwitchState.inProgress}
        aria-label="Network Selector"
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: currentNetwork.color }}
        ></div>
        <span className="text-sm font-medium">
          {isSwitchingTo(getOtherNetwork().id) ? (
            <span className="flex items-center">
              Switching
              <FontAwesomeIcon
                icon={faSpinner}
                className="ml-1 animate-spin text-blue-500"
              />
            </span>
          ) : (
            currentNetwork.name
          )}
        </span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`text-xs transition-transform ${
            showDropdown ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* Show error message if any */}
      {(networkError || localSwitchState.error) && (
        <div className="absolute top-full right-0 mt-1 z-10 w-48 p-2 text-xs text-red-600 bg-red-50 rounded-md border border-red-100">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
          {networkError || localSwitchState.error}
        </div>
      )}

      {/* Network dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-100 rounded-md shadow-sm overflow-hidden z-50"
          >
            <div className="p-2 border-b border-gray-100/80">
              <div className="text-xs text-gray-500 font-medium">Network</div>
            </div>

            {/* Networks list */}
            <div className="p-1">
              {/* Current network */}
              <div className="p-1.5 flex items-center rounded-md bg-gray-50/80">
                <div
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: currentNetwork.color }}
                ></div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-800">
                    {currentNetwork.name}
                  </div>
                </div>
                <div className="text-[10px] text-green-600 flex items-center">
                  <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                  Active
                </div>
              </div>

              {/* Other network option */}
              <button
                onClick={() => handleNetworkSwitch(getOtherNetwork().id)}
                disabled={isNetworkSwitching || localSwitchState.inProgress}
                className={`w-full p-1.5 flex items-center rounded-md hover:bg-gray-50/80 transition-colors mt-1 
                  ${isNetworkSwitching || localSwitchState.inProgress ? 'opacity-50 cursor-wait' : ''}`}
              >
                <div
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: getOtherNetwork().color }}
                ></div>
                <div className="flex-1">
                  <div className="text-xs text-gray-600">
                    {getOtherNetwork().name}
                  </div>
                </div>
                {isSwitchingTo(getOtherNetwork().id) && (
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="text-[10px] animate-spin text-blue-500 ml-1"
                  />
                )}
              </button>

              {/* Display error if there is one */}
              {(networkError || localSwitchState.error) && (
                <div className="mt-1 p-1.5 text-[10px] text-red-600 bg-red-50 rounded-md">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="mr-1"
                  />
                  {networkError || localSwitchState.error}
                </div>
              )}
            </div>

            <div className="px-2 py-1.5 border-t border-gray-100/80 text-[10px] text-gray-400">
              Network change will reload the page
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NetworkSwitcher;
