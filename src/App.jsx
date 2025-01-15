import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { debounce } from "lodash";
import {
  useQuery,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import DicePage from "./pages/Dice.jsx";

import DiceABI from "./contracts/abi/Dice.json";
import TokenABI from "./contracts/abi/GamaToken.json";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Add network constants
const NETWORKS = {
  MAINNET: {
    chainId: 50,
    name: "XDC Mainnet",
    rpcUrl: import.meta.env.VITE_XDC_MAINNET_RPC,
    contracts: {
      token: import.meta.env.VITE_TOKEN_ADDRESS,
      dice: import.meta.env.VITE_DICE_ADDRESS,
    },
  },
  APOTHEM: {
    chainId: 51,
    name: "XDC Apothem Testnet",
    rpcUrl: import.meta.env.VITE_XDC_APOTHEM_RPC,
    contracts: {
      token: import.meta.env.VITE_APOTHEM_TOKEN_ADDRESS,
      dice: import.meta.env.VITE_APOTHEM_DICE_ADDRESS,
    },
  },
};

const SUPPORTED_CHAIN_IDS = [
  NETWORKS.MAINNET.chainId,
  NETWORKS.APOTHEM.chainId,
];

// Enhanced Toast Component
const Toast = ({ message, type, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    className={`fixed bottom-4 right-4 max-w-md w-full mx-4 p-4 rounded-xl shadow-xl 
                backdrop-blur-md border transition-all duration-300 z-50
                ${
                  type === "success"
                    ? "bg-gaming-success/10 border-gaming-success/30"
                    : type === "error"
                    ? "bg-gaming-error/10 border-gaming-error/30"
                    : type === "warning"
                    ? "bg-gaming-warning/10 border-gaming-warning/30"
                    : "bg-gaming-info/10 border-gaming-info/30"
                }`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div
          className={`p-2 rounded-full 
                      ${
                        type === "success"
                          ? "bg-gaming-success/20"
                          : type === "error"
                          ? "bg-gaming-error/20"
                          : type === "warning"
                          ? "bg-gaming-warning/20"
                          : "bg-gaming-info/20"
                      }`}
        />
        <p className="text-white/90 font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-white/60 hover:text-white/90 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </motion.div>
);

const NetworkWarning = () => (
  <div className="bg-gaming-error/90 text-white px-4 py-2 text-center">
    <p>
      Please switch to XDC Network(Chain ID: 50) or Apothem Testnet(Chain ID:
      51)
    </p>
    <div className="flex justify-center gap-4 mt-2">
      <button
        onClick={() => switchNetwork("mainnet")}
        className="px-4 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
      >
        Switch to XDC Mainnet
      </button>
      <button
        onClick={() => switchNetwork("testnet")}
        className="px-4 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
      >
        Switch to Apothem Testnet
      </button>
    </div>
  </div>
);

// Add network switching function
const switchNetwork = async (networkType) => {
  if (!window.ethereum) return;

  const network =
    networkType === "mainnet" ? NETWORKS.MAINNET : NETWORKS.APOTHEM;
  const chainIdHex = `0x${network.chainId.toString(16)}`;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    setTimeout(() => window.location.reload(), 1000);
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainIdHex,
              chainName: network.name,
              rpcUrls: [network.rpcUrl],
              nativeCurrency: {
                name: "XDC",
                symbol: "XDC",
                decimals: 18,
              },
            },
          ],
        });
      } catch (addError) {
        throw addError;
      }
    } else {
      throw switchError;
    }
  }
};

