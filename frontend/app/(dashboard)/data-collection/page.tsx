import { Metadata } from 'next';
import DataCollectionClient from './DataCollectionClient';

export const metadata: Metadata = {
  title: 'Data Collection Dashboard | SentinelX',
  description: 'Live sensor data acquisition and dataset recording dashboard',
};

export default function DataCollectionPage() {
  return <DataCollectionClient />;
}
