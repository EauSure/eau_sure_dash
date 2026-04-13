export interface EauSureAuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface EauSureStatsResponse {
  statistics: {
    avgPH: number;
    avgTDS: number;
    avgTemp: number;
    avgBattery: number;
    minPH: number;
    maxPH: number;
    minTDS: number;
    maxTDS: number;
    count: number;
  };
  events: Array<{
    _id: string;
    count: number;
  }>;
  period: string;
}

export interface EauSureSensorData {
  _id: string;
  deviceId: string;
  sequence: number;
  timestamp: string;
  receivedAt: string;
  battery: {
    percentage: number;
    voltage: number;
    current: number;
  };
  ph: {
    value: number;
    score: number;
  };
  tds: {
    value: number;
    score: number;
  };
  turbidity: {
    voltage: number;
    score: number;
  };
  temperature: {
    water: number;
    mpu: number;
    esp32: number;
  };
  event: {
    type: string;
    accelG?: number;
    dynAccelG?: number;
  };
  signal: {
    rssi: number;
    snr: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EauSurePaginatedResponse {
  data: EauSureSensorData[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
