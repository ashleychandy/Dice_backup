// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "lib/contractsv2/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "lib/contractsv2/src/v0.8/VRFConsumerBaseV2.sol";

/**
 * @title IERC20
 * @dev ERC20 interface with role-based functionality
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
 * @title Game State Structure
 * @dev Tracks current game status with storage-optimized data types
 */
struct GameState {
    bool isActive;
    bool completed;
    uint8 chosenNumber;
    uint8 result;
    uint256 amount;
    uint256 payout;
}

/**
 * @title Bet History Structure
 * @dev Records individual bet data with optimized storage
 */
struct BetHistory {
    uint8 chosenNumber;
    uint8 rolledNumber;
    uint32 timestamp;
    uint256 amount;
    uint256 payout;
}

/**
 * @title User Data Structure
 * @dev Maintains game state and bet history for each player
 */
struct UserData {
    GameState currentGame;
    uint256 currentRequestId;
    BetHistory[] recentBets;
    uint32 lastPlayedTimestamp;
    uint256 lastPlayedBlock;
    uint8 historyIndex;
    bool requestFulfilled;
}

/**
 * @title Dice
 * @dev Provably fair dice game using Chainlink VRF for randomness
 */
contract Dice is ReentrancyGuard, Pausable, VRFConsumerBaseV2, Ownable {
    // ============ Events ============
    event BetPlaced(address indexed player, uint256 requestId, uint8 chosenNumber, uint256 amount);
    event GameCompleted(address indexed player, uint256 requestId, uint8 result, uint256 payout);
    event GameRecovered(address indexed player, uint256 requestId, uint256 refundAmount);

    // ============ Custom Errors ============
    error InvalidBetParameters(string reason);
    error InsufficientUserBalance(uint256 required, uint256 available);
    error TransferFailed(address from, address to, uint256 amount);
    error BurnFailed(address account, uint256 amount);
    error MintFailed(address account, uint256 amount);
    error PayoutCalculationError(string message);
    error InsufficientAllowance(uint256 required, uint256 allowed);
    error MissingContractRole(bytes32 role);
    error GameError(string reason);
    error VRFError(string reason);
    error MaxPayoutExceeded(uint256 potentialPayout, uint256 maxAllowed);

    // ============ Constants ============
    uint8 private constant MAX_NUMBER = 6;
    uint8 public constant MAX_HISTORY_SIZE = 10;
    uint256 public constant DENOMINATOR = 10000;
    uint256 public constant MAX_BET_AMOUNT = 10_000_000 * 10**18;
    uint256 public constant MAX_POSSIBLE_PAYOUT = 60_000_000 * 10**18; // 10M * 6
    uint32 private constant GAME_TIMEOUT = 1 hours;
    uint256 private constant BLOCK_THRESHOLD = 300;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    // Special result values
    uint8 public constant RESULT_FORCE_STOPPED = 254;
    uint8 public constant RESULT_RECOVERED = 255;

    // ============ State Variables ============
    IERC20 public immutable gamaToken;
    mapping(address => UserData) private userData;
    
    // Game Statistics
    uint256 public totalGamesPlayed;
    uint256 public totalPayoutAmount;
    uint256 public totalWageredAmount;

    // VRF Variables
    VRFCoordinatorV2Interface private immutable COORDINATOR;
    uint64 private immutable s_subscriptionId;
    bytes32 private immutable s_keyHash;
    uint32 private immutable callbackGasLimit;
    uint16 private immutable requestConfirmations;
    uint8 private immutable numWords;

    // Request tracking
    struct RequestStatus {
        bool fulfilled;
        bool exists;
        uint256[] randomWords;
    }
    mapping(uint256 => RequestStatus) public s_requests;
    mapping(uint256 => address) private requestToPlayer;
    mapping(uint256 => bool) private activeRequestIds;

    // ============ Constructor ============
    /**
     * @notice Contract constructor
     * @param _gamaTokenAddress Address of the token contract
     * @param vrfCoordinator Address of the VRF coordinator
     * @param subscriptionId Chainlink VRF subscription ID
     * @param keyHash VRF key hash for the network
     * @param _callbackGasLimit Gas limit for VRF callback
     * @param _requestConfirmations Number of confirmations for VRF request
     * @param _numWords Number of random words to request
     */
    constructor(
        address _gamaTokenAddress,
        address vrfCoordinator,
        uint64 subscriptionId,
        bytes32 keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint8 _numWords
    ) VRFConsumerBaseV2(vrfCoordinator) Ownable(msg.sender) {
        require(_gamaTokenAddress != address(0), "Token address cannot be zero");
        require(vrfCoordinator != address(0), "VRF coordinator cannot be zero");
        require(_callbackGasLimit > 0, "Callback gas limit cannot be zero");
        require(_numWords > 0, "Number of words cannot be zero");
        
        gamaToken = IERC20(_gamaTokenAddress);
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
        s_keyHash = keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
    }

    // ============ External Functions ============
    /**
     * @notice Place a bet on a dice number
     * @param chosenNumber Number to bet on (1-6)
     * @param amount Token amount to bet
     * @return requestId VRF request ID
     */
    function playDice(uint8 chosenNumber, uint256 amount) external nonReentrant whenNotPaused returns (uint256 requestId) {
        // ===== CHECKS =====
        // 1. Basic input validation
        if (amount == 0) revert InvalidBetParameters("Bet amount cannot be zero");
        if (amount > MAX_BET_AMOUNT) revert InvalidBetParameters("Bet amount too large");
        if (chosenNumber < 1 || chosenNumber > MAX_NUMBER) revert InvalidBetParameters("Invalid chosen number");

        // 2. Check if user has an active game
        UserData storage user = userData[msg.sender];
        if (user.currentGame.isActive) revert GameError("User has an active game");
        if (user.currentRequestId != 0) revert GameError("User has a pending request");

        // 3. Balance, allowance, and role checks
        _checkBalancesAndAllowances(msg.sender, amount);

        // Calculate potential payout
        uint256 potentialPayout = amount * 6;
        if (potentialPayout / 6 != amount) revert PayoutCalculationError("Payout calculation overflow");
        if (potentialPayout > MAX_POSSIBLE_PAYOUT) {
            revert MaxPayoutExceeded(potentialPayout, MAX_POSSIBLE_PAYOUT);
        }

        // ===== EFFECTS =====
        // 4. Burn tokens first
        try gamaToken.burn(msg.sender, amount) {} catch {
            revert BurnFailed(msg.sender, amount);
        }

        // Update total wagered amount
        totalWageredAmount += amount;

        // 5. Request random number using VRF
        requestId = COORDINATOR.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );

        // 6. Record the request
        s_requests[requestId] = RequestStatus({
            randomWords: new uint256[](0),
            exists: true,
            fulfilled: false
        });
        
        // 7. Store request mapping
        requestToPlayer[requestId] = msg.sender;
        activeRequestIds[requestId] = true;
        
        // Update timestamp and block number
        user.lastPlayedTimestamp = uint32(block.timestamp);
        user.lastPlayedBlock = block.number;
        user.requestFulfilled = false;
        
        // 8. Update user's game state
        user.currentGame = GameState({
            isActive: true,
            completed: false,
            chosenNumber: chosenNumber,
            result: 0,
            amount: amount,
            payout: 0
        });
        
        user.currentRequestId = requestId;
        
        emit BetPlaced(msg.sender, requestId, chosenNumber, amount);
        
        return requestId;
    }

    /**
     * @notice VRF Coordinator callback function
     * @param requestId VRF request identifier
     * @param randomWords Random results from VRF
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override nonReentrant {
        // ===== CHECKS =====
        // 1. Validate VRF request
        RequestStatus storage request = s_requests[requestId];
        if (!request.exists) revert VRFError("Request not found");
        if (request.fulfilled) revert VRFError("Request already fulfilled");
        if (randomWords.length != numWords) revert VRFError("Invalid random words length");

        // 2. Validate player and game state
        address player = requestToPlayer[requestId];
        if (player == address(0)) revert VRFError("Invalid player address");
        
        UserData storage user = userData[player];
        if (user.currentRequestId != requestId) revert GameError("Request ID mismatch");
        
        // Mark request as fulfilled to prevent race conditions
        request.fulfilled = true;
        request.randomWords = randomWords;
        user.requestFulfilled = true;
        
        // Check if game is still active
        if (!user.currentGame.isActive) {
            // Game already recovered or force-stopped, clean up ALL request data
            delete s_requests[requestId];
            delete requestToPlayer[requestId];
            delete activeRequestIds[requestId];
            user.currentRequestId = 0;
            user.requestFulfilled = false;
            return;
        }

        // Cache important values
        uint8 chosenNumber = user.currentGame.chosenNumber;
        uint256 betAmount = user.currentGame.amount;
        
        // ===== EFFECTS =====
        // 1. Calculate result
        uint8 result = uint8(randomWords[0] % MAX_NUMBER + 1);
        
        // 2. Calculate payout
        uint256 payout = 0;
        if (chosenNumber == result) {
            // Ensure safe multiplication
            if (betAmount > type(uint256).max / 6) {
                revert PayoutCalculationError("Bet amount too large for payout calculation");
            }
            payout = betAmount * 6;
        }

        // 4. Update game state
        user.currentGame.result = result;
        user.currentGame.isActive = false;
        user.currentGame.completed = true;
        user.currentGame.payout = payout;

        // 5. Update game history
        _updateUserHistory(
            user,
            chosenNumber,
            result,
            betAmount,
            payout
        );

        // 6. Update global statistics
        totalGamesPlayed++;
        if (payout > 0) {
            totalPayoutAmount += payout;
        }

        // Cleanup
        delete requestToPlayer[requestId];
        delete activeRequestIds[requestId];
        user.currentRequestId = 0;

        // ===== INTERACTIONS =====
        // Process payout if player won
        if (payout > 0) {
            if (!gamaToken.hasRole(MINTER_ROLE, address(this))) {
                revert MissingContractRole(MINTER_ROLE);
            }
            
            try gamaToken.mint(player, payout) {} catch {
                revert MintFailed(player, payout);
            }
        }

        emit GameCompleted(player, requestId, result, payout);
    }

   
    /**
     * @notice Recover from a stuck game and receive refund
     */
    function recoverOwnStuckGame() external nonReentrant whenNotPaused {
        UserData storage user = userData[msg.sender];
        
        // ===== CHECKS =====
        // Check if user has an active bet
        if (!user.currentGame.isActive) revert GameError("No active game");
        
        uint256 requestId = user.currentRequestId;
        
        // Ensure there is a request to recover from
        if (requestId == 0) {
            revert GameError("No pending request to recover");
        }

        // Check for race condition with VRF callback first
        if (s_requests[requestId].fulfilled && 
            (block.number <= user.lastPlayedBlock + 10)) {
            revert GameError("Request just fulfilled, let VRF complete");
        }
        
        // Check if game is stale - with modified conditions
        bool hasBlockThresholdPassed = block.number > user.lastPlayedBlock + BLOCK_THRESHOLD;
        bool hasTimeoutPassed = block.timestamp > user.lastPlayedTimestamp + GAME_TIMEOUT;
        
        // Modified: Only require that the request exists, not that it's processed
        bool hasVrfRequest = requestId != 0 && s_requests[requestId].exists;
        
        // Check eligibility with modified conditions
        if (!hasBlockThresholdPassed || !hasTimeoutPassed || !hasVrfRequest) {
            revert GameError("Game not eligible for recovery yet");
        }

        // ===== EFFECTS =====
        // Calculate amount to refund
        uint256 refundAmount = user.currentGame.amount;
        
        if (refundAmount == 0) revert GameError("Nothing to refund");
        
        // Clean up request data
        delete s_requests[requestId];
        delete requestToPlayer[requestId];
        delete activeRequestIds[requestId];
        
        // Update game state
        user.currentGame.completed = true;
        user.currentGame.isActive = false;
        user.currentGame.result = RESULT_RECOVERED;
        user.currentGame.payout = refundAmount;
        
        user.currentRequestId = 0;
        user.requestFulfilled = false;

        // ===== INTERACTIONS =====
        // Refund player
        if (!gamaToken.hasRole(MINTER_ROLE, address(this))) {
            revert MissingContractRole(MINTER_ROLE);
        }
        
        try gamaToken.mint(msg.sender, refundAmount) {} catch {
            revert MintFailed(msg.sender, refundAmount);
        }

        // Add to bet history
        _updateUserHistory(
            user,
            user.currentGame.chosenNumber,
            RESULT_RECOVERED,
            refundAmount,
            refundAmount
        );

        emit GameRecovered(msg.sender, requestId, refundAmount);
    }

    /**
     * @notice Force stop a game and refund the player
     * @param player Player address
     */
    function forceStopGame(address player) external onlyOwner nonReentrant {
        UserData storage user = userData[player];
        
        // ===== CHECKS =====
        if (!user.currentGame.isActive) revert GameError("No active game");

        uint256 requestId = user.currentRequestId;

        // Check for race condition with VRF callback first
        if (requestId != 0 && s_requests[requestId].fulfilled && 
            (block.number <= user.lastPlayedBlock + 10)) {
            revert GameError("Request just fulfilled, let VRF complete");
        }

        // Check if game is stale - with modified conditions
        bool hasBlockThresholdPassed = block.number > user.lastPlayedBlock + BLOCK_THRESHOLD;
        bool hasTimeoutPassed = block.timestamp > user.lastPlayedTimestamp + GAME_TIMEOUT;
        
        // Modified: Only require that the request exists, not that it's processed
        bool hasVrfRequest = requestId != 0 && s_requests[requestId].exists;
        
        // Check eligibility with modified conditions
        if (!hasBlockThresholdPassed || !hasTimeoutPassed || !hasVrfRequest) {
            revert GameError("Game not eligible for force stop yet");
        }

        uint256 refundAmount = user.currentGame.amount;
        
        if (refundAmount == 0) revert GameError("Nothing to refund");

        // ===== EFFECTS =====
        // Clean up request data
        if (requestId != 0) {
            delete requestToPlayer[requestId];
            delete activeRequestIds[requestId];
            delete s_requests[requestId];
        }

        // Mark game as completed
        user.currentGame.completed = true;
        user.currentGame.isActive = false;
        user.currentGame.result = RESULT_FORCE_STOPPED;
        user.currentGame.payout = refundAmount;
        user.currentRequestId = 0;
        user.requestFulfilled = false;

        // ===== INTERACTIONS =====
        // Refund player
        if (!gamaToken.hasRole(MINTER_ROLE, address(this))) {
            revert MissingContractRole(MINTER_ROLE);
        }
        
        try gamaToken.mint(player, refundAmount) {} catch {
            revert MintFailed(player, refundAmount);
        }
      
        // Add to bet history
        _updateUserHistory(
            user,
            user.currentGame.chosenNumber,
            RESULT_FORCE_STOPPED,
            refundAmount,
            refundAmount
        );

        emit GameRecovered(player, requestId, refundAmount);
    }

    /**
     * @notice Pause contract operations
     */
    function pause() external onlyOwner nonReentrant {
        _pause();
    }

    /**
     * @notice Resume contract operations
     */
    function unpause() external onlyOwner nonReentrant {
        _unpause();
    }

    /**
     * @notice Get player's game data
     * @param player Player address
     * @return gameState Current game state
     * @return lastPlayed Last played timestamp
     */
    function getUserData(address player) external view returns (
        GameState memory gameState,
        uint256 lastPlayed
    ) {
        if (player == address(0)) revert InvalidBetParameters("Invalid player address");
        UserData storage user = userData[player];
        return (
            user.currentGame,
            user.lastPlayedTimestamp
        );
    }

    /*
     * @notice Get player's bet history
     * @param player Player address
     * @return Array of past bets (newest to oldest)
     */
    function getBetHistory(address player) external view returns (BetHistory[] memory) {
        if (player == address(0)) revert InvalidBetParameters("Invalid player address");
        
        UserData storage user = userData[player];
        uint256 length = user.recentBets.length;
        
        if (length == 0) return new BetHistory[](0);
        
        // Create array with exact size needed
        uint256 resultLength = length > MAX_HISTORY_SIZE ? MAX_HISTORY_SIZE : length;
        BetHistory[] memory orderedBets = new BetHistory[](resultLength);
        
        // If array is not full yet
        if (length < MAX_HISTORY_SIZE) {
            // Copy in reverse order so newest is first
            for (uint256 i = 0; i < length; i++) {
                orderedBets[i] = user.recentBets[length - 1 - i];
            }
        } else {
            // Handle circular buffer ordering
            uint256 newestIndex = user.historyIndex == 0 ? MAX_HISTORY_SIZE - 1 : user.historyIndex - 1;
            
            for (uint256 i = 0; i < MAX_HISTORY_SIZE; i++) {
                orderedBets[i] = user.recentBets[(newestIndex + MAX_HISTORY_SIZE - i) % MAX_HISTORY_SIZE];
            }
        }
        
        return orderedBets;
    }

    /**
     * @notice Get player for a specific VRF request
     * @param requestId VRF request ID
     * @return Player address
     */
    function getPlayerForRequest(uint256 requestId) external view returns (address) {
        return requestToPlayer[requestId];
    }

    /**
     * @notice Check if player has pending game
     * @param player Player address
     * @return Status of pending request
     */
    function hasPendingRequest(address player) external view returns (bool) {
        UserData storage user = userData[player];
        return user.currentGame.isActive && user.currentRequestId != 0;
    }

    /**
     * @notice Check if player can start new game
     * @param player Player address
     * @return Eligibility status
     */
    function canStartNewGame(address player) external view returns (bool) {
        UserData storage user = userData[player];
        return !user.currentGame.isActive && user.currentRequestId == 0;
    }

    /*
     * @notice Get detailed game status information
     * @param player Player address
     * @return Comprehensive game state and request information
     */
    function getGameStatus(address player) external view returns (
        bool isActive,
        bool isWin,
        bool isCompleted,
        uint8 chosenNumber,
        uint256 amount,
        uint8 result,
        uint256 payout,
        uint256 requestId,
        bool requestExists,
        bool requestProcessed,
        bool recoveryEligible,
        uint256 lastPlayTimestamp
    ) {
        if (player == address(0)) revert InvalidBetParameters("Invalid player address");
        
        UserData storage user = userData[player];
        
        isActive = user.currentGame.isActive;
        isCompleted = user.currentGame.completed;
        chosenNumber = user.currentGame.chosenNumber;
        amount = user.currentGame.amount;
        result = user.currentGame.result;
        payout = user.currentGame.payout;
        requestId = user.currentRequestId;
        lastPlayTimestamp = user.lastPlayedTimestamp;
        
        // Natural win if payout > 0 and result is 1-6
        isWin = payout > 0 && result > 0 && result <= MAX_NUMBER;
        
        requestExists = false;
        requestProcessed = false;
        
        // Check request status if ID is valid
        if (requestId != 0) {
            RequestStatus storage request = s_requests[requestId];
            requestExists = request.exists;
            requestProcessed = request.fulfilled;
        }
        
        // Determine recovery eligibility
        recoveryEligible = false;
        if (isActive) {
            // Modified conditions for recovery eligibility
            bool hasBlockThresholdPassed = block.number > user.lastPlayedBlock + BLOCK_THRESHOLD;
            bool hasTimeoutPassed = block.timestamp > user.lastPlayedTimestamp + GAME_TIMEOUT;
            
            // Modified: Only require that the request exists, not that it's processed
            bool hasVrfRequest = requestId != 0 && requestExists;
            
            // User is eligible if time/block thresholds are met AND a request exists
            recoveryEligible = hasBlockThresholdPassed && hasTimeoutPassed && hasVrfRequest;
        }
    }

    // ============ Private Functions ============
    /**
     * @dev Verify token balances and allowances
     * @param player Player address
     * @param amount Amount to verify
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
     * @dev Add bet to player's history using circular buffer
     * @param user User data reference
     * @param chosenNumber Player's selected number
     * @param result Roll result
     * @param amount Bet amount
     * @param payout Win amount
     */
    function _updateUserHistory(
        UserData storage user,
        uint8 chosenNumber,
        uint8 result,
        uint256 amount,
        uint256 payout
    ) private {
        BetHistory memory newBet = BetHistory({
            chosenNumber: chosenNumber,
            rolledNumber: result,
            amount: amount,
            timestamp: uint32(block.timestamp),
            payout: payout
        });

        if (user.recentBets.length < MAX_HISTORY_SIZE) {
            // Array not full, add to end
            user.recentBets.push(newBet);
            user.historyIndex = uint8(user.recentBets.length % MAX_HISTORY_SIZE);
        } else {
            // Array full, overwrite oldest entry
            user.recentBets[user.historyIndex] = newBet;
            user.historyIndex = (user.historyIndex + 1) % MAX_HISTORY_SIZE;
        }
    }
}
