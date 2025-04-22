import React from 'react';

const NetworkWarning = ({ switchNetwork }) => {
  const handleSwitchToMainnet = () => {
    if (typeof switchNetwork === 'function') {
      console.log('Switching to mainnet...');
      switchNetwork('mainnet');
    } else {
      console.error(
        'switchNetwork is not a function or is not properly passed'
      );
    }
  };

  const handleSwitchToTestnet = () => {
    if (typeof switchNetwork === 'function') {
      console.log('Switching to Apothem testnet...');
      switchNetwork('apothem');
    } else {
      console.error(
        'switchNetwork is not a function or is not properly passed'
      );
    }
  };

  return (
    <div className="bg-[#22AD74]/90 text-white px-4 py-2 text-center w-full">
      <p className="mb-1">
        Please switch to XDC Network (Chain ID: 50) or Apothem Testnet (Chain
        ID: 51)
      </p>
      <p className="text-sm mb-2">
        <strong>Note:</strong> Apothem is the XDC test network with test tokens.
        Use Mainnet for real transactions.
      </p>
      <div className="flex justify-center gap-4 mt-2">
        <button
          onClick={handleSwitchToMainnet}
          className="px-4 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
        >
          Switch to XDC Mainnet
        </button>
        <button
          onClick={handleSwitchToTestnet}
          className="px-4 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
        >
          Switch to Apothem Testnet
        </button>
      </div>
    </div>
  );
};

export default NetworkWarning;
