import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DicePage from '../../pages/Dice.jsx';
import { useWallet } from '../wallet/WalletProvider';
import { useNotification } from '../../contexts/NotificationContext.jsx';

const AppRoutes = () => {
  const { contracts, account, handleErrorWithToast } = useWallet();
  const { addToast } = useNotification();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <DicePage
            contracts={contracts}
            account={account}
            onError={handleErrorWithToast}
            addToast={addToast}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
