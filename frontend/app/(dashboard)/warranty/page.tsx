import { Metadata } from 'next';
import WarrantyClient from './WarrantyClient';

export const metadata: Metadata = {
  title: 'Warranty & Claims | SentinelX',
  description: 'Track machine warranties, manage claims, and get warranty eligibility status',
};

export default function WarrantyPage() {
  return <WarrantyClient />;
}
