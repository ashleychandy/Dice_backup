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
    <div className="min-h-screen bg-white">
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

      <main className="responsive-container">{children}</main>
    </div>
  );
};

export default Layout;
