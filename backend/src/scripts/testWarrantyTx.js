const { ethers } = require('ethers');

async function testWarranty() {
  const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
  const wallet = new ethers.Wallet('0x7e8bdf4f99691fd3520af9eac4d89b924f5be3d0afded9c41eb6a4cb0de0edd4', provider);
  console.log('🔑 Backend Wallet Address:', wallet.address);

  const contractAddress = ethers.getAddress('0x547007CE756b60A1547dC3D4f827BF9BB9fdeA76'.toLowerCase());
  console.log('📜 Target Contract Address:', contractAddress);

  const abi = [
    "function createMaintenance(string _machineId, string _workOrderId, string _engineerId, string _ipfsCid, uint8 _healthScoreBefore, uint8 _healthScoreAfter) public",
    "function maintenanceRecords(string) public view returns (string machineId, string workOrderId, string engineerId, uint256 timestamp, string ipfsCid, uint8 healthScoreBefore, uint8 healthScoreAfter, address verifierWallet, bool isVerified)",
  ];

  const contract = new ethers.Contract(contractAddress, abi, wallet);

  const workOrderId = `WARRANTY-TEST-${Date.now()}`;
  const machineId = 'MACH-6601';
  const engineerId = 'ENG-001';
  const ipfsCid = 'QmSentinelXWarrantyTestCid1111111';

  console.log(`\n⏳ Sending createMaintenance on Sepolia...`);
  console.log(`   Work Order ID : ${workOrderId}`);
  console.log(`   Machine ID    : ${machineId}`);

  try {
    const tx = await contract.createMaintenance(
      machineId,
      workOrderId,
      engineerId,
      ipfsCid,
      85,
      99,
      { gasLimit: 600000 }
    );
    console.log(`📡 Transaction Sent! Tx Hash: ${tx.hash}`);
    console.log(`⏳ Waiting for block confirmation on Sepolia...`);

    const receipt = await tx.wait(1);
    console.log(`\n===========================================================`);
    console.log(` ✅ SUCCESS! Transaction Confirmed on Sepolia Block #${receipt.blockNumber}`);
    console.log(` 🔗 Etherscan Tx Link: https://sepolia.etherscan.io/tx/${receipt.hash}`);
    console.log(`===========================================================\n`);
  } catch (err) {
    console.error(`❌ Contract Call Failed:`, err);
  }
}

testWarranty();
