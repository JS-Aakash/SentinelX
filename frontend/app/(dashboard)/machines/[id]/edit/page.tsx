import type { Metadata } from 'next';
import EditMachineClient from './EditMachineClient';

export const metadata: Metadata = {
  title: 'Edit Machine | SentinelX',
  description: 'Update industrial machine specifications and operational settings.',
};

export default async function EditMachinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditMachineClient id={id} />;
}
