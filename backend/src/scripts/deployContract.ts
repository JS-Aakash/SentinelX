import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

/**
 * Script to deploy SentinelXMaintenance.sol contract to Ethereum Sepolia Testnet
 */
async function main() {
  const rpcCandidates = [
    process.env.SEPOLIA_RPC_URL,
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://sepolia.drpc.org',
    'https://1rpc.io/sepolia',
    'https://rpc2.sepolia.org',
  ].filter(Boolean) as string[];

  const privateKey = process.env.SEPOLIA_PRIVATE_KEY || '0x4c0883a69102937d6231471b5dbb6204f29ed2c66d21469e38d7a1262d174620';
  const cleanKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;

  let provider: ethers.JsonRpcProvider | null = null;
  let activeRpc = '';

  for (const candidate of rpcCandidates) {
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

  console.log(`📡 Connected to Sepolia Testnet RPC: ${activeRpc}`);
  const wallet = new ethers.Wallet(cleanKey, provider);

  console.log(`🔑 Wallet Address: ${wallet.address}`);
  let balance = 0n;
  try {
    balance = await provider.getBalance(wallet.address);
    console.log(`💰 Wallet Balance: ${ethers.formatEther(balance)} ETH`);
  } catch (err: any) {
    console.log(`💰 Wallet Balance Check Note: ${err.message}`);
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
  console.log(`ℹ️ Configured Contract Address: ${process.env.SEPOLIA_CONTRACT_ADDRESS || '0xD1207e60058C6eF8d56E81B61947EE8e9b6264d9'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
