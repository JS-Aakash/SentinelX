import type { Metadata } from 'next';
import EditDeviceClient from './EditDeviceClient';

export const metadata: Metadata = {
  title: 'Edit Device | SentinelX',
  description: 'Update ESP32 device details and settings.',
};

export default async function EditDevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditDeviceClient id={id} />;
}
