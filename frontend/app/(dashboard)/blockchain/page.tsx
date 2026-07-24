import BlockchainClient from './BlockchainClient';

export const metadata = {
  title: 'Sepolia Blockchain Explorer | SentinelX',
  description: 'Ethereum Sepolia Testnet Blockchain Explorer and Immutable Maintenance Audit Ledger',
};

export default function BlockchainPage() {
  return <BlockchainClient />;
}
