import { IngestionService } from './IngestionService';
import { Device } from '../models/Device';
import { Machine } from '../models/Machine';
import { logger } from '../utils/logger';

export type SimulationProfile =
  | 'normal_operation'
  | 'bearing_failure'
  | 'motor_overload'
  | 'loose_belt'
  | 'voltage_fluctuation'
  | 'custom';

export interface ISensorOverride {
  temperature?: number;
  vibration?: number;
  current?: number;
  voltage?: number;
  rpm?: number;
  sound?: number;
  [key: string]: number | undefined;
}

export interface ISimulationSession {
  machineId: string;
  deviceId: string;
  companyId: string;
  profile: SimulationProfile;
  speed: number; // 1x, 5x, 10x, 100x
  isPaused: boolean;
  stepCount: number;
  overrides: ISensorOverride;
  currentValues: {
    temperature: number;
    vibration: number;
    current: number;
    voltage: number;
    rpm: number;
    sound: number;
  };
  timer?: NodeJS.Timeout;
}

// In-Memory Simulation Manager
const ACTIVE_SIMULATIONS: Map<string, ISimulationSession> = new Map();

export class SimulationService {
  /**
   * Start or update simulation for a machine
   */
  public static async startSimulation(params: {
    machineId: string;
    profile?: SimulationProfile;
    speed?: number;
    overrides?: ISensorOverride;
  }): Promise<ISimulationSession> {
    const { machineId, profile = 'normal_operation', speed = 1, overrides = {} } = params;

    const machine = await Machine.findById(machineId).exec();
    if (!machine) {
      throw new Error('Machine not found');
    }

    // Find assigned device, or create a dedicated simulator device linked to THIS machine.
    // This is critical: without creating the device here, IngestionService would auto-create
    // it linked to the first machine it finds (wrong), causing the socket to emit with the
    // wrong machineId and the dashboard to show data under the wrong machine.
    let device = await Device.findOne({ machineId: machine._id }).exec();
    if (!device) {
      const { DeviceStatus } = await import('../models/Device');
      device = await Device.create({
        name: `Simulator (${machine.machineCode})`,
        deviceId: `SIM-${machine.machineCode.toUpperCase()}`,
        type: 'Simulator',
        status: DeviceStatus.ONLINE,
        companyId: machine.companyId,
        machineId: machine._id,
        createdBy: machine.companyId,
        firmwareVersion: 'v2.4.1-sim',
        macAddress: `AA:BB:CC:DD:EE:${Math.floor(Math.random() * 90 + 10)}`,
      });
      logger.info(`🔧 Auto-created simulator device '${device.deviceId}' linked to machine '${machine.name}'`);
    }
    const deviceId = device.deviceId;

    // Stop existing simulation if running
    this.stopSimulation(machineId);

    const initialValues = this.getInitialValuesForProfile(profile, overrides);

    const session: ISimulationSession = {
      machineId,
      deviceId,
      companyId: machine.companyId.toString(),
      profile,
      speed,
      isPaused: false,
      stepCount: 0,
      overrides,
      currentValues: initialValues,
    };
    ACTIVE_SIMULATIONS.set(machineId, session);

    // Persist active simulation config to MongoDB Machine document
    machine.simulationConfig = {
      isRunning: true,
      isPaused: false,
      profile,
      speed,
      overrides,
    };
    await machine.save().catch(() => {});

    // Start tick loop
    this.scheduleNextTick(machineId);

    logger.info(`🎮 Started simulation for machine '${machine.name}' (${machineId}) [Profile: ${profile}, Speed: ${speed}x, Device: ${deviceId}]`);
    return this.getSanitizedSession(session);
  }

  /**
   * Pause running simulation
   */
  public static async pauseSimulation(machineId: string): Promise<ISimulationSession | null> {
    const session = ACTIVE_SIMULATIONS.get(machineId);
    if (!session) return null;

    session.isPaused = true;
    if (session.timer) {
      clearTimeout(session.timer);
      session.timer = undefined;
    }

    await Machine.findByIdAndUpdate(machineId, { 'simulationConfig.isPaused': true }).catch(() => {});

    logger.info(`⏸️ Paused simulation for machine ${machineId}`);
    return this.getSanitizedSession(session);
  }

  /**
   * Resume paused simulation
   */
  public static async resumeSimulation(machineId: string): Promise<ISimulationSession | null> {
    const session = ACTIVE_SIMULATIONS.get(machineId);
    if (!session) return null;

    if (session.isPaused) {
      session.isPaused = false;
      this.scheduleNextTick(machineId);
      await Machine.findByIdAndUpdate(machineId, { 'simulationConfig.isPaused': false }).catch(() => {});
      logger.info(`▶️ Resumed simulation for machine ${machineId}`);
    }

    return this.getSanitizedSession(session);
  }

  /**
   * Stop simulation completely
   */
  public static async stopSimulation(machineId: string): Promise<boolean> {
    const session = ACTIVE_SIMULATIONS.get(machineId);
    if (session?.timer) {
      clearTimeout(session.timer);
    }
    ACTIVE_SIMULATIONS.delete(machineId);

    await Machine.findByIdAndUpdate(machineId, {
      'simulationConfig.isRunning': false,
      'simulationConfig.isPaused': false,
    }).catch(() => {});

    logger.info(`⏹️ Stopped simulation for machine ${machineId}`);
    return true;
  }

