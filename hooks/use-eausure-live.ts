'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IClientOptions } from 'mqtt';
import type { EauSureSensorData } from '@/types/eausure';

interface UseEauSureLiveOptions {
  pollIntervalMs?: number;
}

interface UseEauSureLiveResult {
  latest: EauSureSensorData | null;
  history: EauSureSensorData[];
  loading: boolean;
  error: string | null;
  source: 'mqtt' | 'polling';
  refresh: () => Promise<void>;
}

const DEFAULT_POLL_INTERVAL_MS = 10_000;
const MAX_HISTORY = 25;

function uniqueById(items: EauSureSensorData[]) {
  const seen = new Set<string>();
  const result: EauSureSensorData[] = [];

  for (const item of items) {
    if (!item?._id || seen.has(item._id)) continue;
    seen.add(item._id);
    result.push(item);
  }

  return result;
}

export function useEauSureLive(options?: UseEauSureLiveOptions): UseEauSureLiveResult {
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const [latest, setLatest] = useState<EauSureSensorData | null>(null);
  const [history, setHistory] = useState<EauSureSensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'mqtt' | 'polling'>('polling');

  const mqttUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_WS_URL || 'ws://broker.hivemq.com:8000/mqtt';
  const mqttTopic = process.env.NEXT_PUBLIC_MQTT_TOPIC || 'water-quality/live-data';

  const addToHistory = useCallback((entry: EauSureSensorData) => {
    setHistory((prev) => uniqueById([entry, ...prev]).slice(0, MAX_HISTORY));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/eausure/latest', { cache: 'no-store' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to fetch latest reading');
      }

      const data = (await res.json()) as EauSureSensorData;
      setLatest(data);
      addToHistory(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch latest reading';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [addToHistory]);

  useEffect(() => {
    let mounted = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let mqttClient: { end: (force?: boolean) => void } | null = null;

    const startPolling = () => {
      if (pollInterval) return;
      setSource('polling');
      void refresh();
      if (pollIntervalMs <= 0) return;
      pollInterval = setInterval(() => {
        void refresh();
      }, pollIntervalMs);
    };

    const clearPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const start = async () => {
      setLoading(true);
      await refresh();

      try {
        const mqtt = await import('mqtt');
        const client = mqtt.connect(mqttUrl, {
          reconnectPeriod: 4000,
          connectTimeout: 10_000,
        } as IClientOptions);

        mqttClient = client;

        client.on('connect', () => {
          if (!mounted) return;
          client.subscribe(mqttTopic, { qos: 1 }, (err) => {
            if (err) {
              startPolling();
              return;
            }
            clearPolling();
            setSource('mqtt');
          });
        });

        client.on('message', (_topic, message) => {
          if (!mounted) return;
          try {
            const payload = JSON.parse(message.toString()) as EauSureSensorData;
            if (!payload || !payload._id) return;
            setLatest(payload);
            addToHistory(payload);
            setError(null);
            setLoading(false);
          } catch {
            startPolling();
          }
        });

        client.on('error', () => {
          if (!mounted) return;
          startPolling();
        });

        client.on('offline', () => {
          if (!mounted) return;
          startPolling();
        });
      } catch {
        startPolling();
      }
    };

    void start();

    return () => {
      mounted = false;
      clearPolling();
      if (mqttClient) mqttClient.end(true);
    };
  }, [addToHistory, mqttTopic, mqttUrl, pollIntervalMs, refresh]);

  return useMemo(
    () => ({ latest, history, loading, error, source, refresh }),
    [latest, history, loading, error, source, refresh]
  );
}
