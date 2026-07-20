import type { Metadata } from 'next';
import DevicesClient from './DevicesClient';

export const metadata: Metadata = {
  title: 'IoT Devices | SentinelX',
  description: 'Manage ESP32 IoT devices and connected sensors for industrial assets.',
};

export default function DevicesPage() {
  return <DevicesClient />;
}
