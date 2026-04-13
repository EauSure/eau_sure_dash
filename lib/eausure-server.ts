import type {
  EauSureAuthResponse,
  EauSurePaginatedResponse,
  EauSureSensorData,
  EauSureStatsResponse,
} from '@/types/eausure';

const DEFAULT_BASE_URL = 'http://localhost:4000';

interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
}

const tokenState: TokenState = {
  accessToken: null,
  refreshToken: null,
};

function getBaseUrl() {
  return process.env.EAUSURE_API_URL || DEFAULT_BASE_URL;
}

function getCredentials() {
  const email = process.env.EAUSURE_API_EMAIL;
  const password = process.env.EAUSURE_API_PASSWORD;

  if (!email || !password) {
    throw new Error('EAUSURE_API_EMAIL and EAUSURE_API_PASSWORD are required');
  }

  return { email, password };
}

async function login() {
  const { email, password } = getCredentials();
  const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`EauSure login failed with status ${res.status}`);
  }

  const payload = (await res.json()) as EauSureAuthResponse;
  tokenState.accessToken = payload.accessToken;
  tokenState.refreshToken = payload.refreshToken;
}

async function refreshAccessToken() {
  if (!tokenState.refreshToken) return false;

  const res = await fetch(`${getBaseUrl()}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken: tokenState.refreshToken }),
    cache: 'no-store',
  });

  if (!res.ok) return false;

  const payload = (await res.json()) as { accessToken: string };
  tokenState.accessToken = payload.accessToken;
  return true;
}

async function ensureAccessToken() {
  if (!tokenState.accessToken) {
    await login();
  }

  return tokenState.accessToken;
}

function createUrl(path: string, params?: URLSearchParams) {
  if (!params || Array.from(params.keys()).length === 0) {
    return `${getBaseUrl()}${path}`;
  }

  return `${getBaseUrl()}${path}?${params.toString()}`;
}

async function requestWithAuth<T>(path: string, params?: URLSearchParams): Promise<T> {
  const token = await ensureAccessToken();

  const execute = async (accessToken: string | null) =>
    fetch(createUrl(path, params), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

  let res = await execute(token);

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      await login();
    }

    res = await execute(tokenState.accessToken);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `EauSure API request failed with status ${res.status}`);
  }

  return (await res.json()) as T;
}

export async function getEauSureStats(hours: string | null) {
  const params = new URLSearchParams();
  if (hours) params.set('hours', hours);

  return requestWithAuth<EauSureStatsResponse>('/api/sensor-data/stats', params);
}

export async function getEauSureLatest(deviceId: string | null) {
  const params = new URLSearchParams();
  if (deviceId) params.set('deviceId', deviceId);

  return requestWithAuth<EauSureSensorData>('/api/sensor-data/latest', params);
}

export async function getEauSureSensorData(params: URLSearchParams) {
  return requestWithAuth<EauSurePaginatedResponse | EauSureSensorData[]>('/api/sensor-data', params);
}