  /**
   * Auto-resume active simulations from MongoDB when backend boots / restarts
   */
  public static async restoreSimulations(): Promise<void> {
    try {
      const machinesWithActiveSim = await Machine.find({ 'simulationConfig.isRunning': true }).exec();
      if (machinesWithActiveSim.length === 0) return;

      logger.info(`🔄 Restoring ${machinesWithActiveSim.length} active simulation(s) after backend restart...`);
      for (const m of machinesWithActiveSim) {
        const config = m.simulationConfig;
        if (!config) continue;
        await this.startSimulation({
          machineId: m._id.toString(),
          profile: config.profile as SimulationProfile,
          speed: config.speed || 1,
          overrides: config.overrides,
        }).catch((err) => {
          logger.warn(`Failed to restore simulation for machine ${m.name}: ${err.message}`);
        });
      }
    } catch (err: any) {
      logger.warn(`Notice during simulation restoration: ${err.message}`);
    }
  }

  /**
   * Update manual sensor sliders/numeric inputs in real time
   */
  public static async updateSensorOverrides(machineId: string, overrides: ISensorOverride): Promise<ISimulationSession | null> {
    let session = ACTIVE_SIMULATIONS.get(machineId);
    if (!session) {
      // If not running, start custom simulation
      await this.startSimulation({ machineId, profile: 'custom', overrides });
      session = ACTIVE_SIMULATIONS.get(machineId)!;
    } else {
      session.overrides = { ...session.overrides, ...overrides };
      session.profile = 'custom';
      for (const [key, val] of Object.entries(overrides)) {
        if (val !== undefined && val !== null && !isNaN(val)) {
          (session.currentValues as any)[key] = Number(val);
        }
      }
      // Immediately trigger 1 tick on manual value change for instant UI response!
      this.executeSimulationStep(machineId);
    }

    return session ? this.getSanitizedSession(session) : null;
  }

  /**
   * Get active simulation session for a machine
   */
  public static getSimulationStatus(machineId: string): ISimulationSession | null {
    const session = ACTIVE_SIMULATIONS.get(machineId);
    return session ? this.getSanitizedSession(session) : null;
  }

  /**
   * Get all active simulation sessions
   */
  public static getAllActiveSimulations(): ISimulationSession[] {
    return Array.from(ACTIVE_SIMULATIONS.values()).map((s) => this.getSanitizedSession(s));
  }

  /**
   * Internal tick scheduling based on speed factor
   */
  private static scheduleNextTick(machineId: string): void {
    const session = ACTIVE_SIMULATIONS.get(machineId);
    if (!session || session.isPaused) return;

    // Base interval = 5000ms (5 seconds)
    // 1x = 5000ms, 5x = 1000ms, 10x = 500ms, 100x = 50ms
    const baseInterval = 5000;
    const intervalMs = Math.max(50, Math.round(baseInterval / (session.speed || 1)));

    session.timer = setTimeout(async () => {
      await this.executeSimulationStep(machineId);
      this.scheduleNextTick(machineId);
    }, intervalMs);
  }

  /**
   * Execute 1 simulation step and pass payload into standard IngestionService pipeline
   */
  private static async executeSimulationStep(machineId: string): Promise<void> {
    const session = ACTIVE_SIMULATIONS.get(machineId);
    if (!session) return;

    session.stepCount += 1;
    const nextVals = this.calculateNextSensorValues(session);
    session.currentValues = nextVals;

    const payload = {
      deviceId: session.deviceId,
      timestamp: new Date().toISOString(),
      temperature: Number(nextVals.temperature.toFixed(2)),
      vibration: Number(nextVals.vibration.toFixed(3)),
      current: Number(nextVals.current.toFixed(2)),
      voltage: Number(nextVals.voltage.toFixed(1)),
      rpm: Number(nextVals.rpm.toFixed(0)),
      sound: Number(nextVals.sound.toFixed(1)),
    };

    const topic = `company/${session.companyId}/device/${session.deviceId}`;

    // Pass through exact MQTT Telemetry Ingestion Pipeline asynchronously (Non-blocking)
    IngestionService.processMQTTMessage(topic, Buffer.from(JSON.stringify(payload))).catch((err: any) => {
      logger.error(`Simulation telemetry ingestion background error: ${err.message || err}`);
    });
  }

