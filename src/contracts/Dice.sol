// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IERC20
 * @dev Interface for ERC20 token with additional role-based functions
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address callerConfirmation) external;
    function mint(address account, uint256 amount) external;
    function burn(address account, uint256 amount) external;
}

/**
 * @title Dice Game Structs
 * @dev Data structures used in the Dice game
 */
struct BetHistory {
    uint256 chosenNumber;    // Number player bet on
    uint256 rolledNumber;    // Number that was rolled
    uint256 amount;          // Amount that was bet
    uint256 timestamp;       // When the bet was made
    uint256 payout;          // Amount won (0 if lost)
}

struct UserData {
    BetHistory[] recentBets;     // Recent bets history
    uint256 maxHistorySize;      // Maximum size of history to keep
    uint256 totalWinnings;       // Total amount won by user
    uint256 gamesPlayed;         // Number of games played
}

/**
 * @title Dice
 * @dev A dice game contract where players can bet on numbers 1-6
 */
contract Dice is ReentrancyGuard {
    // ============ Custom Errors ============
    error InvalidBetParameters(string reason);
    error InsufficientUserBalance(uint256 required, uint256 available);
    error TransferFailed(string reason);
    error PayoutCalculationError(string message);
    error InsufficientAllowance(uint256 required, uint256 allowed);
    error MissingContractRole(bytes32 role);

    // ============ Constants ============
    uint256 private constant MAX_NUMBER = 6;
    uint256 public constant MAX_HISTORY_SIZE = 10;
    uint256 public constant MAX_BET_AMOUNT = 10_000_000 * 10**18;     // 10M tokens per bet
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // ============ State Variables ============
    IERC20 public immutable gamaToken;
    mapping(address => UserData) private userData;
    
    // Game Statistics
    uint256 public totalGamesPlayed;
    uint256 public totalPayoutAmount;
    uint256 public totalWageredAmount;

    // ============ Constructor ============
    constructor(address _gamaTokenAddress) {
        if (_gamaTokenAddress == address(0)) revert InvalidBetParameters("Token address cannot be zero");
        gamaToken = IERC20(_gamaTokenAddress);
    }

    // ============ External Functions ============
    /**
     * @notice Play a game of dice
     * @param chosenNumber The number player is betting on (1-6)
     * @param amount The amount of tokens to bet
     * @return result The rolled number
     * @return payout The amount won (0 if lost)
     */
    function playDice(uint256 chosenNumber, uint256 amount) external nonReentrant returns (uint256 result, uint256 payout) {
        // 1. Basic input validation
        if (amount == 0) revert InvalidBetParameters("Bet amount cannot be zero");
        if (amount > MAX_BET_AMOUNT) revert InvalidBetParameters("Bet amount too large");
        if (chosenNumber < 1 || chosenNumber > MAX_NUMBER) revert InvalidBetParameters("Invalid chosen number");

        // 2. Balance, allowance, and role checks
        _checkBalancesAndAllowances(msg.sender, amount);

        // 3. Generate random number (before state changes to ensure it can't fail after burning tokens)
        result = _generateRandomNumber();
        payout = 0;

        // 4. Calculate potential payout if winning
        if (chosenNumber == result) {
            if (amount > type(uint256).max / 6) {
                revert PayoutCalculationError("Bet amount too large for payout calculation");
            }
            payout = amount * 6;
        }

        // 5. State changes begin here - burn tokens first
        try gamaToken.burn(msg.sender, amount) {} catch {
            revert TransferFailed("Token burn failed");
        }

        // 6. Update contract state
        totalWageredAmount += amount;

        // 7. Process payout if won
        if (payout > 0) {
            try gamaToken.mint(msg.sender, payout) {} catch {
                revert TransferFailed("Token mint failed");
            }
        }

        // 8. Update user stats and history
        UserData storage user = userData[msg.sender];
        _updateUserHistory(user, chosenNumber, result, amount, payout);
        _updateGameStats(user, payout);

        return (result, payout);
    }

    /**
     * @notice Get user's game data
     * @param player Address of the player
     * @return totalGames Total games played
     * @return totalWinnings Total amount won
     * @return lastPlayed Last played timestamp
     */
    function getUserData(address player) external view returns (
        uint256 totalGames,
        uint256 totalWinnings,
        uint256 lastPlayed
    ) {
        if (player == address(0)) revert InvalidBetParameters("Invalid player address");
        UserData storage user = userData[player];
        uint256 lastPlayedTime = user.recentBets.length > 0 ? 
            user.recentBets[user.recentBets.length - 1].timestamp : 0;
        return (
            user.gamesPlayed,
            user.totalWinnings,
            lastPlayedTime
        );
    }

    /**
     * @notice Get user's bet history
     * @param player Address of the player
     */
    function getBetHistory(address player) external view returns (BetHistory[] memory) {
        if (player == address(0)) revert InvalidBetParameters("Invalid player address");
        return userData[player].recentBets;
    }

    // ============ Private Functions ============
    /**
     * @dev Check if player has sufficient balance and allowance
     */
    function _checkBalancesAndAllowances(address player, uint256 amount) private view {
        if (gamaToken.balanceOf(player) < amount) {
            revert InsufficientUserBalance(amount, gamaToken.balanceOf(player));
        }

        if (gamaToken.allowance(player, address(this)) < amount) {
            revert InsufficientAllowance(amount, gamaToken.allowance(player, address(this)));
        }

        if (!gamaToken.hasRole(BURNER_ROLE, address(this))) {
            revert MissingContractRole(BURNER_ROLE);
        }

        if (!gamaToken.hasRole(MINTER_ROLE, address(this))) {
            revert MissingContractRole(MINTER_ROLE);
        }
    }

    /**
     * @dev Generate a pseudo-random number between 1 and 6
     */
    function _generateRandomNumber() private view returns (uint8) {
        return uint8((uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            totalGamesPlayed
        ))) % MAX_NUMBER) + 1);
    }

    /**
     * @dev Update user's bet history
     */
    function _updateUserHistory(
        UserData storage user,
        uint256 chosenNumber,
        uint256 result,
        uint256 amount,
        uint256 payout
    ) private {
        if (user.maxHistorySize == 0) {
            user.maxHistorySize = MAX_HISTORY_SIZE;
        }
        
        BetHistory memory newBet = BetHistory({
            chosenNumber: chosenNumber,
            rolledNumber: result,
            amount: amount,
            timestamp: block.timestamp,
            payout: payout
        });

        if (user.recentBets.length >= user.maxHistorySize) {
            // Shift elements to make room for new bet
            for (uint256 i = 0; i < user.recentBets.length - 1; i++) {
                user.recentBets[i] = user.recentBets[i + 1];
            }
            // Update the last element
            user.recentBets[user.recentBets.length - 1] = newBet;
        } else {
            // Add new bet to history
            user.recentBets.push(newBet);
        }
    }

    /**
     * @dev Update game statistics
     */
    function _updateGameStats(
        UserData storage user,
        uint256 payout
    ) private {
        if (payout > 0) {
            user.totalWinnings += payout;
        }
        user.gamesPlayed++;
        totalGamesPlayed++;
        totalPayoutAmount += payout;
    }
}
