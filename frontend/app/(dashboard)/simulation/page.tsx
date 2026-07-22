import { Metadata } from 'next';
import SimulationClient from './SimulationClient';

export const metadata: Metadata = {
  title: 'Sensor Simulation | SentinelX',
  description: 'Virtual sensor simulation and fault profile generator',
};

export default function SimulationPage() {
  return <SimulationClient />;
}
