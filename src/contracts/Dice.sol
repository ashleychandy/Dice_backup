// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "lib/contractsv2/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "lib/contractsv2/src/v0.8/VRFConsumerBaseV2.sol";

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function mint(address account, uint256 amount) external;
    function burn(uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
    function getRemainingMintable() external view returns (uint256);
}

struct GameState {
    bool isActive;
    bool completed;
    uint8 chosenNumber;
    uint8 result;
    uint256 amount;
    uint256 payout;
}

struct BetHistory {
    uint8 chosenNumber;
    uint8 rolledNumber;
    uint32 timestamp;
    uint256 amount;
    uint256 payout;
}

struct UserData {
    GameState currentGame;
    uint256 currentRequestId;
    BetHistory[] recentBets;
    uint32 lastPlayedTimestamp;
    uint256 lastPlayedBlock;
    uint8 historyIndex;
    bool requestFulfilled;
    bool pendingResolution;
    uint256 pendingRandomWord;
}

/**
 * @title Dice
 * @dev Provably fair dice game using Chainlink VRF.
 *
 * Two-phase resolution:
 *   1. playDice()           — burns tokens, requests VRF
 *   2. fulfillRandomWords() — stores random word, sets pendingResolution
 *   3. resolveGame()        — computes result, mints payout, updates history
 *
 * fulfillRandomWords is minimal to stay within VRF callback gas limits.
 * resolveGame may be called by the player, a keeper, or any address.
 */
