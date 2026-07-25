import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const RPC_CANDIDATES = [
  process.env.SEPOLIA_RPC_URL,
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://sepolia.drpc.org',
  'https://1rpc.io/sepolia',
  'https://rpc2.sepolia.org',
].filter(Boolean) as string[];

const PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY || '0x4c0883a69102937d6231471b5dbb6204f29ed2c66d21469e38d7a1262d174620';
const RAW_CONTRACT_ADDRESS = process.env.SEPOLIA_CONTRACT_ADDRESS || '0x7120B5a3962F7642646279E53F992C88cEa72513';
const CONTRACT_ADDRESS = ethers.getAddress(RAW_CONTRACT_ADDRESS.toLowerCase());

const CONTRACT_ABI = [
  "function createMaintenance(string _machineId, string _workOrderId, string _engineerId, string _ipfsCid, uint8 _healthScoreBefore, uint8 _healthScoreAfter) public",
  "function getMaintenance(string _workOrderId) public view returns (tuple(string machineId, string workOrderId, string engineerId, uint256 timestamp, string ipfsCid, uint8 healthScoreBefore, uint8 healthScoreAfter, address verifierWallet, bool isVerified))",
  "function workOrderIds(uint256) public view returns (string)",
];

async function main() {
  console.log('===========================================================');
  console.log(' 🔗 SentinelX Ethereum Sepolia Blockchain Diagnostic Test ');
  console.log('===========================================================');

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

  console.log(`📡 Active Sepolia RPC Node : ${activeRpc}`);

  const blockNumber = await provider.getBlockNumber();
  console.log(`📦 Current Block Height  : ${blockNumber}`);

  const wallet = new ethers.Wallet(cleanKey, provider);
  console.log(`🔑 Backend Wallet Address : ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  const ethBalance = ethers.formatEther(balance);
  console.log(`💰 Wallet Balance        : ${ethBalance} Sepolia ETH`);

  console.log(`📜 Smart Contract Address : ${CONTRACT_ADDRESS}`);

  const code = await provider.getCode(CONTRACT_ADDRESS);
  if (code === '0x' || code === '0x0') {
    console.log(`⚠️ Contract Status        : No contract bytecode found at ${CONTRACT_ADDRESS} on this network.`);
    console.log(`💡 Note                   : The backend BlockchainService will automatically use signed authenticated Sepolia proof fallback mode until deployed.`);
  } else {
    console.log(`✅ Contract Status        : Deployed & Active on Sepolia Testnet!`);
    console.log(`🔍 Etherscan Contract URL : https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`);
  }

  console.log('\n===========================================================');
  console.log(' 💡 How to Test Blockchain Verification in SentinelX App:');
  console.log('===========================================================');
  console.log(' 1. Open Dashboard: http://localhost:3000/blockchain');
  console.log(' 2. Or navigate to any Machine Asset Passport: http://localhost:3000/machines/<id>/passport');
  console.log(' 3. Click "Verify Record on Chain" or create a new Maintenance record.');
  console.log(' 4. View real-time Block Number, Tx Hash, and click Etherscan link to inspect live on-chain data!');
  console.log('===========================================================\n');
}

main().catch((err) => {
  console.error('❌ Test error:', err.message);
  process.exit(1);
});
