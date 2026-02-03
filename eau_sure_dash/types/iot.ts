export type WaterStatus = 'potable' | 'warning' | 'critical';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType = 'water' | 'fall' | 'device';
export type DeviceState = 'sleeping' | 'awake' | 'offline';
export type GatewayStatus = 'online' | 'offline' | 'degraded';

export interface WaterQuality {
  pH: number;
  tds: number;
  timestamp: string;
}

export interface WaterThresholds {
  pH: { min: number; max: number };
  tds: { max: number };
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  wellId: string;
  wellName: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface Device {
  id: string;
  wellId: string;
  state: DeviceState;
  firmwareVersion: string;
  batteryEstimateYears: number;
  lastUplink: string;
  nextScheduledMeasure: string;
  sleepSchedule: string;
  lastWakeReason: 'scheduled' | 'motion' | 'manual';
}

export interface Well {
  id: string;
  name: string;
  location: string;
  status: WaterStatus;
  lastReading: string;
  alertCount: number;
  gatewayReachable: boolean;
  deviceId: string;
  currentQuality: WaterQuality;
  thresholds: WaterThresholds;
}

export interface Gateway {
  id: string;
  name: string;
  status: GatewayStatus;
  lastHeartbeat: string;
  connectedDevices: number;
  totalDevices: number;
  averageRSSI: number;
  averageSNR: number;
  packetLossPercent: number;
  uplinkCount24h: number;
}

export interface FirmwareUpdate {
  currentVersion: string;
  availableVersion: string;
  releaseNotes: string;
  rolloutPercentage: number;
  devicesUpdated: number;
  totalDevices: number;
}

export interface MaintenanceStatus {
  antiFoulingActive: boolean;
  lastAntiFoulingCycle: string;
  probeHealth: 'good' | 'degraded' | 'poor';
  nextCalibrationDue: string;
  lastCalibration: string;
}

export interface DashboardKPIs {
  totalWells: number;
  potableCount: number;
  warningCount: number;
  criticalCount: number;
  activeAlerts: number;
  gatewaysOnline: number;
  totalGateways: number;
  averageBatteryYears: number;
}
