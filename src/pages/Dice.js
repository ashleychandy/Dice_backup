const GameStats = ({ diceContract, account }) => {
  // Use React Query for fetching stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["gameStats", account],
    queryFn: async () => {
      if (!diceContract || !account) {
        return {
          gamesPlayed: 0,
          totalBets: BigInt(0),
          totalWinnings: BigInt(0),
        };
      }

      try {
        // Get user data directly from contract
        const [gamesPlayed, totalBets, totalWinnings, lastPlayed] =
          await diceContract.getUserData(account);

        return {
          gamesPlayed: Number(gamesPlayed),
          totalBets: BigInt(totalBets),
          totalWinnings: BigInt(totalWinnings),
        };
      } catch (error) {
        console.error("Error fetching game stats:", error);
        throw error;
      }
    },
    refetchInterval: 10000,
    enabled: !!diceContract && !!account,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-secondary-800/50 rounded w-1/3"></div>
        <div className="h-8 bg-secondary-800/50 rounded w-2/3"></div>
        <div className="h-8 bg-secondary-800/50 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="stat-card">
        <h3 className="text-secondary-400">Games Played</h3>
        <p className="text-2xl font-bold text-gaming-primary">
          {stats?.gamesPlayed || 0}
        </p>
      </div>
      <div className="stat-card">
        <h3 className="text-secondary-400">Total Bets</h3>
        <p className="text-2xl font-bold text-gaming-accent">
          {ethers.formatEther(stats?.totalBets || BigInt(0))} GAMA
        </p>
      </div>
      <div className="stat-card">
        <h3 className="text-secondary-400">Total Winnings</h3>
        <p className="text-2xl font-bold text-gaming-primary">
          {ethers.formatEther(stats?.totalWinnings || BigInt(0))} GAMA
        </p>
      </div>
    </div>
  );
};

