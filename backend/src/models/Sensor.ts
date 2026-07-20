import mongoose, { Document, Schema } from 'mongoose';

export enum SensorType {
  TEMPERATURE = 'temperature',
  VIBRATION = 'vibration',
  CURRENT = 'current',
  VOLTAGE = 'voltage',
  RPM = 'rpm',
  SOUND = 'sound',
}

export enum SensorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAULT = 'fault',
}

export enum SamplingInterval {
  SEC_1 = '1s',
  SEC_5 = '5s',
  SEC_10 = '10s',
  SEC_30 = '30s',
  SEC_60 = '60s',
}

export interface ISensorThresholds {
  maxTemperature?: number;
  maxVibration?: number;
  maxCurrent?: number;
  minVoltage?: number;
  maxVoltage?: number;
  minRPM?: number;
  maxSound?: number;
}

export interface ISensor extends Document {
  _id: mongoose.Types.ObjectId;
  sensorName: string;
  sensorId: string;
  type: SensorType;
  unit: string;
  status: SensorStatus;
  samplingInterval: SamplingInterval;
  isEnabled: boolean;
  thresholds: ISensorThresholds;
  deviceId: mongoose.Types.ObjectId;
  machineId?: mongoose.Types.ObjectId | null;
  companyId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SensorThresholdsSchema = new Schema<ISensorThresholds>(
  {
    maxTemperature: { type: Number, default: null },
    maxVibration: { type: Number, default: null },
    maxCurrent: { type: Number, default: null },
    minVoltage: { type: Number, default: null },
    maxVoltage: { type: Number, default: null },
    minRPM: { type: Number, default: null },
    maxSound: { type: Number, default: null },
  },
  { _id: false }
);

const SensorSchema = new Schema<ISensor>(
  {
    sensorName: {
      type: String,
      required: [true, 'Sensor name is required'],
      trim: true,
    },
    sensorId: {
      type: String,
      required: [true, 'Sensor ID is required'],
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: Object.values(SensorType),
      required: [true, 'Sensor type is required'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(SensorStatus),
      default: SensorStatus.ACTIVE,
    },
    samplingInterval: {
      type: String,
      enum: Object.values(SamplingInterval),
      default: SamplingInterval.SEC_5,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    thresholds: {
      type: SensorThresholdsSchema,
      default: {},
    },
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Device',
      required: [true, 'Device ID is required'],
    },
    machineId: {
      type: Schema.Types.ObjectId,
      ref: 'Machine',
      default: null,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

SensorSchema.index({ deviceId: 1 });
SensorSchema.index({ sensorId: 1, deviceId: 1 }, { unique: true });
SensorSchema.index({ companyId: 1 });
SensorSchema.index({ machineId: 1 });

export const Sensor = mongoose.model<ISensor>('Sensor', SensorSchema);

// Standard default sensor configurations for ESP32
export const DEFAULT_ESP32_SENSORS = [
  {
    sensorName: 'Temperature Sensor (DS18B20)',
    sensorIdSuffix: 'TEMP_01',
    type: SensorType.TEMPERATURE,
    unit: '°C',
    samplingInterval: SamplingInterval.SEC_5,
    thresholds: { maxTemperature: 85 },
  },
  {
    sensorName: 'Vibration Sensor (MPU6050)',
    sensorIdSuffix: 'VIB_01',
    type: SensorType.VIBRATION,
    unit: 'm/s²',
    samplingInterval: SamplingInterval.SEC_1,
    thresholds: { maxVibration: 7.5 },
  },
  {
    sensorName: 'Current Sensor (ACS712)',
    sensorIdSuffix: 'CURR_01',
    type: SensorType.CURRENT,
    unit: 'A',
    samplingInterval: SamplingInterval.SEC_5,
    thresholds: { maxCurrent: 20 },
  },
  {
    sensorName: 'Voltage Sensor',
    sensorIdSuffix: 'VOLT_01',
    type: SensorType.VOLTAGE,
    unit: 'V',
    samplingInterval: SamplingInterval.SEC_5,
    thresholds: { minVoltage: 380, maxVoltage: 440 },
  },
  {
    sensorName: 'RPM Sensor',
    sensorIdSuffix: 'RPM_01',
    type: SensorType.RPM,
    unit: 'RPM',
    samplingInterval: SamplingInterval.SEC_1,
    thresholds: { minRPM: 1000 },
  },
  {
    sensorName: 'Sound Sensor (MAX4466)',
    sensorIdSuffix: 'SND_01',
    type: SensorType.SOUND,
    unit: 'dB',
    samplingInterval: SamplingInterval.SEC_5,
    thresholds: { maxSound: 95 },
  },
];
