import 'dotenv/config';
import mqtt from 'mqtt';
import mongoose from 'mongoose';
import dns from 'dns';
import { env } from '../config/env';
import { Device, DeviceStatus } from '../models/Device';
import { Company } from '../models/Company';
import { Machine } from '../models/Machine';

// Bypasses local DNS resolution limitations on Windows/VPNs
dns.setServers(['8.8.8.8', '1.1.1.1']);

/**
 * ESP32 Hardware Simulator for SentinelX
 * Simulates real-time sensor measurements (Temperature, Vibration, Current, Voltage, RPM, Sound)
 * Usage: npx tsx src/utils/mqttTestPublisher.ts [deviceId]
 */
async function runSimulator() {
  const customDeviceId = process.argv[2];

  let targetDeviceId = customDeviceId || 'ESP001';
  let targetCompanyId: string | null = null;
  let assignedMachineId: string | null = null;

  // Connect to MongoDB to find or create an active device
  if (env.MONGODB_URI) {
    try {
      console.log('🔍 Connecting to MongoDB to query device configuration...');
      await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

      let device = null;

      if (customDeviceId) {
        device = await Device.findOne({ deviceId: { $regex: new RegExp(`^${customDeviceId}$`, 'i') } }).exec();
      } else {
        // Prefer a device assigned to a machine
        device = await Device.findOne({ machineId: { $ne: null } }).exec();
        if (!device) {
          device = await Device.findOne().exec();
        }
      }

      // If device found in DB, use its deviceId and companyId
      if (device) {
        targetDeviceId = device.deviceId;
        targetCompanyId = device.companyId.toString();
        assignedMachineId = device.machineId ? device.machineId.toString() : null;

        console.log(`\n==================================================`);
        console.log(`✅ Found Registered Device in Database:`);
        console.log(`   Device Name : ${device.name}`);
        console.log(`   Device ID   : ${device.deviceId}`);
        console.log(`   Company ID  : ${targetCompanyId}`);
        console.log(`   Machine ID  : ${assignedMachineId || 'UNASSIGNED ⚠️'}`);
        if (!assignedMachineId) {
          console.log(`👉 TIP: Assign this device to a machine on your Frontend (Machine Detail -> Assign Device) so live cards update!`);
        }
        console.log(`==================================================\n`);
      } else {
        // No device found — find existing company and auto-create ESP001 device!
        const existingCompany = await Company.findOne().exec();
        if (existingCompany) {
          targetCompanyId = existingCompany._id.toString();
          const firstMachine = await Machine.findOne({ companyId: existingCompany._id }).exec();

          const newDevice = await Device.create({
            name: `ESP32 Telemetry Device (${targetDeviceId})`,
            deviceId: targetDeviceId,
            type: 'ESP32 Gateway',
            status: DeviceStatus.ONLINE,
            companyId: existingCompany._id,
            machineId: firstMachine ? firstMachine._id : null,
            createdBy: existingCompany._id, // fallback ID
            firmwareVersion: 'v2.4.1',
            macAddress: '24:6F:28:AB:CD:EF',
          });

          if (firstMachine) {
            console.log(`🔗 Auto-linked device to machine: ${firstMachine.name} (${firstMachine.machineCode})`);
          }

          assignedMachineId = firstMachine ? firstMachine._id.toString() : null;

          console.log(`\n==================================================`);
          console.log(`✨ AUTO-REGISTERED NEW DEVICE IN MONGO DB:`);
          console.log(`   Device Name : ${newDevice.name}`);
          console.log(`   Device ID   : ${newDevice.deviceId}`);
          console.log(`   Company ID  : ${targetCompanyId}`);
          console.log(`   Machine     : ${firstMachine ? `${firstMachine.name} (${firstMachine.machineCode})` : 'None'}`);
          console.log(`==================================================\n`);
        }
      }

      await mongoose.disconnect();
    } catch (err: any) {
      console.warn(`⚠️ Could not query MongoDB (${err.message || err}). Using fallback device settings.`);
    }
  }

  // Fallback default company ID if MongoDB was empty
  if (!targetCompanyId) {
    targetCompanyId = '660000000000000000000001';
  }

  const topic = `company/${targetCompanyId}/device/${targetDeviceId}`;
  const brokerUrl = env.MQTT_URL;

  console.log(`🚀 Starting ESP32 Hardware Telemetry Simulator...`);
  console.log(`📡 Connecting to MQTT Broker: ${brokerUrl}`);
  console.log(`🎯 Target Topic: ${topic}\n`);

  const client = mqtt.connect(brokerUrl, {
    rejectUnauthorized: false,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    console.log(`✅ ESP32 Simulator connected to MQTT broker!`);
    console.log(`⚡ Publishing simulated sensor payload every 3 seconds...\n`);

    setInterval(() => {
      const payload = {
        deviceId: targetDeviceId,
        timestamp: new Date().toISOString(),
        temperature: +(38 + Math.random() * 14).toFixed(2),
        vibration: +(0.1 + Math.random() * 0.25).toFixed(3),
        current: +(2.2 + Math.random() * 1.5).toFixed(2),
        voltage: +(228 + Math.random() * 8).toFixed(1),
        rpm: Math.floor(1450 + Math.random() * 120),
        sound: Math.floor(60 + Math.random() * 12),
      };

      client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          console.error('❌ MQTT Publish Error:', err);
        } else {
          console.log(`[${new Date().toLocaleTimeString()}] 📡 ESP32 Payload Sent -> ${topic}`);
          console.log(`   Temp: ${payload.temperature}°C | Current: ${payload.current}A | Voltage: ${payload.voltage}V | RPM: ${payload.rpm}\n`);
        }
      });
    }, 3000);
  });

  client.on('error', (err) => {
    console.error('❌ MQTT Broker Connection Error:', err.message || err);
  });
}

runSimulator();
