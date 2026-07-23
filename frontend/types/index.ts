export type UserRole =
  | 'super_admin'
  | 'company_admin'
  | 'maintenance_engineer'
  | 'machine_operator';

export interface User {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profilePicture?: string | null;
  phoneNumber?: string | null;
  companyId: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  _id: string;
  id: string;
  name: string;
  industryType: string;
  email: string;
  contactNumber: string;
  address: string;
  country: string;
  state: string;
  city: string;
  logo?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Auth Types ──────────────────────────────────────────────────────────────

export interface RegisterCompanyData {
  name: string;
  industryType: string;
  email: string;
  contactNumber: string;
  address: string;
  country: string;
  state: string;
  city: string;
}

export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

export interface RegisterPayload {
  company: RegisterCompanyData;
  user: RegisterUserData;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  user: User;
  company: Company;
  accessToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
  errors?: Array<{ field: string; message: string }>;
}

// ─── Update Types ─────────────────────────────────────────────────────────────

export interface UpdateProfilePayload {
  name?: string;
  phoneNumber?: string;
}

export interface UpdateCompanyPayload {
  name?: string;
  industryType?: string;
  email?: string;
  contactNumber?: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
}

// ─── Activity Types ───────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  type: 'login' | 'settings_change' | 'company_update' | 'password_change';
  message: string;
  timestamp: string;
  user?: string;
}

// ─── Machine Types ────────────────────────────────────────────────────────────

export type MachineStatus = 'active' | 'idle' | 'maintenance' | 'offline' | 'fault';

export type AILifecycleStatus =
  | 'registered'
  | 'collecting_data'
  | 'ready_for_training'
  | 'training'
  | 'ai_ready'
  | 'retraining_recommended';

export type DataSourcePreference = 'upload_historical' | 'collect_live';

export interface LiveDataCollection {
  collectedSampleCount: number;
  collectionStartDate?: string | null;
  lastReadingTimestamp?: string | null;
  recommendedSamplesThreshold: number;
  newSamplesSinceLastTraining: number;
}

export interface MachineOperatingLimits {
  maxTemperature?: number;
  maxVibration?: number;
  maxCurrent?: number;
  minRPM?: number;
  failureTemperature?: number;
  failureVibration?: number;
  failureCurrent?: number;
}

export interface Machine {
  _id: string;
  id: string;
  uuid: string;
  machineCode: string;
  name: string;
  type: string;
  manufacturer?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  manufacturingYear?: number | null;
  installationDate?: string | null;
  commissioningDate?: string | null;
  lastMaintenanceDate?: string | null;
  lastMajorOverhaulDate?: string | null;
  plant?: string | null;
  department?: string | null;
  location?: string | null;
  status: MachineStatus;
  aiLifecycleStatus?: AILifecycleStatus;
  dataSourcePreference?: DataSourcePreference;
  isRecording?: boolean;
  liveDataCollection?: LiveDataCollection;
  ratedRPM?: number | null;
  ratedVoltage?: number | null;
  ratedCurrent?: number | null;
  ratedTemperature?: number | null;
  ratedPower?: number | null;
  ratedSound?: number | null;
  ratedVibration?: number | null;
  operatingLimits?: MachineOperatingLimits;
  description?: string | null;
  image?: string | null;
  tags: string[];
  companyId: string;
  createdBy: { _id: string; name: string; email?: string } | string;
  createdAt: string;
  updatedAt: string;
}

export type SimulationProfile =
  | 'normal_operation'
  | 'bearing_failure'
  | 'motor_overload'
  | 'loose_belt'
  | 'voltage_fluctuation'
  | 'custom';

export interface SimulationOverride {
  temperature?: number;
  vibration?: number;
  current?: number;
  voltage?: number;
  rpm?: number;
  sound?: number;
}

export interface SimulationSession {
  machineId: string;
  deviceId: string;
  companyId: string;
  profile: SimulationProfile;
  speed: number;
  isPaused: boolean;
  stepCount: number;
  overrides: SimulationOverride;
  currentValues: {
    temperature: number;
    vibration: number;
    current: number;
    voltage: number;
    rpm: number;
    sound: number;
  };
}

export interface MachineStats {
  total: number;
  active: number;
  idle: number;
  maintenance: number;
  offline: number;
  fault: number;
}

export interface CreateMachinePayload {
  machineCode: string;
  name: string;
  type: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  manufacturingYear?: number;
  installationDate?: string;
  commissioningDate?: string;
  lastMaintenanceDate?: string;
  plant?: string;
  department?: string;
  location?: string;
  status?: MachineStatus;
  ratedRPM?: number;
  ratedVoltage?: number;
  ratedCurrent?: number;
  ratedTemperature?: number;
  ratedPower?: number;
  operatingLimits?: MachineOperatingLimits;
  description?: string;
  tags?: string[];
}

export type UpdateMachinePayload = Partial<CreateMachinePayload>;

export interface MachinesQueryParams {
  search?: string;
  type?: string;
  status?: MachineStatus;
  plant?: string;
  department?: string;
  sortBy?: 'name' | 'createdAt' | 'installationDate';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export type DeviceStatus = 'online' | 'offline' | 'maintenance';

export type SensorType = 'temperature' | 'vibration' | 'current' | 'voltage' | 'rpm' | 'sound';

export type SensorStatus = 'active' | 'inactive' | 'fault';

export type SamplingInterval = '1s' | '5s' | '10s' | '30s' | '60s';

export interface SensorThresholds {
  maxTemperature?: number | null;
  maxVibration?: number | null;
  maxCurrent?: number | null;
  minVoltage?: number | null;
  maxVoltage?: number | null;
  minRPM?: number | null;
  maxSound?: number | null;
}

export interface Sensor {
  _id: string;
  sensorName: string;
  sensorId: string;
  type: SensorType;
  unit: string;
  status: SensorStatus;
  samplingInterval: SamplingInterval;
  isEnabled: boolean;
  thresholds: SensorThresholds;
  deviceId: string;
  machineId?: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  _id: string;
  id: string;
  uuid: string;
  name: string;
  deviceId: string;
  type: string;
  firmwareVersion?: string;
  macAddress?: string | null;
  serialNumber?: string | null;
  status: DeviceStatus;
  lastSeen?: string | null;
  machineId?: {
    _id: string;
    name: string;
    machineCode: string;
    plant?: string | null;
    department?: string | null;
    status?: string;
  } | string | null;
  companyId: string;
  description?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  maintenance: number;
}

export interface CreateDevicePayload {
  name: string;
  deviceId: string;
  type?: string;
  firmwareVersion?: string;
  macAddress?: string;
  serialNumber?: string;
  status?: DeviceStatus;
  machineId?: string | null;
  description?: string;
}

export type UpdateDevicePayload = Partial<CreateDevicePayload>;

export interface DevicesQueryParams {
  search?: string;
  status?: DeviceStatus;
  machineId?: string;
  sortBy?: 'name' | 'createdAt' | 'lastSeen';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface UpdateSensorPayload {
  sensorName?: string;
  status?: SensorStatus;
  samplingInterval?: SamplingInterval;
  isEnabled?: boolean;
  thresholds?: Partial<SensorThresholds>;
}

export interface MachineFilterOptions {
  types: string[];
  plants: string[];
  departments: string[];
}
