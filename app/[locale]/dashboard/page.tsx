'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TimezoneClockWidget } from '@/components/ui/TimezoneClockWidget';
import {
  Activity,
  AlertTriangle,
  Cpu,
  Battery,
  History,
} from 'lucide-react';
import { useEauSureLive } from '@/hooks/use-eausure-live';
import { useT } from '@/lib/useT';
import { useDateFormat } from '@/lib/hooks/useDateFormat';
import { useTimeFormat } from '@/lib/hooks/useTimeFormat';
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider';
import type { EauSureSensorData, EauSureStatsResponse } from '@/types/eausure';

function statusFromReading(reading: EauSureSensorData | null) {
  if (!reading) return 'No data';
  const ph = reading.ph.value;
  const tds = reading.tds.value;

  if (ph < 6.5 || ph > 8.5 || tds > 500) return 'Critical';
  if (ph < 6.8 || ph > 8.2 || tds > 350) return 'Warning';
  return 'Stable';
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const t = useT('dashboard');
  const locale = useLocale();
  const { preferences } = useUserPreferences();
  const { formatDate } = useDateFormat();
  const { formatTime } = useTimeFormat();
  const { latest, history, loading, error, source, refresh } = useEauSureLive({
    pollIntervalMs: preferences.sensorRefreshRate * 1000,
  });
  const [stats, setStats] = useState<EauSureStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const overviewRef = useRef<HTMLDivElement | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);
  const alertsRef = useRef<HTMLDivElement | null>(null);
  const devicesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/${locale}/auth/signin`);
    }
  }, [locale, status, router]);

  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const res = await fetch('/api/eausure/stats?hours=24', { cache: 'no-store' });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(typeof payload?.error === 'string' ? payload.error : `HTTP ${res.status}`);
        }

        const payload = (await res.json()) as EauSureStatsResponse;
        setStats(payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch dashboard stats';
        toast.error(message);
      } finally {
        setStatsLoading(false);
      }
    };

    void loadStats();
  }, []);

  useEffect(() => {
    const sectionRefs = {
      overview: overviewRef,
      live: liveRef,
      alerts: alertsRef,
      devices: devicesRef,
    };
    const target = sectionRefs[preferences.dashboardDefaultTab]?.current;
    target?.scrollIntoView({ block: 'start', behavior: preferences.reducedMotion ? 'auto' : 'smooth' });
  }, [preferences.dashboardDefaultTab, preferences.reducedMotion]);

  const historyRows = useMemo(() => {
    return history.slice(0, 8).map((entry) => {
      const eventType = entry.event.type || 'None';
      const severity =
        eventType !== 'None' ? 'Warning' : entry.tds.value > 500 || entry.ph.value < 6.5 || entry.ph.value > 8.5 ? 'Warning' : 'Normal';

      return {
        id: entry._id,
        timestamp: `${formatDate(entry.timestamp)} ${formatTime(entry.timestamp)}`,
        event: eventType === 'None' ? `Reading pH ${entry.ph.value.toFixed(2)}, TDS ${entry.tds.value}` : eventType,
        status: severity,
      };
    });
  }, [formatDate, formatTime, history]);

  const rangeCards = useMemo(
    () => ({
      hour: {
        quality: statusFromReading(latest),
        activeDevices: latest ? '1' : '0',
        alerts: String(
          history.filter((item) => item.event.type !== 'None').length || (statusFromReading(latest) === 'Critical' ? 1 : 0)
        ),
        battery: latest ? `${Math.round(latest.battery.percentage)}%` : '-',
      },
      week: {
        quality: statusFromReading(latest),
        activeDevices: latest ? '1' : '0',
        alerts: String(stats?.events?.reduce((sum, item) => sum + item.count, 0) ?? 0),
        battery: stats ? `${Math.round(stats.statistics.avgBattery)}% avg` : '-',
      },
      month: {
        quality: statusFromReading(latest),
        activeDevices: latest ? '1' : '0',
        alerts: String(stats?.events?.reduce((sum, item) => sum + item.count, 0) ?? 0),
        battery: stats ? `${Math.round(stats.statistics.avgBattery)}% avg` : '-',
      },
    }),
    [history, latest, stats]
  );

  if (status === 'loading' || !session) {
    return null;
  }

  const activeCount = Number(rangeCards.month.activeDevices || '0');
  const totalCount = Math.max(1, history.length > 0 ? 1 : 1);
  const activePct = Math.max(0, Math.min(100, Math.round((activeCount / totalCount) * 100)));
  const alertCount = Number(rangeCards.month.alerts || '0');
  const alertPct = Math.max(0, Math.min(100, Math.round((alertCount / Math.max(history.length || 1, 1)) * 100)));
  const batteryPct = latest ? Math.max(0, Math.min(100, Math.round(latest.battery.percentage))) : 0;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0 }}>
          <div ref={overviewRef} className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">EauSure · Overview</p>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{t('title')}</h1>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">
                {t('title')}: Visualize dashboard, review history, and track performance.
              </p>
            </div>
            <div className="min-h-22 min-w-62 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:border-border dark:bg-card">
              <TimezoneClockWidget timezone={preferences.timezone} locale={locale} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {preferences.sensorRefreshRate === 0
                ? 'Auto-refresh paused'
                : source === 'mqtt'
                  ? 'Live source: MQTT'
                  : `Refreshing every ${preferences.sensorRefreshRate}s`}
            </span>
            <Button variant="outline" size="sm" className="active:scale-95 transition-transform duration-100" onClick={() => void refresh()}>
              {preferences.sensorRefreshRate === 0 ? 'Refresh now' : 'Refresh latest'}
            </Button>
          </div>
        </motion.div>

        <motion.div ref={devicesRef} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.07 }}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                label: t('kpi.waterStatus'),
                value: rangeCards.month.quality,
                sublabel: 'quality',
                percentage: rangeCards.month.quality === 'Stable' ? 92 : rangeCards.month.quality === 'Warning' ? 58 : 31,
                icon: Activity,
                accent: 'bg-blue-500',
                iconBg: 'bg-blue-50 dark:bg-primary/10',
                iconColor: 'text-blue-600 dark:text-primary',
              },
              {
                label: 'Active Devices',
                value: rangeCards.month.activeDevices,
                sublabel: `${activePct}%`,
                percentage: activePct,
                icon: Cpu,
                accent: 'bg-emerald-400',
                iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
                iconColor: 'text-emerald-600 dark:text-emerald-400',
              },
              {
                label: t('kpi.activeAlerts'),
                value: rangeCards.month.alerts,
                sublabel: `${alertPct}%`,
                percentage: alertPct,
                icon: AlertTriangle,
                accent: 'bg-amber-400',
                iconBg: 'bg-amber-50 dark:bg-amber-500/10',
                iconColor: 'text-amber-600 dark:text-amber-400',
              },
              {
                label: 'Battery Health',
                value: rangeCards.month.battery,
                sublabel: `${batteryPct}%`,
                percentage: batteryPct,
                icon: Battery,
                accent: 'bg-blue-500',
                iconBg: 'bg-blue-50 dark:bg-primary/10',
                iconColor: 'text-blue-600 dark:text-primary',
              },
            ].map((item, index) => (
              <motion.div
                key={`${item.label}-${index}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.14 + index * 0.07 }}
                whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                whileTap={{ y: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card"
              >
                <div className="flex flex-col gap-3 py-5 ps-6 pe-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{item.label}</span>
                    <div className={cn('rounded-lg p-1.5 transition-transform duration-200 group-hover:scale-110', item.iconBg)}>
                      <item.icon className={cn('h-3.5 w-3.5', item.iconColor)} />
                    </div>
                  </div>
                  <span className="text-3xl font-black leading-none text-gray-900 dark:text-foreground">{item.value}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-muted">
                      <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${item.percentage}%` }} />
                    </div>
                    <span className="whitespace-nowrap text-[10px] font-medium text-gray-400">{item.sublabel}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {(loading || statsLoading) && (
          <p className="text-sm text-muted-foreground">Loading live dashboard data...</p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <motion.div ref={liveRef} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.28 }}>
          <Tabs defaultValue="month" className="space-y-4">
            <TabsList className="rounded-xl border border-gray-200 bg-white dark:border-border dark:bg-muted/30">
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="hour">Hour</TabsTrigger>
            </TabsList>

            {(['month', 'week', 'hour'] as const).map((rangeKey) => (
              <TabsContent key={rangeKey} value={rangeKey}>
                <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
                  <div className="py-5 ps-6 pe-5">
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Trend window</span>
                        <span className="text-base font-bold text-gray-900 dark:text-foreground">{rangeKey} trend summary</span>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-border dark:bg-muted/20">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{t('kpi.waterStatus')}</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-foreground">{rangeCards[rangeKey].quality}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-border dark:bg-muted/20">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Active devices</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-foreground">{rangeCards[rangeKey].activeDevices}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-border dark:bg-muted/20">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{t('kpi.activeAlerts')}</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-foreground">{rangeCards[rangeKey].alerts}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-border dark:bg-muted/20">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Battery health</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-foreground">{rangeCards[rangeKey].battery}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>

        <motion.div ref={alertsRef} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.35 }}>
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">

            <div className="py-5 ps-6 pe-5">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Timeline</span>
                  <span className="text-base font-bold text-gray-900 dark:text-foreground">History</span>
                </div>
                <History className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="-mx-6 overflow-x-auto px-0">
                <Table className="min-w-150 text-sm">
                  <TableHeader>
                    <TableRow className="border-y border-gray-100 bg-gray-50/80 dark:border-border dark:bg-muted/30">
                      <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Timestamp</TableHead>
                      <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Event</TableHead>
                      <TableHead className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyRows.map((row) => (
                      <TableRow key={row.id} className="cursor-pointer border-b border-gray-50 transition-colors duration-100 hover:bg-blue-50/30 dark:border-border/40 dark:hover:bg-primary/5">
                        <TableCell className="px-6 py-4 text-sm text-gray-700 dark:text-foreground">{row.timestamp}</TableCell>
                        <TableCell className="px-6 py-4 text-sm text-gray-700 dark:text-foreground">{row.event}</TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Badge
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                              row.status === 'Warning'
                                ? 'border border-amber-100 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                                : 'border border-emerald-100 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                            )}
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
