// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract GamaCoin is ERC20, ERC20Burnable, ERC20Pausable, AccessControl, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant GAME_CONTRACT_ROLE = keccak256("GAME_CONTRACT_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    EnumerableSet.AddressSet private _blacklist;
    address private _owner;

    // Events
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AddressBlacklisted(address indexed account);
    event AddressUnblacklisted(address indexed account);
    event TokensAirdropped(address indexed recipient, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == _owner, "Only the owner can perform this action");
        _;
    }

    constructor() ERC20("GAMA Coin", "Gama") {
        _owner = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(GAME_CONTRACT_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        require(newOwner != _owner, "New owner must be different");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) nonReentrant {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) nonReentrant {
        uint256 balance = balanceOf(from);
        require(balance >= amount, "Insufficient balance");
        _burn(from, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function blacklistAddress(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!_blacklist.contains(account), "Already blacklisted");
        _blacklist.add(account);
        emit AddressBlacklisted(account);
    }

    function unblacklistAddress(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_blacklist.contains(account), "Not blacklisted");
        _blacklist.remove(account);
        emit AddressUnblacklisted(account);
    }

    function isBlacklisted(address account) public view returns (bool) {
        return _blacklist.contains(account);
    }

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        require(!paused(), "Token transfers are paused");
        require(!isBlacklisted(from), "Sender is blacklisted");
        require(!isBlacklisted(to), "Recipient is blacklisted");
        super._update(from, to, value);
    }

    /// @notice Airdrop tokens to multiple addresses
    /// @param recipients List of addresses to receive tokens
    /// @param amounts Corresponding amounts for each recipient
    function airdropTokens(address[] calldata recipients, uint256[] calldata amounts)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
    {
        require(recipients.length == amounts.length, "Length mismatch");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(!isBlacklisted(recipients[i]), "Recipient is blacklisted");
            _mint(recipients[i], amounts[i]);
            emit TokensAirdropped(recipients[i], amounts[i]);
        }
    }
}
