import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
const solc = require('solc');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const RPC_CANDIDATES = [
  process.env.SEPOLIA_RPC_URL,
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://sepolia.drpc.org',
  'https://1rpc.io/sepolia',
  'https://rpc2.sepolia.org',
].filter(Boolean) as string[];

const PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY || '0x4c0883a69102937d6231471b5dbb6204f29ed2c66d21469e38d7a1262d174620';

async function main() {
  console.log('===========================================================');
  console.log(' 🚀 SentinelX Smart Contract Live Deployment to Sepolia ');
  console.log('===========================================================');

  // 1. Read Solidity Source
  const contractPath = path.join(__dirname, '../blockchain/SentinelXMaintenance.sol');
  if (!fs.existsSync(contractPath)) {
    throw new Error(`Solidity file not found at ${contractPath}`);
  }
  const source = fs.readFileSync(contractPath, 'utf8');

  // 2. Compile Solidity with Solc
  console.log('🔨 Compiling SentinelXMaintenance.sol with solc v0.8.20...');
  const input = {
    language: 'Solidity',
    sources: {
      'SentinelXMaintenance.sol': { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatalErr = output.errors.find((e: any) => e.severity === 'error');
    if (fatalErr) {
      throw new Error(`Compilation error: ${fatalErr.formattedMessage}`);
    }
  }

  const contractObj = output.contracts['SentinelXMaintenance.sol']['SentinelXMaintenance'];
  const abi = contractObj.abi;
  const bytecode = contractObj.evm.bytecode.object;

  console.log('✅ Solidity Compilation Successful!');

  // 3. Connect Provider & Wallet
  const cleanKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : '0x' + PRIVATE_KEY;
  let provider: ethers.JsonRpcProvider | null = null;
  let activeRpc = '';

  for (const candidate of RPC_CANDIDATES) {
    try {
      const p = new ethers.JsonRpcProvider(candidate);
      await p.getBlockNumber();
      provider = p;
      activeRpc = candidate;
      break;
    } catch {}
  }

  if (!provider) {
    activeRpc = 'https://ethereum-sepolia-rpc.publicnode.com';
    provider = new ethers.JsonRpcProvider(activeRpc);
  }

  console.log(`📡 Connected to Sepolia RPC Node: ${activeRpc}`);
  const wallet = new ethers.Wallet(cleanKey, provider);
  console.log(`🔑 Deployer Wallet Address: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Deployer Wallet Balance: ${ethers.formatEther(balance)} Sepolia ETH`);

  if (balance === 0n) {
    throw new Error('❌ Wallet has 0 Sepolia ETH balance. Please fund wallet from a Sepolia faucet.');
  }

  // 4. Deploy Contract
  console.log('⏳ Deploying SentinelXMaintenance smart contract to Ethereum Sepolia Testnet...');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();

  console.log(`📡 Deployment Transaction Sent! Tx Hash: ${contract.deploymentTransaction()?.hash}`);
  console.log('⏳ Waiting for block confirmation on Sepolia blockchain...');

  await contract.waitForDeployment();
  const deployedAddress = await contract.getAddress();

  console.log('\n===========================================================');
  console.log(' 🎉 SMART CONTRACT DEPLOYED SUCCESSFULLY TO SEPOLIA!');
  console.log('===========================================================');
  console.log(` 📍 Deployed Contract Address : ${deployedAddress}`);
  console.log(` 🔗 Etherscan Contract URL    : https://sepolia.etherscan.io/address/${deployedAddress}`);
  console.log('===========================================================\n');

  // 5. Update SEPOLIA_CONTRACT_ADDRESS in backend/.env automatically!
  const envPath = path.join(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('SEPOLIA_CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(/SEPOLIA_CONTRACT_ADDRESS=.*/g, `SEPOLIA_CONTRACT_ADDRESS=${deployedAddress}`);
    } else {
      envContent += `\nSEPOLIA_CONTRACT_ADDRESS=${deployedAddress}\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`✅ Updated SEPOLIA_CONTRACT_ADDRESS=${deployedAddress} inside backend/.env automatically!`);
  }
}

main().catch((err) => {
  console.error('❌ Deployment error:', err);
  process.exit(1);
});
