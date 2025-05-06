import React from 'react';
import Navbar from './Navbar';
import NetworkWarning from '../ui/NetworkWarning';
import { SUPPORTED_CHAIN_IDS } from '../../constants/networks';
import { useWallet } from '../wallet/WalletProvider';

const Layout = ({ children, showNetworkWarning = true }) => {
  const { account, chainId, handleLogout, handleSwitchNetwork, connectWallet } =
    useWallet();

  // Use handleSwitchNetwork directly instead of the conditional switch
  const networkSwitchHandler = networkType => {
    return account ? handleSwitchNetwork(networkType) : connectWallet();
  };

  return (
    <div className="min-h-screen relative bg-white">
      {/* Pure white background with no image or overlay */}

      <div className="relative z-10 flex flex-col">
        {showNetworkWarning &&
          chainId &&
          !SUPPORTED_CHAIN_IDS.includes(chainId) && (
            <NetworkWarning switchNetwork={networkSwitchHandler} />
          )}

        <Navbar
          account={account}
          chainId={chainId}
          handleLogout={handleLogout}
          switchNetwork={account ? handleSwitchNetwork : connectWallet}
        />

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