  /**
   * Calculate initial sensor values for profile
   */
  private static getInitialValuesForProfile(profile: SimulationProfile, overrides: ISensorOverride) {
    let base = {
      temperature: 42.5,
      vibration: 0.14,
      current: 3.4,
      voltage: 230.0,
      rpm: 1485,
      sound: 62.0,
    };

    if (profile === 'bearing_failure') {
      base = { temperature: 55.0, vibration: 0.8, current: 4.2, voltage: 228.0, rpm: 1420, sound: 74.0 };
    } else if (profile === 'motor_overload') {
      base = { temperature: 60.0, vibration: 0.4, current: 12.0, voltage: 220.0, rpm: 1350, sound: 70.0 };
    } else if (profile === 'loose_belt') {
      base = { temperature: 46.0, vibration: 0.9, current: 4.0, voltage: 230.0, rpm: 1380, sound: 68.0 };
    } else if (profile === 'voltage_fluctuation') {
      base = { temperature: 48.0, vibration: 0.2, current: 3.8, voltage: 205.0, rpm: 1460, sound: 64.0 };
    }

    // Apply manual overrides if present
    return {
      temperature: overrides.temperature ?? base.temperature,
      vibration: overrides.vibration ?? base.vibration,
      current: overrides.current ?? base.current,
      voltage: overrides.voltage ?? base.voltage,
      rpm: overrides.rpm ?? base.rpm,
      sound: overrides.sound ?? base.sound,
    };
  }

  /**
   * Compute realistic progressive sensor behavior per profile tick
   */
  private static calculateNextSensorValues(session: ISimulationSession) {
    const { profile, stepCount, overrides, currentValues } = session;
    const noise = (amplitude: number) => (Math.random() - 0.5) * 2 * amplitude;

    let { temperature, vibration, current, voltage, rpm, sound } = currentValues;

    if (profile === 'normal_operation') {
      temperature = Math.min(65, temperature + 0.05 + noise(0.2));
      vibration = Math.max(0.05, 0.14 + noise(0.02));
      current = Math.max(1.0, 3.4 + noise(0.1));
      voltage = Math.max(210, Math.min(240, 230.0 + noise(0.8)));
      rpm = Math.max(1200, Math.min(1600, 1485 + noise(5)));
      sound = Math.max(50, 62.0 + noise(0.5));
    } else if (profile === 'bearing_failure') {
      // Rapid temp & vibration rise, sound increase, rpm decrease
      temperature = Math.min(105, temperature + 0.6 + noise(0.2));
      vibration = Math.min(6.0, vibration + 0.08 + noise(0.05));
      sound = Math.min(100, sound + 0.5 + noise(0.4));
      rpm = Math.max(600, rpm - 2.5 + noise(4));
      current = Math.min(15, current + 0.05 + noise(0.1));
      voltage = 228.0 + noise(1.0);
    } else if (profile === 'motor_overload') {
      // Current spikes, temp rises, rpm drops
      current = Math.min(22.0, current + 0.35 + noise(0.2));
      temperature = Math.min(100, temperature + 0.5 + noise(0.2));
      rpm = Math.max(700, rpm - 3.0 + noise(5));
      vibration = Math.min(4.0, vibration + 0.03 + noise(0.03));
      sound = Math.min(92, sound + 0.3 + noise(0.3));
      voltage = Math.max(195, voltage - 0.2 + noise(0.5));
    } else if (profile === 'loose_belt') {
      // RPM & vibration oscillate wildly, current fluctuates
      const sineVal = Math.sin(stepCount * 0.4);
      rpm = Math.max(900, Math.min(1600, 1380 + sineVal * 150 + noise(10)));
      vibration = Math.max(0.2, Math.min(3.5, 1.2 + Math.abs(sineVal) * 1.2 + noise(0.08)));
      current = Math.max(2.0, Math.min(8.0, 4.0 + sineVal * 1.5 + noise(0.2)));
      temperature = Math.min(75, temperature + 0.1 + noise(0.1));
      sound = Math.max(55, 68.0 + sineVal * 5 + noise(0.5));
      voltage = 230.0 + noise(0.8);
    } else if (profile === 'voltage_fluctuation') {
      // Voltage oscillates between 190V-250V, current inverse, temp slowly rises
      const sineVal = Math.sin(stepCount * 0.3);
      voltage = Math.max(185, Math.min(255, 220.0 + sineVal * 25.0 + noise(1.5)));
      current = Math.max(1.5, Math.min(12.0, (230.0 / Math.max(180, voltage)) * 3.8 + noise(0.2)));
      temperature = Math.min(80, temperature + 0.15 + noise(0.1));
      vibration = Math.max(0.1, 0.2 + noise(0.03));
      rpm = Math.max(1100, Math.min(1550, 1460 + sineVal * 40 + noise(8)));
      sound = Math.max(55, 64.0 + noise(0.5));
    }

    // Override values if user explicitly locked/controlled them
    if (overrides.temperature !== undefined) temperature = overrides.temperature;
    if (overrides.vibration !== undefined) vibration = overrides.vibration;
    if (overrides.current !== undefined) current = overrides.current;
    if (overrides.voltage !== undefined) voltage = overrides.voltage;
    if (overrides.rpm !== undefined) rpm = overrides.rpm;
    if (overrides.sound !== undefined) sound = overrides.sound;

    return {
      temperature,
      vibration,
      current,
      voltage,
      rpm,
      sound,
    };
  }

  private static getSanitizedSession(session: ISimulationSession): ISimulationSession {
    const { timer, ...rest } = session;
    return rest as ISimulationSession;
  }
}
