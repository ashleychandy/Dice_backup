export const initialWalletState = {
  provider: null,
  contracts: { token: null, dice: null },
  account: '',
  chainId: null,
  loadingStates: {
    provider: true,
    contracts: true,
    wallet: false,
  },
};

export const walletActionTypes = {
  SET_PROVIDER: 'SET_PROVIDER',
  SET_CONTRACTS: 'SET_CONTRACTS',
  SET_ACCOUNT: 'SET_ACCOUNT',
  SET_CHAIN_ID: 'SET_CHAIN_ID',
  SET_LOADING_STATE: 'SET_LOADING_STATE',
  RESET_STATE: 'RESET_STATE',
  UPDATE_CONTRACTS: 'UPDATE_CONTRACTS',
};

export const walletReducer = (state, action) => {
  switch (action.type) {
    case walletActionTypes.SET_PROVIDER:
      return {
        ...state,
        provider: action.payload,
      };

    case walletActionTypes.SET_CONTRACTS:
      return {
        ...state,
        contracts: action.payload,
      };

    case walletActionTypes.SET_ACCOUNT:
      return {
        ...state,
        account: action.payload,
      };

    case walletActionTypes.SET_CHAIN_ID:
      return {
        ...state,
        chainId: action.payload,
      };

    case walletActionTypes.SET_LOADING_STATE:
      return {
        ...state,
        loadingStates: {
          ...state.loadingStates,
          ...action.payload,
        },
      };

    case walletActionTypes.RESET_STATE:
      return {
        ...initialWalletState,
        loadingStates: {
          ...initialWalletState.loadingStates,
          provider: false,
          contracts: false,
        },
      };

    case walletActionTypes.UPDATE_CONTRACTS:
      return {
        ...state,
        contracts: {
          ...state.contracts,
          ...action.payload,
        },
      };

    default:
      return state;
  }
};
