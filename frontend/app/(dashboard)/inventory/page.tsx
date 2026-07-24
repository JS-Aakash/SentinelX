import { Metadata } from 'next';
import InventoryClient from './InventoryClient';

export const metadata: Metadata = {
  title: 'Parts Inventory & Vendors | SentinelX',
  description: 'Manage spare parts inventory, track stock levels, and maintain vendor directory',
};

export default function InventoryPage() {
  return <InventoryClient />;
}
