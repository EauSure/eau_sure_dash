'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AnimatedKPICard } from '@/components/animated-kpi-card';
import { SectionCard } from '@/components/ui/section-card';
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
import {
  Activity,
  AlertTriangle,
  Cpu,
  Battery,
  History,
} from 'lucide-react';
import { useEauSureLive } from '@/hooks/use-eausure-live';
import type { EauSureSensorData, EauSureStatsResponse } from '@/types/eausure';

function formatWhen(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

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
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const { latest, history, loading, error, source, refresh } = useEauSureLive();
  const [stats, setStats] = useState<EauSureStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/fr/auth/signin');
    }
  }, [status, router]);

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

  if (status === 'loading' || !session) {
    return null;
  }

  const historyRows = useMemo(() => {
    return history.slice(0, 8).map((entry) => {
      const eventType = entry.event.type || 'None';
      const severity =
        eventType !== 'None' ? 'Warning' : entry.tds.value > 500 || entry.ph.value < 6.5 || entry.ph.value > 8.5 ? 'Warning' : 'Normal';

      return {
        id: entry._id,
        timestamp: formatWhen(entry.timestamp, locale),
        event: eventType === 'None' ? `Reading pH ${entry.ph.value.toFixed(2)}, TDS ${entry.tds.value}` : eventType,
        status: severity,
      };
    });
  }, [history, locale]);

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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('title')}: Visualize dashboard, review history, and track performance.
        </p>
        <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
          <span>{source === 'mqtt' ? 'Live source: MQTT' : 'Live source: Polling fallback'}</span>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Refresh latest
          </Button>
        </div>
      </div>

      {(loading || statsLoading) && (
        <p className="text-sm text-muted-foreground">Loading live dashboard data...</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Tabs defaultValue="month" className="space-y-4">
        <TabsList>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="hour">Hour</TabsTrigger>
        </TabsList>

        {(['month', 'week', 'hour'] as const).map((rangeKey, index) => (
          <TabsContent key={rangeKey} value={rangeKey} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <AnimatedKPICard
                title={t('kpi.waterStatus')}
                value={rangeCards[rangeKey].quality}
                icon={Activity}
                description={`${rangeKey} trend`}
                index={index * 4}
              />
              <AnimatedKPICard
                title="Active Devices"
                value={rangeCards[rangeKey].activeDevices}
                icon={Cpu}
                description={latest ? `Last seen ${formatWhen(latest.timestamp, locale)}` : 'No recent uplinks'}
                index={index * 4 + 1}
              />
              <AnimatedKPICard
                title={t('kpi.activeAlerts')}
                value={rangeCards[rangeKey].alerts}
                icon={AlertTriangle}
                description="Requires attention"
                index={index * 4 + 2}
              />
              <AnimatedKPICard
                title="Battery Health"
                value={rangeCards[rangeKey].battery}
                icon={Battery}
                description={stats ? `24h avg pH ${stats.statistics.avgPH.toFixed(2)}` : 'Fleet average'}
                index={index * 4 + 3}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <SectionCard
        title="History"
        description="Latest system events"
        headerAction={<History className="h-5 w-5 text-muted-foreground" />}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historyRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-muted-foreground">{row.timestamp}</TableCell>
                <TableCell>{row.event}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={row.status === 'Warning' ? 'destructive' : 'secondary'}>{row.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
