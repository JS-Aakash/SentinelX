import { Metadata } from 'next';
import PassportClient from './PassportClient';

export const metadata: Metadata = {
  title: 'Asset Passport | SentinelX',
  description: 'Digital asset passport with full machine profile, maintenance history, and blockchain verification',
};

export default async function PassportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PassportClient machineId={id} />;
}
