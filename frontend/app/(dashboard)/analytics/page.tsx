import { Metadata } from 'next';
import AnalyticsClient from './AnalyticsClient';

export const metadata: Metadata = {
  title: 'Enterprise Analytics | SentinelX',
  description: 'Machine health, MTTR/MTBF, inventory analytics, warranty savings — enterprise-grade analytics dashboard',
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
