import type { Metadata } from 'next';
import MachineDetailClient from './MachineDetailClient';

export const metadata: Metadata = {
  title: 'Machine Detail | SentinelX',
  description: 'View machine details, specifications, and operational status.',
};

export default async function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MachineDetailClient id={id} />;
}

