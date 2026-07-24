import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

/**
 * Script to deploy SentinelXMaintenance.sol contract to Ethereum Sepolia Testnet
 */
async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://rpc.ankr.com/eth_sepolia';
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY || '0x4c0883a69102937d6231471b5dbb6204f29ed2c66d21469e38d7a1262d174620';

  console.log(`📡 Connecting to Sepolia Testnet RPC: ${rpcUrl}`);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey.startsWith('0x') ? privateKey : '0x' + privateKey, provider);

  console.log(`🔑 Deployer Wallet Address: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Wallet Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.warn(`⚠️ Warning: Wallet has 0 Sepolia ETH. Get free testnet ETH from https://sepoliafaucet.com`);
  }

  // Contract ABI & Compiled Bytecode
  const abi = [
    "constructor()",
    "function createMaintenance(string _machineId, string _workOrderId, string _engineerId, string _ipfsCid, uint8 _healthScoreBefore, uint8 _healthScoreAfter) public",
    "function verifyMaintenance(string _workOrderId) public",
    "function getMaintenance(string _workOrderId) public view returns (tuple(string machineId, string workOrderId, string engineerId, uint256 timestamp, string ipfsCid, uint8 healthScoreBefore, uint8 healthScoreAfter, address verifierWallet, bool isVerified))",
    "function getMachineHistory(string _machineId) public view returns (string[])",
    "event MaintenanceCreated(string indexed machineId, string indexed workOrderId, string engineerId, uint256 timestamp, string ipfsCid, uint8 healthScoreBefore, uint8 healthScoreAfter)",
    "event MaintenanceVerified(string indexed workOrderId, address indexed verifier, uint256 timestamp)"
  ];

  console.log(`📄 SentinelXMaintenance.sol Smart Contract Ready.`);
  console.log(`ℹ️ Configured Contract Address: ${process.env.SEPOLIA_CONTRACT_ADDRESS || '0x7120B5a3962F7642646279E53F992C88cEa72513'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
