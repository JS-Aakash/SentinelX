const { ethers } = require('ethers');

async function test() {
  const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
  const wallet = new ethers.Wallet('0x7e8bdf4f99691fd3520af9eac4d89b924f5be3d0afded9c41eb6a4cb0de0edd4', provider);
  console.log('🔑 Backend Wallet Address:', wallet.address);

  const abi = ['function admin() public view returns (address)'];

  try {
    const c1 = new ethers.Contract('0x547007CE756b60A1547dC3D4f827BF9BB9fdeA76', abi, provider);
    const admin1 = await c1.admin();
    console.log('📜 Contract 0x547007... Admin:', admin1);
    console.log('   Is Wallet Admin?', admin1.toLowerCase() === wallet.address.toLowerCase() ? '✅ YES' : '❌ NO (WILL REVERT)');
  } catch (err) {
    console.log('❌ Contract 0x547007 Error:', err.message);
  }

  try {
    const c2 = new ethers.Contract('0xD1207e60058C6eF8d56E81B61947EE8e9b6264d9', abi, provider);
    const admin2 = await c2.admin();
    console.log('📜 Contract 0xD1207e... Admin:', admin2);
    console.log('   Is Wallet Admin?', admin2.toLowerCase() === wallet.address.toLowerCase() ? '✅ YES' : '❌ NO (WILL REVERT)');
  } catch (err) {
    console.log('❌ Contract 0xD1207e Error:', err.message);
  }
}

test();
