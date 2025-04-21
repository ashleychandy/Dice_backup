import React from 'react';
import Navbar from './Navbar';
import NetworkWarning from '../ui/NetworkWarning';
import { SUPPORTED_CHAIN_IDS } from '../../constants/networks';
import { useWallet } from '../wallet/WalletProvider';

const Layout = ({ children, showNetworkWarning = true }) => {
  const { account, chainId, handleLogout, handleSwitchNetwork, connectWallet } =
    useWallet();
  const switchNetwork = account ? handleSwitchNetwork : connectWallet;

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: 'url("/assets/bg.jpg")' }}
      >
        {/* Optional overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      </div>

      {showNetworkWarning &&
        chainId &&
        !SUPPORTED_CHAIN_IDS.includes(chainId) && (
          <NetworkWarning switchNetwork={switchNetwork} />
        )}

      <Navbar
        account={account}
        chainId={chainId}
        handleLogout={handleLogout}
        switchNetwork={switchNetwork}
      />

      <main className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
