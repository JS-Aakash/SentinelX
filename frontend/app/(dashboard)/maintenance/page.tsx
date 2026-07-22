import { Metadata } from 'next';
import MaintenanceClient from './MaintenanceClient';

export const metadata: Metadata = {
  title: 'Predictive Maintenance | SentinelX',
  description: 'AI-driven failure forecasting, RSOT estimation, and work order dispatching',
};

export default function MaintenancePage() {
  return <MaintenanceClient />;
}
