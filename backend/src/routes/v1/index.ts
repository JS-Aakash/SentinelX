import { Router } from 'express';
import authRoutes from './auth.routes';
import companyRoutes from './company.routes';
import userRoutes from './user.routes';
import machineRoutes from './machine.routes';
import deviceRoutes from './device.routes';
import sensorRoutes from './sensor.routes';
import dashboardRoutes from './dashboard.routes';

import datasetRoutes from './dataset.routes';
import aiRoutes from './ai.routes';
import simulationRoutes from './simulation.routes';
import maintenanceRoutes from './maintenance.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/company', companyRoutes);
router.use('/users', userRoutes);
router.use('/machines', machineRoutes);
router.use('/devices', deviceRoutes);
router.use('/sensors', sensorRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/datasets', datasetRoutes);
router.use('/ai', aiRoutes);
router.use('/simulation', simulationRoutes);
router.use('/maintenance', maintenanceRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'SentinelX API is running',
    timestamp: new Date().toISOString(),
    version: '8.1.0',
    modules: ['auth', 'company', 'users', 'machines', 'devices', 'sensors', 'dashboard', 'datasets', 'ai', 'simulation', 'maintenance'],
  });
});

export default router;

