// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts-upgradeable/contracts/token/ERC20/ERC20Upgradeable.sol";
import "lib/openzeppelin-contracts-upgradeable/contracts/utils/PausableUpgradeable.sol";
import "lib/openzeppelin-contracts-upgradeable/contracts/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "lib/openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import "lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";

contract GamaToken is Initializable, ERC20Upgradeable, PausableUpgradeable, ERC20BurnableUpgradeable, OwnableUpgradeable {
    mapping(address => bool) public isBlacklisted;
    mapping(address => bool) public isGame;
    mapping(address => uint256) public gameMintLimit;
    mapping(address => uint256) public gameMinted;

    uint256 private _maxMintable;
    uint256 private _totalMinted;

    event Blacklisted(address indexed account, bool value);
    event GameWhitelisted(address indexed game, uint256 limit);
    event GameLimitUpdated(address indexed game, uint256 newLimit);
    event Airdrop(address indexed recipient, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(uint256 maxMintable_, address owner_) public initializer {
        __ERC20_init("Gama Token", "GAMA");
        __Ownable_init(owner_);
        __Pausable_init();
        __ERC20Burnable_init();

        _maxMintable = maxMintable_;
    }

    modifier onlyGame() {
        require(isGame[msg.sender], "Not authorized game contract");
        _;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setBlacklist(address account, bool value) external onlyOwner {
        isBlacklisted[account] = value;
        emit Blacklisted(account, value);
    }

    function whitelistGame(address game, uint256 limit) external onlyOwner {
        require(game != address(0), "Invalid address");
        isGame[game] = true;
        gameMintLimit[game] = limit;
        emit GameWhitelisted(game, limit);
    }

    function updateGameLimit(address game, uint256 newLimit) external onlyOwner {
        require(isGame[game], "Game not whitelisted");
        gameMintLimit[game] = newLimit;
        emit GameLimitUpdated(game, newLimit);
    }

    function mint(address to, uint256 amount) external whenNotPaused onlyGame {
        require(!isBlacklisted[to] && !isBlacklisted[msg.sender], "Blacklisted address");

        uint256 newMintedByGame = gameMinted[msg.sender] + amount;
        require(newMintedByGame <= gameMintLimit[msg.sender], "Game mint limit exceeded");

        uint256 newTotalMinted = _totalMinted + amount;
        require(newTotalMinted <= _maxMintable, "Global mint limit exceeded");

        gameMinted[msg.sender] = newMintedByGame;
        _totalMinted = newTotalMinted;

        _mint(to, amount);
    }

    function burn(uint256 amount) public override whenNotPaused onlyGame {
        super.burn(amount);
        require(_totalMinted >= amount, "Burn exceeds total minted");
        _totalMinted -= amount;
    }

    function burnFrom(address account, uint256 amount) public override whenNotPaused onlyGame {
        super.burnFrom(account, amount);
        require(_totalMinted >= amount, "Burn exceeds total minted");
        _totalMinted -= amount;
    }

    function airdrop(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner whenNotPaused {
        require(recipients.length == amounts.length, "Length mismatch");

        uint256 total = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            require(!isBlacklisted[recipients[i]], "Recipient is blacklisted");
            total += amounts[i];
        }

        require(_totalMinted + total <= _maxMintable, "Global mint limit exceeded");

        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
            emit Airdrop(recipients[i], amounts[i]);
        }

        _totalMinted += total;
    }

    function _update(address from, address to, uint256 value) internal override {
        require(!paused(), "Token transfers paused");
        require(!isBlacklisted[from] && !isBlacklisted[to], "Blacklisted address");
        super._update(from, to, value);
    }

    // View Functions
    function getMaxMintable() external view returns (uint256) {
        return _maxMintable;
    }

    function getTotalMinted() external view returns (uint256) {
        return _totalMinted;
    }

    function getRemainingMintable() external view returns (uint256) {
        return _maxMintable - _totalMinted;
    }

    function getGameMinted(address game) external view returns (uint256) {
        return gameMinted[game];
    }

    function getGameLimit(address game) external view returns (uint256) {
        return gameMintLimit[game];
    }
}
