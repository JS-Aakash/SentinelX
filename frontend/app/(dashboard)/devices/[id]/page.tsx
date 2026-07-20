import type { Metadata } from 'next';
import DeviceDetailClient from './DeviceDetailClient';

export const metadata: Metadata = {
  title: 'Device Detail | SentinelX',
  description: 'View IoT device status, assigned machine, and configure connected sensors.',
};

export default async function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DeviceDetailClient id={id} />;
}