contract Dice is ReentrancyGuard, Pausable, VRFConsumerBaseV2, Ownable {

    // ── Events ──────────────────────────────────────────────────────────────
    event BetPlaced(address indexed player, uint256 requestId, uint8 chosenNumber, uint256 amount);
    event GameCompleted(address indexed player, uint256 requestId, uint8 result, uint256 payout);
    event GameRecovered(address indexed player, uint256 requestId, uint256 refundAmount);
    event VRFSubscriptionIdUpdated(uint64 oldId, uint64 newId);
    event VRFKeyHashUpdated(bytes32 oldKeyHash, bytes32 newKeyHash);
    event VRFCallbackGasLimitUpdated(uint32 oldLimit, uint32 newLimit);
    event VRFRequestConfirmationsUpdated(uint16 oldConfirmations, uint16 newConfirmations);
    event VRFNumWordsUpdated(uint8 oldNumWords, uint8 newNumWords);

    // ── Errors ───────────────────────────────────────────────────────────────
    error InvalidBetParameters(string reason);
    error InsufficientUserBalance(uint256 required, uint256 available);
    error TransferFailed(address from, address to, uint256 amount);
    error BurnFailed(address account, uint256 amount);
    error MintFailed(address account, uint256 amount);
    error PayoutCalculationError(string message);
    error InsufficientAllowance(uint256 required, uint256 allowed);
    error GameError(string reason);
    error VRFError(string reason);
    error MaxPayoutExceeded(uint256 potentialPayout, uint256 maxAllowed);

    // ── Constants ────────────────────────────────────────────────────────────
    uint8 private constant MAX_NUMBER = 6;
    uint8 public constant MAX_HISTORY_SIZE = 10;
    uint256 public constant MAX_BET_AMOUNT = 10_000_000 * 10**18;
    uint256 public constant MAX_POSSIBLE_PAYOUT = 60_000_000 * 10**18; // 10M * 6
    uint32 private constant GAME_TIMEOUT = 1 hours;
    uint256 private constant BLOCK_THRESHOLD = 300;
    uint8 public constant RESULT_FORCE_STOPPED = 254;
    uint8 public constant RESULT_RECOVERED = 255;

    // ── State ────────────────────────────────────────────────────────────────
    IERC20 public immutable gamaToken;
    mapping(address => UserData) private userData;

    // Active player tracking for keeper pagination
    address[] public activePlayers;
    mapping(address => uint256) public activePlayerIndex; // 1-based
    mapping(address => bool) public isActivePlayer;

    uint256 public totalGamesPlayed;
    uint256 public totalPayoutAmount;
    uint256 public totalWageredAmount;

    // VRF — coordinator address is set once in constructor and never changed
    VRFCoordinatorV2Interface private COORDINATOR;
    uint64 private s_subscriptionId;
    bytes32 private s_keyHash;
    uint32 private callbackGasLimit;
    uint16 private requestConfirmations;
    uint8 private numWords;

    struct RequestStatus {
        bool fulfilled;
        bool exists;
        uint256[] randomWords;
    }
    mapping(uint256 => RequestStatus) public s_requests;
    mapping(uint256 => address) private requestToPlayer;
    mapping(uint256 => bool) private activeRequestIds;

    // ── Constructor ──────────────────────────────────────────────────────────
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

    // ── VRF Admin Setters ────────────────────────────────────────────────────

    function setVrfSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        emit VRFSubscriptionIdUpdated(s_subscriptionId, _subscriptionId);
        s_subscriptionId = _subscriptionId;
    }

    function setVrfKeyHash(bytes32 _keyHash) external onlyOwner {
        emit VRFKeyHashUpdated(s_keyHash, _keyHash);
        s_keyHash = _keyHash;
    }

    function setVrfCallbackGasLimit(uint32 _callbackGasLimit) external onlyOwner {
        require(_callbackGasLimit > 0, "Callback gas limit must be > 0");
        emit VRFCallbackGasLimitUpdated(callbackGasLimit, _callbackGasLimit);
        callbackGasLimit = _callbackGasLimit;
    }

    function setVrfRequestConfirmations(uint16 _requestConfirmations) external onlyOwner {
        require(_requestConfirmations > 0, "Request confirmations must be > 0");
        emit VRFRequestConfirmationsUpdated(requestConfirmations, _requestConfirmations);
        requestConfirmations = _requestConfirmations;
    }

    function setVrfNumWords(uint8 _numWords) external onlyOwner {
        require(_numWords > 0, "numWords must be > 0");
        emit VRFNumWordsUpdated(numWords, _numWords);
        numWords = _numWords;
    }

    function getVrfConfig()
        external
        view
        returns (
            address coordinator,
            uint64 subscriptionId,
            bytes32 keyHash,
            uint32 gasLimit,
            uint16 confirmations,
            uint8 words
        )
    {
        coordinator = address(COORDINATOR);
        subscriptionId = s_subscriptionId;
        keyHash = s_keyHash;
        gasLimit = callbackGasLimit;
        confirmations = requestConfirmations;
        words = numWords;
    }

    // ── External Functions ───────────────────────────────────────────────────

    /// @notice Place a bet on a dice number. Burns tokens and requests VRF randomness.
    /// @param chosenNumber Number to bet on (1–6)
    /// @param amount       Token amount to wager
    function playDice(
        uint8 chosenNumber,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (uint256 requestId) {

        if (amount == 0) revert InvalidBetParameters("Bet amount cannot be zero");
        if (amount > MAX_BET_AMOUNT) revert InvalidBetParameters("Bet amount too large");
        if (chosenNumber < 1 || chosenNumber > MAX_NUMBER)
            revert InvalidBetParameters("Invalid chosen number must be 1 to 6");

        UserData storage user = userData[msg.sender];
        if (user.currentGame.isActive) revert GameError("User has an active game");
        if (user.currentRequestId != 0) revert GameError("User has a pending request");
        if (user.pendingResolution) revert GameError("Previous game awaiting resolveGame()");

        _checkBalancesAndAllowances(msg.sender, amount);

        uint256 potentialPayout = amount * 6;
        if (potentialPayout / 6 != amount) revert PayoutCalculationError("Payout calculation overflow");
        if (potentialPayout > MAX_POSSIBLE_PAYOUT)
            revert MaxPayoutExceeded(potentialPayout, MAX_POSSIBLE_PAYOUT);

        uint256 remainingMintable = gamaToken.getRemainingMintable();
        if (potentialPayout > remainingMintable)
            revert MaxPayoutExceeded(potentialPayout, remainingMintable);

        gamaToken.burnFrom(msg.sender, amount);
        totalWageredAmount += amount;

        requestId = COORDINATOR.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );

        s_requests[requestId] = RequestStatus({
            randomWords: new uint256[](0),
            exists: true,
            fulfilled: false
        });

        requestToPlayer[requestId] = msg.sender;
        activeRequestIds[requestId] = true;

        user.lastPlayedTimestamp = uint32(block.timestamp);
        user.lastPlayedBlock = block.number;
        user.requestFulfilled = false;
        user.pendingResolution = false;
        user.pendingRandomWord = 0;

        user.currentGame = GameState({
            isActive: true,
            completed: false,
            chosenNumber: chosenNumber,
            result: 0,
            amount: amount,
            payout: 0
        });

        user.currentRequestId = requestId;

        if (!isActivePlayer[msg.sender]) {
            activePlayers.push(msg.sender);
            activePlayerIndex[msg.sender] = activePlayers.length; // 1-based
            isActivePlayer[msg.sender] = true;
        }

        emit BetPlaced(msg.sender, requestId, chosenNumber, amount);
        return requestId;
    }

    /// @notice VRF callback. Stores the random word and flags pendingResolution.
    ///         Deliberately minimal — all game logic is deferred to resolveGame().
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override nonReentrant {

        RequestStatus storage request = s_requests[requestId];
        if (!request.exists) revert VRFError("Request not found");
        if (request.fulfilled) revert VRFError("Request already fulfilled");
        if (randomWords.length != numWords) revert VRFError("Invalid random words length");

        address player = requestToPlayer[requestId];
        if (player == address(0)) revert VRFError("Invalid player address");

        UserData storage user = userData[player];
        if (user.currentRequestId != requestId) revert GameError("Request ID mismatch");

        request.fulfilled = true;
        request.randomWords = randomWords;
        user.requestFulfilled = true;

        // Game was stopped while waiting for VRF — clean up and exit
        if (!user.currentGame.isActive) {
            delete s_requests[requestId];
            delete requestToPlayer[requestId];
            delete activeRequestIds[requestId];
            user.currentRequestId = 0;
            user.requestFulfilled = false;
            return;
        }

        user.pendingRandomWord = randomWords[0];
        user.pendingResolution = true;
    }

    /// @notice Finalise a game after VRF has responded.
    ///         Computes result, mints payout, and updates history.
    ///         Callable by the player, a keeper, or any address.
    /// @param player Address of the player to resolve
    function resolveGame(address player) external nonReentrant whenNotPaused {
        if (player == address(0)) revert InvalidBetParameters("Invalid player address");

        UserData storage user = userData[player];

        if (!user.pendingResolution) revert GameError("No result pending for this player");
        if (!user.currentGame.isActive) revert GameError("Game is not active");

        uint256 requestId  = user.currentRequestId;
        uint256 randomWord = user.pendingRandomWord;
        uint8 chosenNumber = user.currentGame.chosenNumber;
        uint256 betAmount  = user.currentGame.amount;

        uint8 result = uint8((randomWord % MAX_NUMBER) + 1);

        uint256 payout = 0;
        if (chosenNumber == result) {
            if (betAmount > type(uint256).max / 6)
                revert PayoutCalculationError("Bet amount too large for payout calculation");
            payout = betAmount * 6;
        }

        user.currentGame.result    = result;
        user.currentGame.isActive  = false;
        user.currentGame.completed = true;
        user.currentGame.payout    = payout;

        _updateUserHistory(user, chosenNumber, result, betAmount, payout);

        if (payout > 0) totalPayoutAmount += payout;
        unchecked { ++totalGamesPlayed; }

        user.pendingResolution  = false;
        user.pendingRandomWord  = 0;
        user.currentRequestId   = 0;
        user.requestFulfilled   = false;

        delete s_requests[requestId];
        delete requestToPlayer[requestId];
        delete activeRequestIds[requestId];
        _removeActivePlayer(player);

        if (payout > 0) {
            gamaToken.mint(player, payout);
        }

        emit GameCompleted(player, requestId, result, payout);
    }

    /// @notice Recover from a stuck game if VRF never responded.
    ///         Requires both BLOCK_THRESHOLD blocks and GAME_TIMEOUT to have elapsed.
    function recoverOwnStuckGame() external nonReentrant whenNotPaused {
        UserData storage user = userData[msg.sender];

        if (!user.currentGame.isActive) revert GameError("No active game");

        uint256 requestId = user.currentRequestId;
        if (requestId == 0) revert GameError("No pending request to recover");

        if (s_requests[requestId].fulfilled &&
            (block.number <= user.lastPlayedBlock + 10)) {
            revert GameError("Request just fulfilled, let VRF complete");
        }

        if (user.pendingResolution)
            revert GameError("VRF responded - call resolveGame() instead");

        bool hasBlockThresholdPassed = block.number > user.lastPlayedBlock + BLOCK_THRESHOLD;
        bool hasTimeoutPassed        = block.timestamp > user.lastPlayedTimestamp + GAME_TIMEOUT;
        bool hasVrfRequest           = requestId != 0 && s_requests[requestId].exists;

        if (!hasBlockThresholdPassed || !hasTimeoutPassed || !hasVrfRequest)
            revert GameError("Game not eligible for recovery yet");

        uint256 refundAmount = user.currentGame.amount;
        if (refundAmount == 0) revert GameError("Nothing to refund");

        delete s_requests[requestId];
        delete requestToPlayer[requestId];
        delete activeRequestIds[requestId];

        user.currentGame.completed = true;
        user.currentGame.isActive  = false;
        user.currentGame.result    = RESULT_RECOVERED;
        user.currentGame.payout    = refundAmount;
        _removeActivePlayer(msg.sender);

        user.currentRequestId  = 0;
        user.requestFulfilled  = false;
        user.pendingResolution = false;
        user.pendingRandomWord = 0;

        gamaToken.mint(msg.sender, refundAmount);

        _updateUserHistory(
            user,
            user.currentGame.chosenNumber,
            RESULT_RECOVERED,
            refundAmount,
            refundAmount
        );

        emit GameRecovered(msg.sender, requestId, refundAmount);
    }

    /// @notice Owner: force-stop a stuck game and refund the player.
    function forceStopGame(address player) external onlyOwner nonReentrant {
        UserData storage user = userData[player];

        if (!user.currentGame.isActive) revert GameError("No active game");

        uint256 requestId = user.currentRequestId;

        if (requestId != 0 && s_requests[requestId].fulfilled &&
            (block.number <= user.lastPlayedBlock + 10)) {
            revert GameError("Request just fulfilled, let VRF complete");
        }

        if (user.pendingResolution)
            revert GameError("VRF responded - call resolveGame() instead");

        bool hasBlockThresholdPassed = block.number > user.lastPlayedBlock + BLOCK_THRESHOLD;
        bool hasTimeoutPassed        = block.timestamp > user.lastPlayedTimestamp + GAME_TIMEOUT;
        bool hasVrfRequest           = requestId != 0 && s_requests[requestId].exists;

        if (!hasBlockThresholdPassed || !hasTimeoutPassed || !hasVrfRequest)
            revert GameError("Game not eligible for force stop yet");

        uint256 refundAmount = user.currentGame.amount;
        if (refundAmount == 0) revert GameError("Nothing to refund");

        if (requestId != 0) {
            delete requestToPlayer[requestId];
            delete activeRequestIds[requestId];
            delete s_requests[requestId];
        }

        user.currentGame.completed = true;
        user.currentGame.isActive  = false;
        user.currentGame.result    = RESULT_FORCE_STOPPED;
        user.currentGame.payout    = refundAmount;
        _removeActivePlayer(player);

        user.currentRequestId  = 0;
        user.requestFulfilled  = false;
        user.pendingResolution = false;
        user.pendingRandomWord = 0;

        gamaToken.mint(player, refundAmount);

        _updateUserHistory(
            user,
            user.currentGame.chosenNumber,
            RESULT_FORCE_STOPPED,
            refundAmount,
            refundAmount
        );

        emit GameRecovered(player, requestId, refundAmount);
    }

    function pause() external onlyOwner nonReentrant { _pause(); }
    function unpause() external onlyOwner nonReentrant { _unpause(); }

    // ── View Functions ───────────────────────────────────────────────────────

    function getUserData(address player) external view returns (
        GameState memory gameState,
        uint256 lastPlayed
    ) {
        if (player == address(0)) revert InvalidBetParameters("Invalid player address");
        UserData storage user = userData[player];
        return (user.currentGame, user.lastPlayedTimestamp);
    }

    /// @notice Returns bet history newest-first, up to MAX_HISTORY_SIZE entries.
    function getBetHistory(address player) external view returns (BetHistory[] memory) {
        if (player == address(0)) revert InvalidBetParameters("Invalid player address");

        UserData storage user = userData[player];
        uint256 length = user.recentBets.length;

        if (length == 0) return new BetHistory[](0);

        uint256 resultLength = length > MAX_HISTORY_SIZE ? MAX_HISTORY_SIZE : length;
        BetHistory[] memory orderedBets = new BetHistory[](resultLength);

        if (length < MAX_HISTORY_SIZE) {
            for (uint256 i = 0; i < length; i++) {
                orderedBets[i] = user.recentBets[length - 1 - i];
            }
        } else {
            uint256 newestIndex = user.historyIndex == 0
                ? MAX_HISTORY_SIZE - 1
                : user.historyIndex - 1;
            for (uint256 i = 0; i < MAX_HISTORY_SIZE; i++) {
                orderedBets[i] = user.recentBets[(newestIndex + MAX_HISTORY_SIZE - i) % MAX_HISTORY_SIZE];
            }
        }

        return orderedBets;
    }

    /// @notice Paginated active player list for keeper automation.
    function getActivePlayers(uint256 offset, uint256 limit)
        external view returns (address[] memory players, uint256 total)
    {
        total = activePlayers.length;
        if (offset >= total) return (new address[](0), total);
        uint256 end = offset + limit > total ? total : offset + limit;
        players = new address[](end - offset);
        for (uint256 i = 0; i < players.length; i++) {
            players[i] = activePlayers[offset + i];
        }
    }

    function getPlayerForRequest(uint256 requestId) external view returns (address) {
        return requestToPlayer[requestId];
    }

    /// @notice True if the player has an active game with a pending VRF request or pending resolution.
    function hasPendingRequest(address player) external view returns (bool) {
        UserData storage user = userData[player];
        return user.currentGame.isActive &&
               (user.currentRequestId != 0 || user.pendingResolution);
    }

    /// @notice True if the player can start a new game.
    function canStartNewGame(address player) external view returns (bool) {
        UserData storage user = userData[player];
        return !user.currentGame.isActive &&
               user.currentRequestId == 0 &&
               !user.pendingResolution;
    }

    /// @notice True if the player has a result ready for resolveGame().
    function hasPendingResolution(address player) external view returns (bool) {
        return userData[player].pendingResolution;
    }

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
        uint256 lastPlayTimestamp,
        bool pendingResolution
    ) {
        if (player == address(0)) revert InvalidBetParameters("Invalid player address");

        UserData storage user = userData[player];

        isActive          = user.currentGame.isActive;
        isCompleted       = user.currentGame.completed;
        chosenNumber      = user.currentGame.chosenNumber;
        amount            = user.currentGame.amount;
        result            = user.currentGame.result;
        payout            = user.currentGame.payout;
        requestId         = user.currentRequestId;
        lastPlayTimestamp = user.lastPlayedTimestamp;
        pendingResolution = user.pendingResolution;

        // Natural win if payout > 0 and result is a valid dice face
        isWin = payout > 0 && result > 0 && result <= MAX_NUMBER;

        requestExists    = false;
        requestProcessed = false;

        if (requestId != 0) {
            RequestStatus storage request = s_requests[requestId];
            requestExists    = request.exists;
            requestProcessed = request.fulfilled;
        }

        recoveryEligible = false;
        if (isActive && !pendingResolution) {
            bool hasBlockThresholdPassed = block.number > user.lastPlayedBlock + BLOCK_THRESHOLD;
            bool hasTimeoutPassed        = block.timestamp > user.lastPlayedTimestamp + GAME_TIMEOUT;
            bool hasVrfRequest           = requestId != 0 && requestExists;
            recoveryEligible = hasBlockThresholdPassed && hasTimeoutPassed && hasVrfRequest;
        }
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    function _checkBalancesAndAllowances(address player, uint256 amount) private view {
        uint256 bal = gamaToken.balanceOf(player);
        if (bal < amount) revert InsufficientUserBalance(amount, bal);

        uint256 allowance = gamaToken.allowance(player, address(this));
        if (allowance < amount) revert InsufficientAllowance(amount, allowance);
    }

    /// @dev Circular history buffer, newest entry at historyIndex.
    function _updateUserHistory(
        UserData storage user,
        uint8 chosenNumber,
        uint8 result,
        uint256 amount,
        uint256 payout
    ) private {
        BetHistory memory newBet = BetHistory({
            chosenNumber:  chosenNumber,
            rolledNumber:  result,
            amount:        amount,
            timestamp:     uint32(block.timestamp),
            payout:        payout
        });

        if (user.recentBets.length < MAX_HISTORY_SIZE) {
            user.recentBets.push(newBet);
            user.historyIndex = uint8(user.recentBets.length % MAX_HISTORY_SIZE);
        } else {
            user.recentBets[user.historyIndex] = newBet;
            user.historyIndex = (user.historyIndex + 1) % MAX_HISTORY_SIZE;
        }
    }

    /// @dev Swap-pop removal from activePlayers.
    function _removeActivePlayer(address player) private {
        if (!isActivePlayer[player]) return;
        uint256 idx = activePlayerIndex[player] - 1;
        uint256 last = activePlayers.length - 1;
        if (idx != last) {
            address lastPlayer = activePlayers[last];
            activePlayers[idx] = lastPlayer; 
            activePlayerIndex[lastPlayer] = idx + 1;
        }
        activePlayers.pop();
        delete activePlayerIndex[player];
        isActivePlayer[player] = false;
    }
}