const GameHistory = ({ diceContract, account, onError }) => {
  const [filter, setFilter] = useState("all");

  const { data: gameData, isLoading } = useQuery({
    queryKey: ["gameHistory", account],
    queryFn: async () => {
      if (!diceContract || !account)
        return { games: [], stats: { totalGamesWon: 0, totalGamesLost: 0 } };

      try {
        // Fetch bets using the new getBetHistory function
        const bets = await diceContract.getBetHistory(account);

        // Process bets and calculate stats
        const processedGames = bets
          .map((bet) => ({
            chosenNumber: Number(bet.chosenNumber),
            rolledNumber: Number(bet.rolledNumber),
            amount: bet.amount.toString(),
            timestamp: Number(bet.timestamp),
            isWin: Number(bet.chosenNumber) === Number(bet.rolledNumber),
            payout: bet.payout.toString(),
          }))
          .reverse();

        // Calculate stats
        const stats = processedGames.reduce(
          (acc, game) => ({
            totalGamesWon: acc.totalGamesWon + (game.isWin ? 1 : 0),
            totalGamesLost: acc.totalGamesLost + (game.isWin ? 0 : 1),
          }),
          {
            totalGamesWon: 0,
            totalGamesLost: 0,
          }
        );

        return { games: processedGames, stats };
      } catch (error) {
        console.error("Error fetching game history:", error);
        onError(error);
        return { games: [], stats: { totalGamesWon: 0, totalGamesLost: 0 } };
      }
    },
    refetchInterval: 10000,
    enabled: !!diceContract && !!account,
  });

  // Filter games based on selected filter
  const filteredGames = useMemo(() => {
    if (!gameData?.games) return [];
    if (filter === "all") return gameData.games;
    if (filter === "wins") return gameData.games.filter((game) => game.isWin);
    if (filter === "losses")
      return gameData.games.filter((game) => !game.isWin);
    return gameData.games;
  }, [gameData?.games, filter]);

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white/90">Game History</h2>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <FilterButton
          active={filter === "all"}
          onClick={() => setFilter("all")}
        >
          All Games
        </FilterButton>
        <FilterButton
          active={filter === "wins"}
          onClick={() => setFilter("wins")}
        >
          Wins
        </FilterButton>
        <FilterButton
          active={filter === "losses"}
          onClick={() => setFilter("losses")}
        >
          Losses
        </FilterButton>
      </div>

      {/* Game List */}
      <div className="space-y-4">
        {isLoading ? (
          <GameHistoryLoader />
        ) : filteredGames.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence>
            {filteredGames.map((game, index) => (
              <GameHistoryItem key={game.timestamp} game={game} index={index} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

const BetInput = ({
  value,
  onChange,
  min = "1",
  userBalance = "0",
  disabled,
  diceContract,
}) => {
  const [error, setError] = useState("");
  const [localValue, setLocalValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Fetch max bet from contract
  const { data: maxBet = "1000000000000000000000" } = useQuery({
    queryKey: ["maxBet", diceContract?.target],
    queryFn: async () => {
      if (!diceContract) return "1000000000000000000000"; // Default to 1000 GAMA if no contract
      return await diceContract.MAX_BET_AMOUNT();
    },
    enabled: !!diceContract,
  });

  useEffect(() => {
    if (value) {
      setLocalValue(formatDisplayValue(value));
    }
  }, [value]);

  const formatDisplayValue = (weiValue) => {
    try {
      // Convert from wei to whole tokens
      return (BigInt(weiValue) / BigInt("1000000000000000000")).toString();
    } catch (error) {
      console.error("Error formatting display value:", error);
      return "0";
    }
  };

  const validateInput = (input) => {
    if (input === "") return true;
    // Only allow whole numbers
    const regex = /^\d+$/;
    if (!regex.test(input)) return false;
    if (input.startsWith("0") && input.length > 1) return false;
    return true;
  };

  const parseTokenAmount = (amount) => {
    try {
      if (!amount || isNaN(Number(amount))) {
        return BigInt(0);
      }

      // Convert to wei (multiply by 10^18)
      const weiValue = BigInt(amount) * BigInt("1000000000000000000");
      const minValue = BigInt(min);
      const maxValue = BigInt(maxBet);
      const balanceValue = BigInt(userBalance);
      const effectiveMaxValue =
        maxValue < balanceValue ? maxValue : balanceValue;

      // Check if potential win (6x bet) would overflow uint256
      const MAX_UINT256 = BigInt(
        "115792089237316195423570985008687907853269984665640564039457584007913129639935"
      );
      const potentialWin = weiValue * BigInt(6);
      if (potentialWin > MAX_UINT256) {
        throw new Error("Bet amount too large - potential win would overflow");
      }

      if (weiValue < minValue) {
        throw new Error(`Minimum bet is ${formatDisplayValue(minValue)} GAMA`);
      }
      if (weiValue > effectiveMaxValue) {
        throw new Error(
          `Maximum bet is ${formatDisplayValue(effectiveMaxValue)} GAMA`
        );
      }

      return weiValue;
    } catch (error) {
      throw error;
    }
  };

  const handleInputChange = (e) => {
    const inputValue = e.target.value.trim();

    if (validateInput(inputValue)) {
      setLocalValue(inputValue);
      setError("");

      try {
        if (inputValue === "") {
          onChange(BigInt(min));
          return;
        }

        const weiValue = parseTokenAmount(inputValue);
        const maxValue = BigInt(maxBet);
        const balanceValue = BigInt(userBalance);
        const effectiveMaxValue =
          maxValue < balanceValue ? maxValue : balanceValue;

        // If the value is too high, use the maximum allowed value instead
        if (weiValue > effectiveMaxValue) {
          setLocalValue(formatDisplayValue(effectiveMaxValue));
          onChange(effectiveMaxValue);
        } else {
          onChange(weiValue);
        }
      } catch (error) {
        setError(error.message);
        // Don't reset to min value, keep the current value
        if (error.message.includes("too large")) {
          const maxValue = BigInt(maxBet);
          const balanceValue = BigInt(userBalance);
          const effectiveMaxValue =
            maxValue < balanceValue ? maxValue : balanceValue;
          setLocalValue(formatDisplayValue(effectiveMaxValue));
          onChange(effectiveMaxValue);
        } else {
          onChange(BigInt(min));
        }
      }
    }
  };

  const handleQuickAmount = (percentage) => {
    try {
      const maxValue = BigInt(maxBet);
      const balanceValue = BigInt(userBalance);
      const effectiveMaxValue =
        maxValue < balanceValue ? maxValue : balanceValue;
      const amount = (effectiveMaxValue * BigInt(percentage)) / BigInt(100);
      const minValue = BigInt(min);

      // Check if potential win (6x bet) would overflow uint256
      const MAX_UINT256 = BigInt(
        "115792089237316195423570985008687907853269984665640564039457584007913129639935"
      );
      const potentialWin = amount * BigInt(6);
      if (potentialWin > MAX_UINT256) {
        setError("Amount too large - potential win would overflow");
        onChange(minValue);
        setLocalValue(formatDisplayValue(minValue));
        return;
      }

      if (amount < minValue) {
        setError("Amount too small, using minimum bet");
        onChange(minValue);
        setLocalValue(formatDisplayValue(minValue));
      } else {
        setError("");
        onChange(amount);
        setLocalValue(formatDisplayValue(amount));
      }
    } catch (error) {
      console.error("Error calculating quick amount:", error);
      setError("Error calculating amount");
      onChange(BigInt(min));
      setLocalValue(formatDisplayValue(BigInt(min)));
    }
  };

  const handleAdjustAmount = (increment) => {
    try {
      const currentValue = BigInt(value);
      const maxValue = BigInt(maxBet);
      const balanceValue = BigInt(userBalance);
      const effectiveMaxValue =
        maxValue < balanceValue ? maxValue : balanceValue;
      const step = effectiveMaxValue / BigInt(100); // 1% step
      const minValue = BigInt(min);
      const MAX_UINT256 = BigInt(
        "115792089237316195423570985008687907853269984665640564039457584007913129639935"
      );

      let newValue;
      if (increment) {
        newValue = currentValue + step;
        if (newValue > effectiveMaxValue) newValue = effectiveMaxValue;

        // Check for potential win overflow
        const potentialWin = newValue * BigInt(6);
        if (potentialWin > MAX_UINT256) {
          setError("Cannot increase - potential win would overflow");
          return;
        }
      } else {
        newValue = currentValue - step;
        if (newValue < minValue) newValue = minValue;
      }

      setError("");
      onChange(newValue);
      setLocalValue(formatDisplayValue(newValue));
    } catch (error) {
      console.error("Error adjusting amount:", error);
      setError("Error adjusting amount");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleAdjustAmount(false)}
            disabled={disabled || BigInt(value) <= BigInt(min)}
            className="w-10 h-10 rounded-lg bg-secondary-700/50 hover:bg-secondary-600/50 
                     flex items-center justify-center text-secondary-300
                     disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Decrease amount"
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
                d="M20 12H4"
              />
            </svg>
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              value={localValue}
              onChange={handleInputChange}
              disabled={disabled}
              className="w-full px-4 py-2 bg-secondary-800/50 rounded-lg
                       text-white placeholder-secondary-400 
                       focus:outline-none focus:ring-2 focus:ring-primary-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter bet amount"
            />
            <div
              className="absolute right-3 top-1/2 transform -translate-y-1/2 
                          text-sm text-secondary-400"
            >
              GAMA
            </div>
          </div>

          <button
            onClick={() => handleAdjustAmount(true)}
            disabled={
              disabled ||
              BigInt(value) >= BigInt(maxBet) ||
              BigInt(value) >= BigInt(userBalance)
            }
            className="w-10 h-10 rounded-lg bg-secondary-700/50 hover:bg-secondary-600/50 
                     flex items-center justify-center text-secondary-300
                     disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Increase amount"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="text-error-500 text-sm animate-fadeIn" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "25%", value: 25 },
          { label: "50%", value: 50 },
          { label: "75%", value: 75 },
          { label: "MAX", value: 100 },
        ].map(({ label, value: percentage }) => (
          <button
            key={percentage}
            onClick={() => handleQuickAmount(percentage)}
            disabled={disabled}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                     bg-secondary-700/50 hover:bg-secondary-600/50 text-secondary-300
                     hover:text-white active:scale-95 disabled:opacity-50
                     disabled:cursor-not-allowed"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

const BalancePanel = ({ userBalance, allowance, potentialWinnings }) => {
  const [showDetails, setShowDetails] = useState(false);

  const balanceItems = [
    {
      label: "Token Balance",
      value: ethers.formatEther(userBalance.toString()),
      icon: (
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
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "Token Allowance",
      value: allowance > 0 ? "Approved" : "Not Approved",
      icon: (
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "Potential Win",
      value: ethers.formatEther(potentialWinnings.toString()),
      icon: (
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
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
  ];

  const formatValue = (value) => {
    if (value === "Approved" || value === "Not Approved") return value;
    const formatted = parseFloat(value).toFixed(0);
    return formatted.replace(/\.?0+$/, "");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          className="text-2xl font-bold bg-clip-text text-transparent 
                       bg-gradient-to-r from-gaming-primary to-gaming-accent"
        >
          Balance Info
        </h2>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-secondary-400 hover:text-white transition-colors"
        >
          <svg
            className={`w-6 h-6 transform transition-transform duration-300
                          ${showDetails ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {balanceItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="balance-item"
          >
            <div
              className="flex items-center justify-between p-4 rounded-xl
                           bg-secondary-800/30 border border-secondary-700/30
                           hover:border-gaming-primary/30 transition-all duration-300"
            >
              <div className="flex items-center space-x-3">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-lg
                               bg-gaming-primary/10 text-gaming-primary
                               flex items-center justify-center"
                >
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm text-secondary-400">{item.label}</p>
                  <p className="font-medium text-white">
                    {formatValue(item.value)}{" "}
                    <span className="text-sm text-secondary-400">GAMA</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4">
              <div className="p-4 rounded-xl bg-secondary-800/30 border border-secondary-700/30">
                <h3 className="text-lg font-medium mb-3">Balance Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-400">
                      Available for Betting:
                    </span>
                    <span className="text-white">
                      {formatValue(
                        ethers.formatEther(
                          userBalance > allowance ? allowance : userBalance
                        )
                      )}{" "}
                      GAMA
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-400">Win Multiplier:</span>
                    <span className="text-gaming-success">6x</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-400">
                      Max Potential Win:
                    </span>
                    <span className="text-gaming-primary">
                      {formatValue(ethers.formatEther(userBalance * BigInt(6)))}{" "}
                      GAMA
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DiceVisualizer = ({ chosenNumber, isRolling, result }) => {
  const diceVariants = {
    rolling: {
      rotate: [0, 360, 720, 1080],
      transition: {
        duration: 1.5,
        ease: "easeInOut",
        times: [0, 0.2, 0.5, 1],
      },
    },
    static: {
      rotate: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const dotPositions = {
    1: [{ index: 4 }],
    2: [{ index: 0 }, { index: 8 }],
    3: [{ index: 0 }, { index: 4 }, { index: 8 }],
    4: [{ index: 0 }, { index: 2 }, { index: 6 }, { index: 8 }],
    5: [{ index: 0 }, { index: 2 }, { index: 4 }, { index: 6 }, { index: 8 }],
    6: [
      { index: 0 },
      { index: 2 },
      { index: 3 },
      { index: 5 },
      { index: 6 },
      { index: 8 },
    ],
  };

  const renderDots = (number) => {
    const validNumber = Math.max(1, Math.min(6, Number(number) || 1));
    const dots = dotPositions[validNumber] || [];

    return (
      <div className="relative w-full h-full grid grid-cols-3 grid-rows-3 gap-2 p-4">
        {Array(9)
          .fill(null)
          .map((_, index) => {
            const isActive = dots.some((dot) => dot.index === index);
            return (
              <div
                key={index}
                className={`flex items-center justify-center transition-all duration-300
                ${isActive ? "scale-100" : "scale-0"}`}
              >
                <div
                  className={`w-4 h-4 rounded-full 
                  ${
                    isActive
                      ? "bg-gradient-to-br from-white to-white/80 shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                      : "bg-transparent"
                  }`}
                />
              </div>
            );
          })}
      </div>
    );
  };

  const displayNumber = result || chosenNumber || 1;

  return (
    <div className="relative w-full max-w-[200px] mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={isRolling ? "rolling" : displayNumber}
          variants={diceVariants}
          animate={isRolling ? "rolling" : "static"}
          className="w-full aspect-square"
        >
          <div className="dice-container">
            <div className="dice-face">
              <div className="absolute inset-0 bg-gradient-to-br from-gaming-primary/30 to-gaming-accent/30 rounded-xl backdrop-blur-sm" />
              {renderDots(displayNumber)}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const NumberSelector = ({ value, onChange, disabled }) => {
  const numbers = [1, 2, 3, 4, 5, 6];

  const buttonVariants = {
    idle: { scale: 1 },
    hover: { scale: 1.05 },
    selected: { scale: 1.1 },
    disabled: { opacity: 0.5, scale: 1 },
  };

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-bold text-white/90">Choose Your Number</h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-6">
        {numbers.map((num) => (
          <motion.button
            key={num}
            variants={buttonVariants}
            initial="idle"
            whileHover={disabled ? "disabled" : "hover"}
            animate={
              value === num ? "selected" : disabled ? "disabled" : "idle"
            }
            onClick={() => !disabled && onChange(num)}
            disabled={disabled}
            className={`
              relative group p-4 rounded-xl
              ${
                value === num
                  ? "bg-gaming-primary shadow-neon"
                  : "bg-secondary-800/40 hover:bg-secondary-700/40"
              }
              backdrop-blur-sm border border-white/10
              transition-colors duration-300
            `}
          >
            {/* Number Display */}
            <div className="text-2xl font-bold text-center mb-2">{num}</div>

            {/* Probability Info */}
            <div className="text-xs text-center opacity-75">
              Win: {((1 / 6) * 100).toFixed(1)}%
            </div>

            {/* Selection Indicator */}
            {value === num && (
              <motion.div
                layoutId="selector"
                className="absolute inset-0 rounded-xl border-2 border-gaming-primary"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}

            {/* Hover Effect */}
            <div
              className="absolute inset-0 rounded-xl bg-gaming-primary/10 
              opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
          </motion.button>
        ))}
      </div>

      {/* Selected Number Display */}
      {value && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-gaming-primary"
        >
          Selected Number: {value}
        </motion.div>
      )}
    </div>
  );
};

const LoadingSpinner = ({ size = "medium", light = false }) => {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12",
  }[size];

  return (
    <div
      className={`inline-block ${sizeClasses} animate-spin rounded-full border-2 
      border-current border-t-transparent text-gaming-primary`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

const FilterButton = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
      active
        ? "bg-gaming-primary text-white"
        : "bg-gaming-primary/20 text-gaming-primary hover:bg-gaming-primary/30"
    }`}
  >
    {children}
  </button>
);

const GameHistoryLoader = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="h-24 bg-secondary-800/50 rounded-xl" />
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="text-center py-8">
    <div className="inline-block p-3 rounded-full bg-secondary-800/50 mb-4">
      <svg
        className="w-6 h-6 text-secondary-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </div>
    <p className="text-secondary-400">No games found</p>
  </div>
);

const GameHistoryItem = ({ game, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ delay: index * 0.05 }}
    className={`
      relative p-4 rounded-xl border backdrop-blur-sm
      ${
        game.isWin
          ? "border-gaming-success/20 bg-gaming-success/5"
          : "border-gaming-error/20 bg-gaming-error/5"
      }
      hover:transform hover:scale-[1.02] transition-all duration-300
    `}
  >
    <div className="flex justify-between items-center">
      <div className="space-y-1">
        <div className="text-lg font-semibold">
          {ethers.formatEther(game.amount)} GAMA
        </div>
        <div className="text-sm text-secondary-400">
          <span
            className={game.isWin ? "text-gaming-success" : "text-gaming-error"}
          >
            {game.isWin ? "Won" : "Lost"}
          </span>
          <span className="mx-2">•</span>
          Rolled: {game.rolledNumber} | Chosen: {game.chosenNumber}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm text-secondary-400">
          {new Date(game.timestamp * 1000).toLocaleString()}
        </div>
        <div className="text-xs text-secondary-500 mt-1">
          {game.isWin
            ? `Won ${ethers.formatEther(game.payout)} GAMA`
            : "No Payout"}
        </div>
      </div>
    </div>
  </motion.div>
);

const DicePage = ({
  contracts,
  account,
  onError,
  addToast,
  setLoadingStates,
  setLoadingMessage,
}) => {
  const queryClient = useQueryClient();
  const [chosenNumber, setChosenNumber] = useState(null);
  const [betAmount, setBetAmount] = useState(BigInt(0));
  const [showStats, setShowStats] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [showLoseAnimation, setShowLoseAnimation] = useState(false);
  const [gameState, setGameState] = useState({
    isProcessing: false,
    isRolling: false,
    lastResult: null,
  });

  // Balance Query
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ["balance", account, contracts.token?.target],
    queryFn: async () => {
      if (!contracts.token || !account) return null;

      const [balance, tokenAllowance] = await Promise.all([
        contracts.token.balanceOf(account),
        contracts.token.allowance(account, contracts.dice.target),
      ]);

      return {
        balance,
        allowance: tokenAllowance,
      };
    },
    enabled: !!contracts.token && !!account,
    refetchInterval: 5000,
  });

  const handleContractError = (error, onError) => {
    if (error.code === "CALL_EXCEPTION") {
      const errorName = error.errorName;
      switch (errorName) {
        case "InvalidBetParameters":
          addToast("Invalid bet parameters", "error");
          break;
        case "InsufficientUserBalance":
          addToast("Insufficient balance", "error");
          break;
        case "GameError":
          addToast("Game error occurred", "error");
          break;
        case "PayoutCalculationError":
          addToast("Error calculating payout", "error");
          break;
        default:
          onError(error);
      }
    } else {
      onError(error);
    }
  };

  const checkAndApproveToken = async (amount) => {
    if (!contracts.token || !contracts.dice || !amount) {
      throw new Error("Missing required parameters for token approval");
    }

    try {
      setGameState((prev) => ({ ...prev, isProcessing: true }));

      const currentAllowance = await contracts.token.allowance(
        account,
        contracts.dice.target
      );

      if (currentAllowance < amount) {
        const maxApproval = ethers.MaxUint256;
        const tx = await contracts.token.approve(
          contracts.dice.target,
          maxApproval
        );
        const receipt = await tx.wait();

        if (!receipt.status) {
          throw new Error("Token approval transaction failed");
        }

        const newAllowance = await contracts.token.allowance(
          account,
          contracts.dice.target
        );

        if (newAllowance < amount) {
          throw new Error("Allowance not set correctly");
        }

        addToast("Token approval successful", "success");
        return true;
      }

      return true;
    } catch (error) {
      console.error("Token approval error:", error);
      throw error;
    } finally {
      setGameState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const handlePlaceBet = async () => {
    if (!contracts.dice || !account || !chosenNumber || betAmount <= BigInt(0))
      return;
    if (gameState.isProcessing) return;

    try {
      setGameState((prev) => ({
        ...prev,
        isProcessing: true,
        isRolling: true,
      }));

      // First check and handle token approval
      const currentAllowance = await contracts.token.allowance(
        account,
        contracts.dice.target
      );
      if (currentAllowance < betAmount) {
        const approveTx = await contracts.token.approve(
          contracts.dice.target,
          ethers.MaxUint256
        );
        await approveTx.wait();
        addToast("Token approval successful", "success");
      }

      // Place the bet
      const tx = await contracts.dice.playDice(chosenNumber, betAmount);
      const receipt = await tx.wait();

      // Get the result from the transaction events
      const event = receipt.logs
        .map((log) => {
          try {
            return contracts.dice.interface.parseLog({
              topics: log.topics,
              data: log.data,
            });
          } catch (e) {
            return null;
          }
        })
        .find((event) => event && event.name === "GameResult");

      if (event) {
        const [player, chosenNum, rolledNum, betAmt, payout] = event.args;
        const isWin = payout > 0;

        // Update game state with result
        setGameState((prev) => ({
          ...prev,
          lastResult: Number(rolledNum),
        }));

        // Show appropriate animation
        if (isWin) {
          setShowWinAnimation(true);
          addToast(
            `Congratulations! You won ${ethers.formatEther(payout)} GAMA!`,
            "success"
          );
        } else {
          setShowLoseAnimation(true);
          addToast("Better luck next time!", "warning");
        }
      }

      // Refresh balances and game state
      queryClient.invalidateQueries(["balance", account]);
    } catch (error) {
      console.error("Bet placement error:", error);
      handleContractError(error, onError);
    } finally {
      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        isRolling: false,
      }));
    }
  };

  // Add a check for zero balance
  const hasNoTokens = balanceData?.balance === BigInt(0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gradient-gaming mb-4">
            Dice Game
          </h1>
          <p className="text-secondary-400 text-lg">
            Choose a number, place your bet, and test your luck!
          </p>
        </div>

        {balanceLoading && (
          <div className="glass-panel p-4">
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="small" />
              <span className="text-secondary-400">Updating balance...</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="glass-panel p-8">
              <h2 className="text-2xl font-bold mb-8 text-white/90">
                Place Your Bet
              </h2>

              <div className="mb-8">
                <NumberSelector
                  value={chosenNumber}
                  onChange={setChosenNumber}
                  disabled={gameState.isProcessing}
                />
              </div>

              <div className="mb-8">
                <BetInput
                  value={betAmount}
                  onChange={setBetAmount}
                  userBalance={balanceData?.balance.toString() || "0"}
                  disabled={gameState.isProcessing || hasNoTokens}
                  diceContract={contracts.dice}
                />
                {hasNoTokens && (
                  <p className="text-red-500 mt-2 text-sm">
                    You don't have any tokens to play. Please acquire tokens
                    first.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {betAmount > BigInt(0) &&
                  balanceData?.allowance < betAmount && (
                    <button
                      onClick={() => checkAndApproveToken(betAmount)}
                      disabled={gameState.isProcessing}
                      className="btn-gaming h-14 w-full"
                    >
                      {gameState.isProcessing ? (
                        <span className="flex items-center justify-center">
                          <LoadingSpinner size="small" />
                          <span className="ml-2">Approving...</span>
                        </span>
                      ) : (
                        "Approve Tokens"
                      )}
                    </button>
                  )}

                <button
                  onClick={handlePlaceBet}
                  disabled={
                    !chosenNumber ||
                    betAmount <= BigInt(0) ||
                    (balanceData?.allowance || BigInt(0)) < betAmount ||
                    (balanceData?.balance || BigInt(0)) < betAmount ||
                    hasNoTokens ||
                    gameState.isProcessing ||
                    !account ||
                    !contracts.dice
                  }
                  className="btn-gaming h-14 w-full"
                >
                  {gameState.isProcessing ? (
                    <span className="flex items-center justify-center">
                      <LoadingSpinner size="small" />
                      <span className="ml-2">Rolling...</span>
                    </span>
                  ) : hasNoTokens ? (
                    "No Tokens Available"
                  ) : (
                    "Place Bet"
                  )}
                </button>
              </div>
            </div>

            <BalancePanel
              userBalance={balanceData?.balance || BigInt(0)}
              allowance={balanceData?.allowance || BigInt(0)}
              potentialWinnings={betAmount * BigInt(6)}
            />
          </div>

          <div className="space-y-8">
            <div className="glass-panel p-8 flex items-center justify-center min-h-[400px]">
              <DiceVisualizer
                chosenNumber={chosenNumber}
                isRolling={gameState.isRolling}
                result={gameState.lastResult}
              />
            </div>

            <div className="glass-panel p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white/90">Statistics</h2>
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="btn-gaming px-4 py-2 text-sm"
                >
                  {showStats ? "Hide Stats" : "Show Stats"}
                </button>
              </div>

              <AnimatePresence>
                {showStats && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <GameStats
                      diceContract={contracts.dice}
                      account={account}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <GameHistory
          diceContract={contracts.dice}
          account={account}
          onError={onError}
        />
      </div>

      <AnimatePresence>
        {showWinAnimation && (
          <WinAnimation onComplete={() => setShowWinAnimation(false)} />
        )}
        {showLoseAnimation && (
          <LoseAnimation onComplete={() => setShowLoseAnimation(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};
