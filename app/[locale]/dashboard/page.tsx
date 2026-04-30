'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Activity, AlertTriangle, Battery, Cpu, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TimezoneClockWidget } from '@/components/ui/TimezoneClockWidget';
import { useLiveSensorData } from '@/hooks/useLiveSensorData';
import { useT } from '@/lib/useT';
import { useDateFormat } from '@/lib/hooks/useDateFormat';
import { useTimeFormat } from '@/lib/hooks/useTimeFormat';
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider';
import { apiErrorFromResponse, classifyApiError } from '@/lib/api/error-utils';
import type { SensorHistoryResponse, SensorReading, SensorStats } from '@/lib/api/client';

type QualityStatus = 'stable' | 'warning' | 'critical' | 'noData';

function statusFromReading(reading: SensorReading | null): QualityStatus {
  if (!reading) return 'noData';
  const ph = reading.ph.value;
  const tds = reading.tds.value;

  if (ph < 6.5 || ph > 8.5 || tds > 500) return 'critical';
  if (ph < 6.8 || ph > 8.2 || tds > 350) return 'warning';
  return 'stable';
}

function eventCount(stats: SensorStats | null) {
  return stats?.events?.reduce((sum, item) => sum + item.count, 0) ?? 0;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const t = useT('dashboard');
  const locale = useLocale();
  const { preferences } = useUserPreferences();
  const { formatDate } = useDateFormat();
  const { formatTime } = useTimeFormat();
  const { latest, history: liveHistory, loading, error, source, connectionStatus, refresh } = useLiveSensorData(
    undefined,
    undefined,
    preferences.sensorRefreshRate > 0 ? preferences.sensorRefreshRate * 1000 : 10_000
  );
  const [stats, setStats] = useState<SensorStats | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const overviewRef = useRef<HTMLDivElement | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);
  const alertsRef = useRef<HTMLDivElement | null>(null);
  const devicesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push(`/${locale}/auth/signin`);
  }, [locale, router, status]);

  const loadDashboardData = useCallback(async () => {
    setStatsLoading(true);
    setHistoryLoading(true);
    setPageError(null);

    try {
      const [statsResponse, historyResponse] = await Promise.all([
        fetch('/api/eausure/stats?hours=24', { cache: 'no-store' }),
        fetch('/api/eausure/sensor-data?page=1&limit=25', { cache: 'no-store' }),
      ]);

      if (!statsResponse.ok) throw await apiErrorFromResponse(statsResponse);
      if (!historyResponse.ok) throw await apiErrorFromResponse(historyResponse);

      const statsPayload = (await statsResponse.json()) as SensorStats;
      const historyPayload = (await historyResponse.json()) as SensorHistoryResponse | SensorReading[];
      setStats(statsPayload);
      setHistory(Array.isArray(historyPayload) ? historyPayload : historyPayload.data ?? []);
    } catch (err) {
      console.error('[dashboard] Failed to load dashboard data', err);
      const reason = classifyApiError(err, t);
      setPageError(reason);
      toast.error(t('errors.loadDashboard'), {
        description: reason,
        duration: 6000,
        action: {
          label: t('actions.retry'),
          onClick: () => void loadDashboardData(),
        },
      });
    } finally {
      setStatsLoading(false);
      setHistoryLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const sectionRefs = { overview: overviewRef, live: liveRef, alerts: alertsRef, devices: devicesRef };
    const target = sectionRefs[preferences.dashboardDefaultTab]?.current;
    target?.scrollIntoView({ block: 'start', behavior: preferences.reducedMotion ? 'auto' : 'smooth' });
  }, [preferences.dashboardDefaultTab, preferences.reducedMotion]);

  const mergedHistory = useMemo(() => {
    const seen = new Set<string>();
    return [...liveHistory, ...history].filter((entry) => {
      const id = entry._id || `${entry.gatewayId}:${entry.nodeId}:${entry.sequence}:${entry.timestamp}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [history, liveHistory]);

  const qualityStatus = statusFromReading(latest);
  const activeNodes = new Set(mergedHistory.map((entry) => entry.nodeId).filter(Boolean)).size;
  const alertTotal = eventCount(stats) || mergedHistory.filter((entry) => entry.event.type && entry.event.type !== 'None').length;
  const batteryPct = latest ? Math.max(0, Math.min(100, Math.round(latest.battery.percentage))) : 0;

  const rangeCards = useMemo(
    () => ({
      hour: {
        quality: t(`status.${qualityStatus}`),
        activeDevices: String(activeNodes),
        alerts: String(alertTotal),
        battery: latest ? `${batteryPct}%` : t('kpi.noData'),
      },
      week: {
        quality: t(`status.${qualityStatus}`),
        activeDevices: String(activeNodes),
        alerts: String(alertTotal),
        battery: stats ? `${Math.round(stats.statistics.avgBattery)}%` : t('kpi.noData'),
      },
      month: {
        quality: t(`status.${qualityStatus}`),
        activeDevices: String(activeNodes),
        alerts: String(alertTotal),
        battery: stats ? `${Math.round(stats.statistics.avgBattery)}%` : t('kpi.noData'),
      },
    }),
    [activeNodes, alertTotal, batteryPct, latest, qualityStatus, stats, t]
  );

  const historyRows = useMemo(() => {
    return mergedHistory.slice(0, 8).map((entry) => {
      const eventType = entry.event.type || 'None';
      const severity = statusFromReading(entry) === 'critical' || eventType !== 'None' ? 'warning' : 'normal';

      return {
        id: entry._id || `${entry.nodeId}-${entry.sequence}`,
        timestamp: `${formatDate(entry.timestamp)} ${formatTime(entry.timestamp)}`,
        event: eventType === 'None' ? t('labels.readingSummary', { ph: entry.ph.value.toFixed(2), tds: entry.tds.value }) : eventType,
        status: t(`status.${severity}`),
        warning: severity === 'warning',
      };
    });
  }, [formatDate, formatTime, mergedHistory, t]);

  if (status === 'loading' || !session) return null;

  const activePct = Math.max(0, Math.min(100, activeNodes ? 100 : 0));
  const alertPct = Math.max(0, Math.min(100, Math.round((alertTotal / Math.max(mergedHistory.length, 1)) * 100)));
  const isLoading = loading || statsLoading || historyLoading;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div ref={overviewRef} className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">{t('eyebrow.overview')}</p>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{t('title')}</h1>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">{t('description')}</p>
            </div>
            <div className="min-h-22 min-w-62 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:border-border dark:bg-card">
              <TimezoneClockWidget timezone={preferences.timezone} locale={locale} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{preferences.sensorRefreshRate === 0 ? t('live.paused') : t(`live.${source}`, { seconds: preferences.sensorRefreshRate })}</span>
            <Badge variant="outline">{t(`connection.${connectionStatus}`)}</Badge>
            <Button variant="outline" size="sm" className="active:scale-95 transition-transform duration-100" onClick={() => void refresh()}>
              {t('actions.refreshLatest')}
            </Button>
            <Button variant="outline" size="sm" className="active:scale-95 transition-transform duration-100" onClick={() => void loadDashboardData()}>
              {t('actions.refreshHistory')}
            </Button>
          </div>
        </motion.div>

        <motion.div ref={devicesRef} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.07 }}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: t('kpi.waterStatus'), value: rangeCards.month.quality, sublabel: t('labels.quality'), percentage: qualityStatus === 'stable' ? 92 : qualityStatus === 'warning' ? 58 : qualityStatus === 'critical' ? 31 : 0, icon: Activity, iconBg: 'bg-blue-50 dark:bg-primary/10', iconColor: 'text-blue-600 dark:text-primary' },
              { label: t('kpi.activeDevices'), value: rangeCards.month.activeDevices, sublabel: `${activePct}%`, percentage: activePct, icon: Cpu, iconBg: 'bg-emerald-50 dark:bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
              { label: t('kpi.activeAlerts'), value: rangeCards.month.alerts, sublabel: `${alertPct}%`, percentage: alertPct, icon: AlertTriangle, iconBg: 'bg-amber-50 dark:bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
              { label: t('kpi.batteryHealth'), value: rangeCards.month.battery, sublabel: `${batteryPct}%`, percentage: batteryPct, icon: Battery, iconBg: 'bg-blue-50 dark:bg-primary/10', iconColor: 'text-blue-600 dark:text-primary' },
            ].map((item) => (
              <div key={item.label} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
                <div className="flex flex-col gap-3 py-5 ps-6 pe-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{item.label}</span>
                    <div className={cn('rounded-lg p-1.5', item.iconBg)}><item.icon className={cn('h-3.5 w-3.5', item.iconColor)} /></div>
                  </div>
                  <span className="text-3xl font-black leading-none text-gray-900 dark:text-foreground">{item.value}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-muted"><div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${item.percentage}%` }} /></div>
                    <span className="whitespace-nowrap text-[10px] font-medium text-gray-400">{item.sublabel}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {isLoading && <p className="text-sm text-muted-foreground">{t('states.loading')}</p>}
        {(error || pageError) && (
          <div className="rounded-2xl border border-red-100 bg-red-50/70 p-5 text-sm shadow-sm dark:border-red-500/20 dark:bg-red-500/10">
            <p className="font-bold text-red-700 dark:text-red-300">{t('errors.loadDashboard')}</p>
            <p className="mt-1 text-red-600 dark:text-red-200">{error || pageError}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void loadDashboardData()}>
              {t('actions.retry')}
            </Button>
          </div>
        )}

        <motion.div ref={liveRef} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.14 }}>
          <Tabs defaultValue="month" className="space-y-4">
            <TabsList className="rounded-xl border border-gray-200 bg-white dark:border-border dark:bg-muted/30">
              <TabsTrigger value="month">{t('ranges.month')}</TabsTrigger>
              <TabsTrigger value="week">{t('ranges.week')}</TabsTrigger>
              <TabsTrigger value="hour">{t('ranges.hour')}</TabsTrigger>
            </TabsList>
            {(['month', 'week', 'hour'] as const).map((rangeKey) => (
              <TabsContent key={rangeKey} value={rangeKey}>
                <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
                  <div className="py-5 ps-6 pe-5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{t('labels.trendWindow')}</span>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        [t('kpi.waterStatus'), rangeCards[rangeKey].quality],
                        [t('kpi.activeDevices'), rangeCards[rangeKey].activeDevices],
                        [t('kpi.activeAlerts'), rangeCards[rangeKey].alerts],
                        [t('kpi.batteryHealth'), rangeCards[rangeKey].battery],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-border dark:bg-muted/20">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{label}</p>
                          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>

        <motion.div ref={alertsRef} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.21 }}>
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
            <div className="py-5 ps-6 pe-5">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{t('labels.timeline')}</span>
                  <span className="text-base font-bold text-gray-900 dark:text-foreground">{t('labels.history')}</span>
                </div>
                <History className="h-5 w-5 text-muted-foreground" />
              </div>
              {historyRows.length === 0 && !isLoading ? (
                <p className="py-12 text-center text-sm text-muted-foreground">{t('states.emptyHistory')}</p>
              ) : (
                <div className="-mx-6 overflow-x-auto px-0">
                  <Table className="min-w-150 text-sm">
                    <TableHeader>
                      <TableRow className="border-y border-gray-100 bg-gray-50/80 dark:border-border dark:bg-muted/30">
                        <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.timestamp')}</TableHead>
                        <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.event')}</TableHead>
                        <TableHead className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyRows.map((row) => (
                        <TableRow key={row.id} className="border-b border-gray-50 transition-colors duration-100 hover:bg-blue-50/30 dark:border-border/40 dark:hover:bg-primary/5">
                          <TableCell className="px-6 py-4 text-sm text-gray-700 dark:text-foreground">{row.timestamp}</TableCell>
                          <TableCell className="px-6 py-4 text-sm text-gray-700 dark:text-foreground">{row.event}</TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <Badge className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold', row.warning ? 'border border-amber-100 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'border border-emerald-100 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400')}>{row.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
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
