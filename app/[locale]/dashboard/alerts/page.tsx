'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Bell, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/useT';
import type { EauSurePaginatedResponse, EauSureSensorData } from '@/types/eausure';

type FeedSeverity = 'Critical' | 'Warning' | 'Info';

function deriveSeverity(item: EauSureSensorData): FeedSeverity {
  const eventType = item.event.type || 'None';
  if (eventType === 'ALARM_SHAKE') return 'Critical';
  if (item.ph.value < 6.5 || item.ph.value > 8.5 || item.tds.value > 500) return 'Critical';
  if (eventType !== 'None') return 'Warning';
  return 'Info';
}

export default function AlertsPage() {
  const t = useT('alerts');
  const [feed, setFeed] = useState<EauSureSensorData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      const res = await fetch(`/api/eausure/sensor-data?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : `HTTP ${res.status}`);
      }

      const payload = (await res.json()) as EauSurePaginatedResponse | EauSureSensorData[];
      const list = Array.isArray(payload) ? payload : payload.data;
      setFeed(list.filter((item) => item.event.type !== 'None'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load alerts';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFeed();
    const interval = setInterval(() => {
      void fetchFeed();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const critical = feed.filter((item) => deriveSeverity(item) === 'Critical').length;
    const warning = feed.filter((item) => deriveSeverity(item) === 'Warning').length;

    return {
      critical,
      warning,
      total: feed.length,
    };
  }, [feed]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0 }}>
          <div className="mb-6 flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-400">EauSure · Alerts</p>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{t('title')}</h1>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">{t('description')}</p>
          </div>
          <Button variant="outline" size="sm" className="active:scale-95 transition-transform duration-100" onClick={() => void fetchFeed()}>
            Refresh alerts
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.07 }}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: t('criticalAlerts'), value: String(stats.critical), pct: stats.total ? Math.round((stats.critical / stats.total) * 100) : 0 },
              { label: t('warnings'), value: String(stats.warning), pct: stats.total ? Math.round((stats.warning / stats.total) * 100) : 0 },
              { label: t('totalActive'), value: String(stats.total), pct: 100 },
              { label: 'Critical Ratio', value: `${stats.total ? Math.round((stats.critical / stats.total) * 100) : 0}%`, pct: stats.total ? Math.round((stats.critical / stats.total) * 100) : 0 },
            ].map((card) => (
              <div key={card.label} className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
                <div className="flex flex-col gap-3 py-5 ps-6 pe-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{card.label}</span>
                  <span className="text-3xl font-black leading-none text-gray-900 dark:text-foreground">{card.value}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-muted">
                      <div className="h-full rounded-full bg-red-400 transition-all duration-700" style={{ width: `${card.pct}%` }} />
                    </div>
                    <span className="whitespace-nowrap text-[10px] font-medium text-gray-400">{card.pct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.14 }}>
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
            <div className="py-5 ps-6 pe-5">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Monitoring</span>
                  <span className="text-base font-bold text-gray-900 dark:text-foreground">{t('feed')}</span>
                </div>
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading alerts...</p>
          ) : (
            <div className="-mx-6 overflow-x-auto px-0">
              <Table className="min-w-190 text-sm">
              <TableHeader>
                <TableRow className="border-y border-gray-100 bg-gray-50/80 dark:border-border dark:bg-muted/30">
                  <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">ID</TableHead>
                  <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Type</TableHead>
                  <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Device</TableHead>
                  <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Message</TableHead>
                  <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Time</TableHead>
                  <TableHead className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feed.map((alert) => {
                  const severity = deriveSeverity(alert);
                  const eventType = alert.event.type || 'Unknown';
                  const message = `${eventType} | pH ${alert.ph.value.toFixed(2)} | TDS ${alert.tds.value}`;

                  return (
                    <TableRow key={alert._id} className="cursor-pointer border-b border-gray-50 transition-colors duration-100 hover:bg-blue-50/30 dark:border-border/40 dark:hover:bg-primary/5">
                      <TableCell className="px-6 py-4 font-medium text-gray-700 dark:text-foreground">{alert.sequence}</TableCell>
                      <TableCell className="px-6 py-4 text-gray-700 dark:text-foreground">{eventType}</TableCell>
                      <TableCell className="px-6 py-4 text-gray-700 dark:text-foreground">{alert.deviceId}</TableCell>
                      <TableCell className="px-6 py-4 text-gray-700 dark:text-foreground">{message}</TableCell>
                      <TableCell className="px-6 py-4 text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Badge className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          severity === 'Critical'
                            ? 'border border-red-100 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                            : 'border border-amber-100 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                        )}>
                          {severity === 'Critical' ? (
                            <ShieldAlert className="me-1 h-3 w-3" />
                          ) : (
                            <AlertTriangle className="me-1 h-3 w-3" />
                          )}
                          {severity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
