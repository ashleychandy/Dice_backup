import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

// Components
import Layout from './components/layout/Layout.jsx';
import WalletProvider from './components/wallet/WalletProvider.jsx';
import ErrorBoundary from './components/error/ErrorBoundary.jsx';
import WagmiProviders from './components/vrf/WagmiProviders.jsx';

// Import directly instead of using lazy loading to avoid potential issues
import AppRoutes from './components/routes/AppRoutes.jsx';

// Utils
import { NotificationProvider } from './contexts/NotificationContext.jsx';

/**
 * Main App component
 * Sets up the global providers and layout structure
 */
function App() {
  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      {/* WagmiProviders must be the outermost provider for all components using wagmi hooks */}
      <WagmiProviders>
        <NotificationProvider>
          <Router>
            <WalletProvider>
              <Layout>
                <AppRoutes />
              </Layout>
            </WalletProvider>
          </Router>
        </NotificationProvider>
      </WagmiProviders>
    </ErrorBoundary>
  );
}

export default App;
