'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Droplets, Gauge, Thermometer, Waves } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/useT';
import { useDateFormat } from '@/lib/hooks/useDateFormat';
import { useUnits } from '@/lib/hooks/useUnits';
import { apiErrorFromResponse, classifyApiError } from '@/lib/api/error-utils';
import type { SensorHistoryResponse, SensorReading } from '@/lib/api/client';

type WellStatus = 'stable' | 'warning' | 'critical';

function statusFromReading(reading: SensorReading): WellStatus {
  if (reading.ph.value < 6.5 || reading.ph.value > 8.5 || reading.tds.value > 500) return 'critical';
  if (reading.ph.value < 6.8 || reading.ph.value > 8.2 || reading.tds.value > 350) return 'warning';
  return 'stable';
}

export default function WellsPage() {
  const { status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useT('wells');
  const { formatDate } = useDateFormat();
  const { convertTemp } = useUnits();
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push(`/${locale}/auth/signin`);
  }, [locale, router, status]);

  const loadWells = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/eausure/sensor-data?page=1&limit=100', { cache: 'no-store' });
      if (!response.ok) throw await apiErrorFromResponse(response);
      const payload = (await response.json()) as SensorHistoryResponse | SensorReading[];
      setReadings(Array.isArray(payload) ? payload : payload.data ?? []);
    } catch (err) {
      console.error('[wells] Failed to load monitoring sites', err);
      const reason = classifyApiError(err, t);
      setError(reason);
      toast.error(t('errors.load'), {
        description: reason,
        duration: 6000,
        action: { label: t('actions.retry'), onClick: () => void loadWells() },
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadWells();
  }, [loadWells]);

  const wells = useMemo(() => {
    const latestByNode = new Map<string, SensorReading>();
    readings.forEach((reading) => {
      const current = latestByNode.get(reading.nodeId);
      if (!current || new Date(reading.timestamp).getTime() > new Date(current.timestamp).getTime()) {
        latestByNode.set(reading.nodeId, reading);
      }
    });
    return Array.from(latestByNode.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [readings]);

  const stats = useMemo(() => {
    const critical = wells.filter((well) => statusFromReading(well) === 'critical').length;
    const warning = wells.filter((well) => statusFromReading(well) === 'warning').length;
    const stable = wells.filter((well) => statusFromReading(well) === 'stable').length;
    return { critical, warning, stable };
  }, [wells]);

  if (status === 'loading') return null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">{t('eyebrow')}</p>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{t('title')}</h1>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">{t('description')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadWells()}>{t('actions.refresh')}</Button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50/70 p-5 text-sm shadow-sm dark:border-red-500/20 dark:bg-red-500/10">
            <p className="font-bold text-red-700 dark:text-red-300">{t('errors.load')}</p>
            <p className="mt-1 text-red-600 dark:text-red-200">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void loadWells()}>{t('actions.retry')}</Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: t('metrics.total'), value: String(wells.length), percentage: wells.length ? 100 : 0 },
            { label: t('metrics.stable'), value: String(stats.stable), percentage: wells.length ? Math.round((stats.stable / wells.length) * 100) : 0 },
            { label: t('metrics.warning'), value: String(stats.warning), percentage: wells.length ? Math.round((stats.warning / wells.length) * 100) : 0 },
            { label: t('metrics.critical'), value: String(stats.critical), percentage: wells.length ? Math.round((stats.critical / wells.length) * 100) : 0 },
          ].map((card) => (
            <div key={card.label} className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
              <div className="flex flex-col gap-3 py-5 ps-6 pe-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{card.label}</span>
                <span className="text-3xl font-black leading-none text-gray-900 dark:text-foreground">{card.value}</span>
                <div className="mt-1 flex items-center gap-2"><div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-muted"><div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${card.percentage}%` }} /></div><span className="whitespace-nowrap text-[10px] font-medium text-gray-400">{card.percentage}%</span></div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
          <div className="py-5 ps-6 pe-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{t('sections.monitoring')}</span>
                <span className="text-base font-bold text-gray-900 dark:text-foreground">{t('sections.wells')}</span>
              </div>
            </div>
            {loading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">{t('states.loading')}</p>
            ) : wells.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                <div className="rounded-2xl bg-gray-100 p-6 dark:bg-muted"><Droplets className="h-8 w-8 text-gray-400" /></div>
                <div>
                  <p className="text-sm font-bold text-gray-600 dark:text-muted-foreground">{t('empty')}</p>
                  <p className="mt-1 text-xs text-gray-400">{t('instruction')}</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {wells.map((well) => {
                  const quality = statusFromReading(well);
                  return (
                    <div key={`${well.gatewayId}-${well.nodeId}`} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5 dark:border-border dark:bg-muted/20">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-foreground">{well.nodeId}</p>
                          <p className="text-xs text-muted-foreground">{t('labels.gateway')}: {well.gatewayId}</p>
                        </div>
                        <Badge className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', quality === 'critical' ? 'border border-red-100 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' : quality === 'warning' ? 'border border-amber-100 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'border border-emerald-100 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400')}>{t(`status.${quality}`)}</Badge>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Metric icon={Droplets} label={t('labels.ph')} value={well.ph.value.toFixed(2)} percentage={Math.max(0, Math.min(100, (well.ph.value / 14) * 100))} />
                        <Metric icon={Waves} label={t('labels.tds')} value={`${well.tds.value} ppm`} percentage={Math.max(0, Math.min(100, (well.tds.value / 500) * 100))} />
                        <Metric icon={Thermometer} label={t('labels.temperature')} value={convertTemp(well.temperature.water)} percentage={Math.max(0, Math.min(100, well.temperature.water * 2))} />
                        <Metric icon={Gauge} label={t('labels.battery')} value={`${Math.round(well.battery.percentage)}%`} percentage={well.battery.percentage} />
                      </div>
                      <p className="mt-4 text-xs text-muted-foreground">{t('labels.lastReading')}: {formatDate(well.timestamp)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, percentage }: { icon: typeof Droplets; label: string; value: string; percentage: number }) {
  return (
    <div className="rounded-xl bg-white p-3 dark:bg-card">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{label}</span><span>{value}</span></div>
      <Progress value={Math.max(0, Math.min(100, percentage))} />
    </div>
  );
}
