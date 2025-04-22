const { Web3 } = require('web3');
require('dotenv').config();

async function grantRoles() {
  // Connect to XDC Apothem testnet
  const web3 = new Web3(
    process.env.VITE_XDC_APOTHEM_RPC || 'https://erpc.apothem.network'
  );

  if (!process.env.PRIVATE_KEY) {
    console.error('Error: PRIVATE_KEY not found in environment variables');
    return;
  }

  // Add account to wallet
  const account = web3.eth.accounts.privateKeyToAccount(
    process.env.PRIVATE_KEY
  );
  web3.eth.accounts.wallet.add(account);

  // Contract addresses from environment variables
  const tokenAddress = process.env.VITE_APOTHEM_TOKEN_ADDRESS;
  const diceAddress = process.env.VITE_APOTHEM_DICE_ADDRESS;

  if (!tokenAddress || !diceAddress) {
    console.error(
      'Error: Token address or dice address not found in environment variables'
    );
    return;
  }

  console.log(`Using token address: ${tokenAddress}`);
  console.log(`Using dice address: ${diceAddress}`);

  // Role hashes
  const DEFAULT_ADMIN_ROLE =
    '0x0000000000000000000000000000000000000000000000000000000000000000';
  const MINTER_ROLE =
    '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';
  const BURNER_ROLE =
    '0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848';

  // Contract ABI
  const abi = [
    {
      inputs: [
        { internalType: 'bytes32', name: 'role', type: 'bytes32' },
        { internalType: 'address', name: 'account', type: 'address' },
      ],
      name: 'grantRole',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        { internalType: 'bytes32', name: 'role', type: 'bytes32' },
        { internalType: 'address', name: 'account', type: 'address' },
      ],
      name: 'hasRole',
      outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
      stateMutability: 'view',
      type: 'function',
    },
  ];

  // Create contract instance
  const contract = new web3.eth.Contract(abi, tokenAddress);

  try {
    // Check current roles
    console.log('Checking current roles...');
    const hasMinterRole = await contract.methods
      .hasRole(MINTER_ROLE, diceAddress)
      .call();
    const hasBurnerRole = await contract.methods
      .hasRole(BURNER_ROLE, diceAddress)
      .call();

    console.log('Current roles:');
    console.log('MINTER_ROLE:', hasMinterRole);
    console.log('BURNER_ROLE:', hasBurnerRole);

    const gasPrice = await web3.eth.getGasPrice();
    console.log('Gas Price:', gasPrice);

    if (!hasMinterRole) {
      console.log('Granting MINTER_ROLE...');
      const tx1 = await contract.methods
        .grantRole(MINTER_ROLE, diceAddress)
        .send({
          from: account.address,
          gas: 200000,
          gasPrice: gasPrice,
        });
      console.log('MINTER_ROLE granted successfully:', tx1.transactionHash);
    }

    if (!hasBurnerRole) {
      console.log('Granting BURNER_ROLE...');
      const tx2 = await contract.methods
        .grantRole(BURNER_ROLE, diceAddress)
        .send({
          from: account.address,
          gas: 200000,
          gasPrice: gasPrice,
        });
      console.log('BURNER_ROLE granted successfully:', tx2.transactionHash);
    }

    // Verify final roles
    const finalMinterRole = await contract.methods
      .hasRole(MINTER_ROLE, diceAddress)
      .call();
    const finalBurnerRole = await contract.methods
      .hasRole(BURNER_ROLE, diceAddress)
      .call();

    console.log('Final role verification:');
    console.log('MINTER_ROLE:', finalMinterRole);
    console.log('BURNER_ROLE:', finalBurnerRole);
  } catch (error) {
    console.error('Error:', error);
  }
}

grantRoles().catch(console.error);
