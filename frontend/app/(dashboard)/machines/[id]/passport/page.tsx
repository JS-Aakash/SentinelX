import { Metadata } from 'next';
import PassportClient from './PassportClient';

export const metadata: Metadata = {
  title: 'Asset Passport | SentinelX',
  description: 'Digital asset passport with full machine profile, maintenance history, and blockchain verification',
};

interface Props {
  params: { id: string };
}

export default function PassportPage({ params }: Props) {
  return <PassportClient machineId={params.id} />;
}
