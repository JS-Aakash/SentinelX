import type { Metadata } from 'next';
import NewDeviceClient from './NewDeviceClient';

export const metadata: Metadata = {
  title: 'Add IoT Device | SentinelX',
  description: 'Register a new ESP32 microcontroller and auto-configure 6 sensors.',
};

export default function NewDevicePage() {
  return <NewDeviceClient />;
}
