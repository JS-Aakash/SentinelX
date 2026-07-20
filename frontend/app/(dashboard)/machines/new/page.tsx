import type { Metadata } from 'next';
import NewMachineClient from './NewMachineClient';

export const metadata: Metadata = {
  title: 'Add Machine | SentinelX',
  description: 'Register a new industrial machine to your SentinelX platform.',
};

export default function NewMachinePage() {
  return <NewMachineClient />;
}
