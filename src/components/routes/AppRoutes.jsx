import React, { useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DicePage from '../../pages/Dice.jsx';
import { useWallet } from '../wallet/WalletProvider';
import { useNotification } from '../../contexts/NotificationContext.jsx';

const AppRoutes = () => {
  const { contracts, account, handleErrorWithToast } = useWallet();
  const { addToast } = useNotification();

  // Create a properly structured contracts object for the DicePage
  const mappedContracts = useMemo(() => {
    // Check if we have tokenContract/diceContract structure
    if (contracts?.tokenContract || contracts?.diceContract) {
      return {
        token: contracts.tokenContract,
        dice: contracts.diceContract,
      };
    }
    // Otherwise use the existing structure
    return contracts;
  }, [contracts]);

  // Debug log to see the contract structure
  console.log('Original contracts:', contracts);
  console.log('Mapped contracts for DicePage:', mappedContracts);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <DicePage
            contracts={mappedContracts}
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
