import type { Well, Alert, Device, Gateway, DashboardKPIs, FirmwareUpdate, MaintenanceStatus } from '@/types/iot';

export const mockWells: Well[] = [
  {
    id: 'well-001',
    name: 'Deep Well Alpha',
    location: 'North Reservoir Zone',
    status: 'potable',
    lastReading: '2026-01-28T14:23:00Z',
    alertCount: 0,
    gatewayReachable: true,
    deviceId: 'buoy-001',
    currentQuality: { pH: 7.2, tds: 145, timestamp: '2026-01-28T14:23:00Z' },
    thresholds: { pH: { min: 6.5, max: 8.5 }, tds: { max: 500 } }
  },
  {
    id: 'well-002',
    name: 'Deep Well Beta',
    location: 'South Reservoir Zone',
    status: 'warning',
    lastReading: '2026-01-28T14:18:00Z',
    alertCount: 2,
    gatewayReachable: true,
    deviceId: 'buoy-002',
    currentQuality: { pH: 6.3, tds: 378, timestamp: '2026-01-28T14:18:00Z' },
    thresholds: { pH: { min: 6.5, max: 8.5 }, tds: { max: 500 } }
  },
  {
    id: 'well-003',
    name: 'Reservoir Central',
    location: 'Central Processing',
    status: 'critical',
    lastReading: '2026-01-28T13:45:00Z',
    alertCount: 5,
    gatewayReachable: true,
    deviceId: 'buoy-003',
    currentQuality: { pH: 5.8, tds: 612, timestamp: '2026-01-28T13:45:00Z' },
    thresholds: { pH: { min: 6.5, max: 8.5 }, tds: { max: 500 } }
  },
  {
    id: 'well-004',
    name: 'Deep Well Gamma',
    location: 'East Sector',
    status: 'potable',
    lastReading: '2026-01-28T14:20:00Z',
    alertCount: 0,
    gatewayReachable: false,
    deviceId: 'buoy-004',
    currentQuality: { pH: 7.4, tds: 198, timestamp: '2026-01-28T14:20:00Z' },
    thresholds: { pH: { min: 6.5, max: 8.5 }, tds: { max: 500 } }
  }
];

export const mockAlerts: Alert[] = [
  {
    id: 'alert-001',
    type: 'fall',
    severity: 'critical',
    message: 'Critical fall detected - MPU6050 motion signature triggered emergency alert',
    timestamp: '2026-01-28T13:45:12Z',
    wellId: 'well-003',
    wellName: 'Reservoir Central',
    acknowledged: false
  },
  {
    id: 'alert-002',
    type: 'water',
    severity: 'critical',
    message: 'TDS exceeded critical threshold (612 ppm > 500 ppm)',
    timestamp: '2026-01-28T13:45:00Z',
    wellId: 'well-003',
    wellName: 'Reservoir Central',
    acknowledged: false
  },
  {
    id: 'alert-003',
    type: 'water',
    severity: 'warning',
    message: 'pH below acceptable range (6.3 < 6.5)',
    timestamp: '2026-01-28T14:18:00Z',
    wellId: 'well-002',
    wellName: 'Deep Well Beta',
    acknowledged: true,
    acknowledgedBy: 'admin@system.local',
    acknowledgedAt: '2026-01-28T14:25:00Z'
  },
  {
    id: 'alert-004',
    type: 'device',
    severity: 'warning',
    message: 'Gateway link quality degraded (RSSI: -118 dBm)',
    timestamp: '2026-01-28T12:30:00Z',
    wellId: 'well-004',
    wellName: 'Deep Well Gamma',
    acknowledged: true,
    acknowledgedBy: 'admin@system.local',
    acknowledgedAt: '2026-01-28T13:00:00Z'
  },
  {
    id: 'alert-005',
    type: 'water',
    severity: 'info',
    message: 'Scheduled water quality measurement completed',
    timestamp: '2026-01-28T14:23:00Z',
    wellId: 'well-001',
    wellName: 'Deep Well Alpha',
    acknowledged: true,
    acknowledgedBy: 'system',
    acknowledgedAt: '2026-01-28T14:23:00Z'
  }
];

