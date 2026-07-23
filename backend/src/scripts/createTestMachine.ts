import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import mongoose from 'mongoose';
import { Machine, MachineStatus, AILifecycleStatus, DataSourcePreference } from '../models/Machine';
import { Company } from '../models/Company';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://Aakash:sentinel@database1.vsmdyho.mongodb.net/?appName=DataBase1';

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully.');

    // 1. Find or create a default Company
    let company = await Company.findOne({}).exec();
    if (!company) {
      company = await Company.create({
        name: 'SentinelX Industrial Systems',
        code: 'SENTINEL-HQ',
        email: 'info@sentinelx-industrial.com',
        contactNumber: '+1-800-555-0199',
        address: '100 Industrial Parkway',
        city: 'Detroit',
        state: 'Michigan',
        country: 'United States',
        industryType: 'Manufacturing',
        plan: 'enterprise',
      });
      console.log('Created default company:', company._id);
    } else {
      console.log('Using existing company:', company.name, '(', company._id, ')');
    }

    // 2. Check if test machine already exists
    const existingMachine = await Machine.findOne({ machineCode: 'CENTRIFUGAL-PUMP-X1' }).exec();

    if (existingMachine) {
      console.log('Test Machine already exists!');
      console.log('----------------------------------------------------');
      console.log('MACHINE ID   :', existingMachine._id.toString());
      console.log('MACHINE CODE :', existingMachine.machineCode);
      console.log('NAME         :', existingMachine.name);
      console.log('INSTALLED AT :', existingMachine.installationDate);
      console.log('OPERATING LIMITS :', JSON.stringify(existingMachine.operatingLimits, null, 2));
      console.log('----------------------------------------------------');
      await mongoose.disconnect();
      return;
    }

    // 3. Create new Machine with rated specifications and installation date
    const machine = await Machine.create({
      machineCode: 'CENTRIFUGAL-PUMP-X1',
      name: 'High-Pressure Centrifugal Pump X1',
      type: 'Pump',
      manufacturer: 'Siemens Industrial',
      modelNumber: 'CP-X1-4000',
      serialNumber: 'SN-2025-99482',
      installationDate: new Date('2025-01-15T00:00:00Z'),
      commissioningDate: new Date('2025-02-01T00:00:00Z'),
      lastMaintenanceDate: new Date('2026-01-10T00:00:00Z'),
      status: MachineStatus.ACTIVE,
      aiLifecycleStatus: AILifecycleStatus.REGISTERED,
      dataSourcePreference: DataSourcePreference.UPLOAD_HISTORICAL,
      ratedVoltage: 230,
      ratedCurrent: 10,
      ratedRPM: 1500,
      ratedTemperature: 45,
      ratedPower: 15,
      operatingLimits: {
        maxTemperature: 80,
        maxVibration: 2.5,
        maxCurrent: 15,
        minRPM: 1000,
        failureTemperature: 100,
        failureVibration: 3.5,
        failureCurrent: 20,
      },
      companyId: company._id,
      createdBy: new mongoose.Types.ObjectId(),
      tags: ['Critical', 'Water Treatment', 'High Pressure'],
    });

    console.log('Successfully created test machine:');
    console.log('----------------------------------------------------');
    console.log('MACHINE ID   :', machine._id.toString());
    console.log('MACHINE CODE :', machine.machineCode);
    console.log('NAME         :', machine.name);
    console.log('INSTALLED AT :', machine.installationDate);
    console.log('OPERATING LIMITS :', JSON.stringify(machine.operatingLimits, null, 2));
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error seeding test machine:', err);
    process.exit(1);
  }
}

seed();