function App() {
  const [contracts, setContracts] = useState({
    token: null,
    dice: null,
  });
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loadingStates, setLoadingStates] = useState({
    provider: true,
    contracts: true,
    wallet: false,
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const queryClient = new QueryClient();

  const addToast = useCallback((message, type = "info") => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if a toast with the same message already exists
    setToasts((prev) => {
      // Don't add if the same message already exists
      if (prev.some((toast) => toast.message === message)) {
        return prev;
      }

      // Limit to 3 toasts at a time
      const newToasts = [...prev, { id, message, type }];
      if (newToasts.length > 3) {
        return newToasts.slice(-3);
      }
      return newToasts;
    });

    // Clear this specific toast after 5 seconds
    const timeoutId = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);

    // Store timeout ID for cleanup
    return () => clearTimeout(timeoutId);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const handleError = useCallback(
    (error, context = "") => {
      // Prevent duplicate toasts by checking the error message and timestamp
      const errorKey = `${error.message || "Unknown error"}_${Math.floor(
        Date.now() / 1000
      )}`;

      // Don't show another toast if the same error occurred in the last second
      if (window._lastErrorKey === errorKey) {
        return;
      }
      window._lastErrorKey = errorKey;

      let errorMessage = "Something went wrong. Please try again later.";
      let errorType = "error";

      if (error.code === 4001) {
        errorMessage = "Transaction cancelled by user";
        errorType = "warning";
      } else if (error.code === -32002) {
        errorMessage =
          "Please check your wallet - a connection request is pending";
        errorType = "warning";
      } else if (error.code === -32603) {
        errorMessage =
          "Network connection issue. Please check your wallet connection.";
        errorType = "error";
      } else if (error.message?.includes("insufficient allowance")) {
        errorMessage =
          "Insufficient token allowance. Please approve tokens first.";
        errorType = "error";
      } else if (error.message?.includes("insufficient balance")) {
        errorMessage = "Insufficient token balance for this transaction.";
        errorType = "error";
      }

      addToast(errorMessage, errorType);
      return errorMessage;
    },
    [addToast]
  );

  const initializeContracts = useCallback(
    async (provider, account) => {
      try {
        const network = await provider.getNetwork();
        const currentChainId =
          typeof network.chainId === "bigint"
            ? Number(network.chainId)
            : Number(network.chainId);

        const networkKey = Object.keys(NETWORKS).find(
          (key) => NETWORKS[key].chainId === currentChainId
        );

        const networkConfig = NETWORKS[networkKey];

        if (!networkConfig) {
          throw new Error(
            `Unsupported network. Connected to chain ID: ${currentChainId}. Supported chain IDs: ${SUPPORTED_CHAIN_IDS.join(
              ", "
            )}`
          );
        }

        const tokenContract = new ethers.Contract(
          networkConfig.contracts.token,
          TokenABI.abi,
          provider
        );

        const diceContract = new ethers.Contract(
          networkConfig.contracts.dice,
          DiceABI.abi,
          provider
        );

        setContracts({
          token: tokenContract,
          dice: diceContract,
        });

        setLoadingStates((prev) => ({ ...prev, contracts: false }));
        return { tokenContract, diceContract };
      } catch (error) {
        handleError(error, "initializeContracts");
        setLoadingStates((prev) => ({ ...prev, contracts: false }));
        return null;
      }
    },
    [handleError]
  );

  const handleChainChanged = useCallback(async (newChainId) => {
    const chainIdNumber = parseInt(newChainId);
    setChainId(chainIdNumber);

    if (!SUPPORTED_CHAIN_IDS.includes(chainIdNumber)) {
      setContracts({ token: null, dice: null });
    } else {
      window.location.reload();
    }
  }, []);

  const validateNetwork = useCallback(async (provider) => {
    try {
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      setChainId(currentChainId);

      if (!SUPPORTED_CHAIN_IDS.includes(currentChainId)) {
        throw new Error(
          `Please switch to a supported network. Connected to chain ID: ${currentChainId}`
        );
      }

      const currentNetwork = Object.values(NETWORKS).find(
        (n) => n.chainId === currentChainId
      );
      if (!currentNetwork) throw new Error("Network configuration not found");

      try {
        await provider.getBlockNumber();
      } catch (rpcError) {
        throw new Error(`Failed to connect to ${currentNetwork.name}`);
      }

      return currentChainId;
    } catch (error) {
      throw error;
    }
  }, []);

  const connectWallet = async () => {
    setLoadingStates((prev) => ({ ...prev, wallet: true }));

    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this application");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      if (!SUPPORTED_CHAIN_IDS.includes(currentChainId)) {
        await switchNetwork("mainnet");
        return;
      }

      await validateNetwork(provider);

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      await initializeContracts(provider, accounts[0]);
      setAccount(accounts[0]);
      addToast("Wallet connected successfully!", "success");
    } catch (err) {
      handleError(err, "connectWallet");
      setContracts({ token: null, dice: null });
    } finally {
      setLoadingStates((prev) => ({ ...prev, wallet: false }));
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!window.ethereum) {
        setLoadingStates((prev) => ({
          ...prev,
          provider: false,
          contracts: false,
        }));
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await validateNetwork(provider);

        if (!mounted) return;

        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        if (!mounted) return;

        if (accounts.length > 0) {
          await initializeContracts(provider, accounts[0]);
          setAccount(accounts[0]);
        }
      } catch (err) {
        handleError(err, "initialization");
      } finally {
        if (mounted) {
          setLoadingStates((prev) => ({
            ...prev,
            provider: false,
            contracts: false,
          }));
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [validateNetwork, initializeContracts, handleError]);

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          setAccount("");
          addToast("Please connect your wallet", "warning");
        } else {
          setAccount(accounts[0]);
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [addToast, handleChainChanged]);

  const handleLogout = () => {
    setAccount("");
    setContracts({ token: null, dice: null });
    addToast("Logged out successfully", "success");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-white">
        {chainId && !SUPPORTED_CHAIN_IDS.includes(chainId) && (
          <NetworkWarning />
        )}

        <header className="px-6 border-b border-[#22AD74]/20 bg-white sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center h-16">
            <div className="flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer">
              <a
                href="https://gamacoin.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3"
              >
                <img
                  src="/assets/gama-logo.svg"
                  alt="GAMA Logo"
                  className="h-8 sm:h-9"
                />
                <span className="text-xl sm:text-2xl font-bold text-[#22AD74] bg-gradient-to-r from-[#22AD74] to-[#22AD74]/70 text-transparent bg-clip-text">
                  Dice
                </span>
              </a>
            </div>
            {account ? (
              <div className="flex items-center gap-2 sm:gap-4">
                {chainId && (
                  <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[#22AD74]/5 border border-[#22AD74]/20">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        SUPPORTED_CHAIN_IDS.includes(chainId)
                          ? "bg-[#22AD74]"
                          : "bg-red-500"
                      } animate-pulse`}
                    />
                    <span className="text-gray-600">
                      {chainId === 50
                        ? "XDC Mainnet"
                        : chainId === 51
                        ? "Apothem Testnet"
                        : "Unsupported Network"}
                    </span>
                  </div>
                )}
                <div className="px-4 py-2 rounded-lg text-sm bg-[#22AD74]/5 border border-[#22AD74]/20 hover:bg-[#22AD74]/10 transition-colors">
                  <span className="text-gray-600 hidden sm:inline">
                    Connected:
                  </span>{" "}
                  <span className="text-gray-900">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="p-2 rounded-lg bg-[#22AD74]/5 border border-[#22AD74]/20 hover:bg-[#22AD74]/10 transition-colors group"
                  >
                    <svg
                      className="w-6 h-6 text-[#22AD74] group-hover:rotate-12 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-[#22AD74]/20 shadow-xl z-50 overflow-hidden">
                      <div className="py-2">
                        <div className="px-4 py-2 bg-[#22AD74]/5">
                          <p className="text-sm font-medium text-gray-900">
                            Account
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {account}
                          </p>
                        </div>
                        <button
                          className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-[#22AD74]/5 transition-colors flex items-center gap-2"
                          onClick={() => {
                            setDropdownOpen(false);
                            window.open(
                              "https://app.xspswap.finance/#/swap?outputCurrency=0x678adf7955d8f6dcaa9e2fcc1c5ba70bccc464e6",
                              "_blank"
                            );
                          }}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                            />
                          </svg>
                          Buy GAMA Token
                        </button>
                        <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                          Networks
                        </div>
                        <button
                          className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-[#22AD74]/5 transition-colors flex items-center gap-2"
                          onClick={() => {
                            switchNetwork("mainnet");
                            setDropdownOpen(false);
                          }}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              chainId === 50 ? "bg-[#22AD74]" : "bg-gray-300"
                            }`}
                          />
                          XDC Mainnet
                        </button>
                        <button
                          className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-[#22AD74]/5 transition-colors flex items-center gap-2"
                          onClick={() => {
                            switchNetwork("testnet");
                            setDropdownOpen(false);
                          }}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              chainId === 51 ? "bg-[#22AD74]" : "bg-gray-300"
                            }`}
                          />
                          Apothem Testnet
                        </button>
                        <div className="border-t border-[#22AD74]/20 my-1"></div>
                        <button
                          className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                          onClick={() => {
                            handleLogout();
                            setDropdownOpen(false);
                          }}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="px-6 py-2.5 rounded-lg bg-[#22AD74] text-white border border-[#22AD74]/20 hover:bg-[#22AD74]/90 transition-all duration-300 flex items-center gap-2 hover:gap-3"
                disabled={loadingStates.wallet}
              >
                {loadingStates.wallet ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect Wallet
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        <main className="responsive-container">
          <DicePage
            contracts={contracts}
            account={account}
            onError={handleError}
            addToast={addToast}
          />
        </main>

        <AnimatePresence mode="popLayout">
          <div className="fixed bottom-4 right-4 space-y-2 z-50">
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                layout
              >
                <Toast
                  message={toast.message}
                  type={toast.type}
                  onClose={() => removeToast(toast.id)}
                />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>
    </QueryClientProvider>
  );
}

export default App;