export const mockDevices: Device[] = [
  {
    id: 'buoy-001',
    wellId: 'well-001',
    state: 'sleeping',
    firmwareVersion: 'v2.4.1',
    batteryEstimateYears: 8.2,
    lastUplink: '2026-01-28T14:23:15Z',
    nextScheduledMeasure: '2026-01-28T20:00:00Z',
    sleepSchedule: '6h periodic + event-driven',
    lastWakeReason: 'scheduled'
  },
  {
    id: 'buoy-002',
    wellId: 'well-002',
    state: 'sleeping',
    firmwareVersion: 'v2.4.1',
    batteryEstimateYears: 7.5,
    lastUplink: '2026-01-28T14:18:22Z',
    nextScheduledMeasure: '2026-01-28T20:00:00Z',
    sleepSchedule: '6h periodic + event-driven',
    lastWakeReason: 'scheduled'
  },
  {
    id: 'buoy-003',
    wellId: 'well-003',
    state: 'awake',
    firmwareVersion: 'v2.4.0',
    batteryEstimateYears: 6.8,
    lastUplink: '2026-01-28T13:45:12Z',
    nextScheduledMeasure: '2026-01-28T14:45:00Z',
    sleepSchedule: '6h periodic + event-driven',
    lastWakeReason: 'motion'
  },
  {
    id: 'buoy-004',
    wellId: 'well-004',
    state: 'offline',
    firmwareVersion: 'v2.3.2',
    batteryEstimateYears: 9.1,
    lastUplink: '2026-01-28T10:15:00Z',
    nextScheduledMeasure: '2026-01-28T16:00:00Z',
    sleepSchedule: '6h periodic + event-driven',
    lastWakeReason: 'scheduled'
  }
];

export const mockGateways: Gateway[] = [
  {
    id: 'gw-001',
    name: 'Gateway North',
    status: 'online',
    lastHeartbeat: '2026-01-28T14:28:00Z',
    connectedDevices: 2,
    totalDevices: 2,
    averageRSSI: -95,
    averageSNR: 8.5,
    packetLossPercent: 1.2,
    uplinkCount24h: 48
  },
  {
    id: 'gw-002',
    name: 'Gateway South',
    status: 'online',
    lastHeartbeat: '2026-01-28T14:27:00Z',
    connectedDevices: 1,
    totalDevices: 1,
    averageRSSI: -102,
    averageSNR: 6.2,
    packetLossPercent: 2.8,
    uplinkCount24h: 36
  },
  {
    id: 'gw-003',
    name: 'Gateway East',
    status: 'degraded',
    lastHeartbeat: '2026-01-28T14:10:00Z',
    connectedDevices: 0,
    totalDevices: 1,
    averageRSSI: -118,
    averageSNR: 2.1,
    packetLossPercent: 15.4,
    uplinkCount24h: 12
  }
];

export const mockKPIs: DashboardKPIs = {
  totalWells: 4,
  potableCount: 2,
  warningCount: 1,
  criticalCount: 1,
  activeAlerts: 2,
  gatewaysOnline: 2,
  totalGateways: 3,
  averageBatteryYears: 7.9
};

export const mockFirmware: FirmwareUpdate = {
  currentVersion: 'v2.4.1',
  availableVersion: 'v2.5.0',
  releaseNotes: 'Enhanced anti-fouling algorithms, improved deep-sleep efficiency, FUOTA stability improvements',
  rolloutPercentage: 25,
  devicesUpdated: 1,
  totalDevices: 4
};

export const mockMaintenance: MaintenanceStatus = {
  antiFoulingActive: true,
  lastAntiFoulingCycle: '2026-01-27T08:00:00Z',
  probeHealth: 'good',
  nextCalibrationDue: '2026-03-15T00:00:00Z',
  lastCalibration: '2025-12-15T00:00:00Z'
};
