import React, { createContext, useContext } from 'react';

// Custom hooks
import useWalletState from '../../hooks/useWallet';

// Create context
const WalletContext = createContext(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  // Use our custom hook for all wallet functionality
  const walletState = useWalletState();

  return (
    <WalletContext.Provider value={walletState}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
