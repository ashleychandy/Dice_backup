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
    // Component will update automatically based on the chainId value
    // The NetworkContext should handle this internally
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
      return;
    }

    // Don't switch if we're already on this network
    if (currentNetwork?.id === networkId) {
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
        return;
      }

      // Record this attempt time
      sessionStorage.setItem('xdc_last_switch_attempt', now.toString());
    } catch (e) {
      // Silently handle SessionStorage errors
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
      // Let the effects handle state updates from global state
    } catch (error) {
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
        {/* Current network - Sleeker version */}
        <div className="flex items-center p-1.5 rounded-md bg-[#22AD74]/5 border-0">
          <div className="flex items-center w-full">
            <div className="text-xs font-medium text-gray-800">
              {currentNetwork.name}
            </div>
            <div className="ml-auto text-[#22AD74] text-[10px] font-medium flex items-center">
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="mr-0.5 text-[9px]"
              />
              Active
            </div>
          </div>
        </div>

        {/* Other network option - Sleeker version */}
        <button
          onClick={() => handleNetworkSwitch(getOtherNetwork().id)}
          disabled={isNetworkSwitching || localSwitchState.inProgress}
          className={`
            w-full flex items-center p-1.5 rounded-md transition-all hover:bg-gray-50
            ${isNetworkSwitching || localSwitchState.inProgress ? 'opacity-50 cursor-wait' : ''}
          `}
        >
          <div className="flex items-center w-full">
            <div className="text-xs text-gray-600">
              {getOtherNetwork().name}
            </div>

            {isSwitchingTo(getOtherNetwork().id) ? (
              <div className="ml-auto">
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="text-[9px] animate-spin text-gray-400"
                />
              </div>
            ) : (
              <div className="ml-auto opacity-40">
                <FontAwesomeIcon icon={faChevronRight} className="text-[9px]" />
              </div>
            )}
          </div>
        </button>

        {/* Display error if there is one - Smaller version */}
        {(networkError || localSwitchState.error) && (
          <div className="mt-1 p-1 text-[9px] text-red-600 bg-red-50 rounded-md">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-0.5" />
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
          flex items-center space-x-1.5 px-2 py-1 rounded-md border border-transparent hover:border-[#22AD74]/10 hover:bg-[#22AD74]/5 transition-all
          ${showDropdown ? 'border-[#22AD74]/10 bg-[#22AD74]/5' : ''}
          ${isNetworkSwitching || localSwitchState.inProgress ? 'opacity-70 cursor-wait' : ''}
        `}
        onClick={toggleDropdown}
        disabled={isNetworkSwitching || localSwitchState.inProgress}
        aria-label="Network Selector"
      >
        <span className="text-xs font-medium">
          {isSwitchingTo(getOtherNetwork().id) ? (
            <span className="flex items-center">
              <FontAwesomeIcon
                icon={faSpinner}
                className="animate-spin mr-1 text-[9px]"
              />
              <span className="text-xs">Switching...</span>
            </span>
          ) : (
            currentNetwork.name
          )}
        </span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`text-[9px] transition-transform duration-200 ${
            showDropdown ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Show error message if any - Smaller version */}
      {(networkError || localSwitchState.error) && (
        <div className="absolute top-full right-0 mt-1 z-10 w-40 p-1 text-[9px] text-red-600 bg-red-50 rounded-md">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-0.5" />
          {networkError || localSwitchState.error}
        </div>
      )}

      {/* Network dropdown - Sleeker version */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -2, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -2, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-1 w-40 bg-white rounded-md shadow-sm border border-gray-100/80 overflow-hidden z-50"
          >
            {/* Networks list - Compact version */}
            <div className="p-1">
              {/* Current network */}
              <div className="p-1 flex items-center rounded bg-[#22AD74]/5">
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-800">
                    {currentNetwork.name}
                  </div>
                </div>
                <div className="text-[9px] text-[#22AD74] flex items-center">
                  <FontAwesomeIcon icon={faCheckCircle} className="mr-0.5" />
                  Active
                </div>
              </div>

              {/* Other network option */}
              <button
                onClick={() => handleNetworkSwitch(getOtherNetwork().id)}
                disabled={isNetworkSwitching || localSwitchState.inProgress}
                className={`w-full p-1 flex items-center rounded hover:bg-gray-50 transition-all mt-0.5
                  ${isNetworkSwitching || localSwitchState.inProgress ? 'opacity-50 cursor-wait' : ''}`}
              >
                <div className="flex-1">
                  <div className="text-xs text-gray-600">
                    {getOtherNetwork().name}
                  </div>
                </div>
                {isSwitchingTo(getOtherNetwork().id) && (
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="text-[9px] animate-spin text-gray-400"
                  />
                )}
              </button>
            </div>

            <div className="px-1 py-0.5 border-t border-gray-100/80 text-[8px] text-gray-400">
              Network change will reload
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NetworkSwitcher;
