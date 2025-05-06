import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetwork, NETWORKS } from '../../contexts/NetworkContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faExclamationTriangle,
  faCheckCircle,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

const NetworkSwitcher = ({ isInDropdown = false }) => {
  const { currentNetwork, switchNetwork, isNetworkSwitching, networkError } =
    useNetwork();
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleDropdown = () => {
    setShowDropdown(prev => !prev);
  };

  const handleNetworkSwitch = async networkId => {
    setShowDropdown(false);
    await switchNetwork(networkId);
  };

  // Get the other network (the one we're not currently on)
  const getOtherNetwork = () => {
    return currentNetwork.id === 'mainnet'
      ? NETWORKS.APOTHEM
      : NETWORKS.MAINNET;
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
          disabled={isNetworkSwitching}
          className={`
            w-full flex items-center p-2 rounded-md border border-transparent hover:bg-gray-50/80 hover:border-gray-100 transition-all
            ${isNetworkSwitching ? 'opacity-50 cursor-wait' : ''}
          `}
        >
          <div className="flex items-center space-x-2 flex-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getOtherNetwork().color }}
            ></div>
            <div className="text-sm font-medium text-gray-600">
              {getOtherNetwork().name}
            </div>

            <div className="ml-auto">
              {isNetworkSwitching ? (
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="animate-spin text-gray-400 text-xs"
                />
              ) : (
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="text-gray-400 text-xs"
                />
              )}
            </div>
          </div>
        </button>

        {networkError && (
          <div className="p-2 bg-red-50/60 border border-red-100 rounded-md text-xs text-red-600 flex items-center space-x-2 mt-0.5">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className="text-[10px]"
            />
            <span className="text-[10px]">{networkError}</span>
          </div>
        )}
      </div>
    );
  }

  // Standalone version (minimalist)
  return (
    <div className="relative">
      {/* Network display button */}
      <button
        onClick={toggleDropdown}
        disabled={isNetworkSwitching}
        className={`
          flex items-center space-x-2 px-3 py-1.5 rounded-md transition-all
          ${isNetworkSwitching ? 'opacity-75 cursor-not-allowed' : 'hover:bg-gray-50/80'}
          border border-gray-200
        `}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: currentNetwork.color }}
        ></div>
        <span className="text-sm font-medium text-gray-700">
          {isNetworkSwitching ? 'Switching...' : currentNetwork.name}
        </span>
        {isNetworkSwitching && (
          <FontAwesomeIcon
            icon={faSpinner}
            className="animate-spin text-xs text-gray-500"
          />
        )}
      </button>

      {/* Network error message */}
      {networkError && (
        <div className="absolute top-full mt-1 w-full bg-red-50/70 border border-red-100 rounded-md p-1.5 text-xs text-red-600 flex items-center space-x-1.5">
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="text-[10px]"
          />
          <span className="text-[10px]">{networkError}</span>
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
                disabled={isNetworkSwitching}
                className="w-full p-1.5 flex items-center rounded-md hover:bg-gray-50/80 transition-colors mt-1"
              >
                <div
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: getOtherNetwork().color }}
                ></div>
                <div className="flex-1 text-left">
                  <div className="text-xs font-medium text-gray-700">
                    {getOtherNetwork().name}
                  </div>
                </div>
                {isNetworkSwitching && (
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="animate-spin text-[10px] text-gray-400"
                  />
                )}
              </button>
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
