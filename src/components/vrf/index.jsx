import VrfStatus from './VrfStatus';
import VrfRecoveryModal from './VrfRecoveryModal';
import WagmiProviders from './WagmiProviders';
import React from 'react';

// Export individual components
export { WagmiProviders, VrfStatus, VrfRecoveryModal };

// Wrapped components with WagmiProviders
export const VrfStatusWithProvider = props => (
  <WagmiProviders>
    <VrfStatus {...props} />
  </WagmiProviders>
);

export const VrfRecoveryModalWithProvider = props => (
  <WagmiProviders>
    <VrfRecoveryModal {...props} />
  </WagmiProviders>
);
