import { Metadata } from 'next';
import LifecycleClient from './LifecycleClient';

export const metadata: Metadata = {
  title: 'Asset Lifecycle | SentinelX',
  description: 'Complete visual timeline of every machine lifecycle event — registrations, maintenance, repairs, inspections, and more',
};

export default function LifecyclePage() {
  return <LifecycleClient />;
}
