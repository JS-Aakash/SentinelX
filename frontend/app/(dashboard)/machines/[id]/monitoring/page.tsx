import type { Metadata } from 'next';
import MonitoringClient from './MonitoringClient';

export const metadata: Metadata = {
  title: 'Real-Time Monitoring | SentinelX',
  description: 'Live sensor streams, telemetry charts, and historical data analytics.',
};

export default async function MachineMonitoringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MonitoringClient machineId={id} />;
}
