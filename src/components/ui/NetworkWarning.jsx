import React from 'react';

const NetworkWarning = ({ switchNetwork }) => (
  <div className="bg-gaming-error/90 text-white px-4 py-2 text-center">
    <p>
      Please switch to XDC Network(Chain ID: 50) or Apothem Testnet(Chain ID:
      51)
    </p>
    <div className="flex justify-center gap-4 mt-2">
      <button
        onClick={() => switchNetwork('mainnet')}
        className="px-4 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
      >
        Switch to XDC Mainnet
      </button>
      <button
        onClick={() => switchNetwork('testnet')}
        className="px-4 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
      >
        Switch to Apothem Testnet
      </button>
    </div>
  </div>
);

export default NetworkWarning;
