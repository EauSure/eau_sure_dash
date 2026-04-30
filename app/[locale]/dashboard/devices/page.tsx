'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Cpu, Battery, ActivitySquare, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/useT';
import { useDateFormat } from '@/lib/hooks/useDateFormat';
import { apiErrorFromResponse, classifyApiError } from '@/lib/api/error-utils';
import type { Gateway, IotNode } from '@/lib/api/client';

type NodeRow = IotNode & { gatewayName: string };

export default function DeviceManagementPage() {
  const { status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useT('devices');
  const { formatDate } = useDateFormat();
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measuringNode, setMeasuringNode] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push(`/${locale}/auth/signin`);
  }, [locale, router, status]);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const gatewaysResponse = await fetch('/api/eausure/gateways', { cache: 'no-store' });
      if (!gatewaysResponse.ok) throw await apiErrorFromResponse(gatewaysResponse);
      const gatewayList = (await gatewaysResponse.json()) as Gateway[];
      const safeGateways = Array.isArray(gatewayList) ? gatewayList : [];
      setGateways(safeGateways);

      const nodeGroups = await Promise.all(
        safeGateways.map(async (gateway) => {
          const response = await fetch(`/api/eausure/gateways/${encodeURIComponent(gateway.gatewayId)}/nodes`, { cache: 'no-store' });
          if (!response.ok) throw await apiErrorFromResponse(response);
          const payload = (await response.json()) as IotNode[];
          return (Array.isArray(payload) ? payload : []).map((node) => ({ ...node, gatewayName: gateway.name || gateway.gatewayId }));
        })
      );

      setNodes(nodeGroups.flat());
    } catch (err) {
      console.error('[devices] Failed to load devices', err);
      const reason = classifyApiError(err, t);
      setError(reason);
      toast.error(t('errors.load'), {
        description: reason,
        duration: 6000,
        action: { label: t('actions.retry'), onClick: () => void loadDevices() },
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const triggerMeasure = async (node: NodeRow) => {
    setMeasuringNode(node.nodeId);
    try {
      const response = await fetch(`/api/eausure/gateways/${encodeURIComponent(node.gatewayId)}/nodes/${encodeURIComponent(node.nodeId)}/measure`, { method: 'POST' });
      if (!response.ok) throw await apiErrorFromResponse(response);
      toast.success(t('toasts.measureQueued'));
    } catch (err) {
      console.error('[devices] Failed to trigger measurement', err);
      toast.error(t('errors.measure'), {
        description: classifyApiError(err, t),
        duration: 6000,
        action: { label: t('actions.retry'), onClick: () => void triggerMeasure(node) },
      });
    } finally {
      setMeasuringNode(null);
    }
  };

  const stats = useMemo(() => {
    const active = nodes.filter((node) => node.status?.active).length;
    const firmwareVersions = new Set(nodes.map((node) => node.status?.firmwareVersion).filter(Boolean));
    const avgRssiValues = nodes.map((node) => node.status?.lastRssi).filter((value): value is number => typeof value === 'number');
    const avgRssi = avgRssiValues.length ? Math.round(avgRssiValues.reduce((sum, value) => sum + value, 0) / avgRssiValues.length) : null;

    return { active, firmwareVersions: firmwareVersions.size, avgRssi };
  }, [nodes]);

  if (status === 'loading') return null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">{t('eyebrow')}</p>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{t('title')}</h1>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">{t('description')}</p>
          </div>
          <Button variant="outline" className="active:scale-95 transition-transform duration-100" onClick={() => void loadDevices()}>{t('actions.refresh')}</Button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50/70 p-5 text-sm shadow-sm dark:border-red-500/20 dark:bg-red-500/10">
            <p className="font-bold text-red-700 dark:text-red-300">{t('errors.load')}</p>
            <p className="mt-1 text-red-600 dark:text-red-200">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void loadDevices()}>{t('actions.retry')}</Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: t('metrics.connected'), value: `${stats.active} / ${nodes.length}`, percentage: nodes.length ? Math.round((stats.active / nodes.length) * 100) : 0, sublabel: t('status.active') },
            { label: t('metrics.gateways'), value: String(gateways.length), percentage: gateways.length ? 100 : 0, sublabel: t('labels.linked') },
            { label: t('metrics.firmware'), value: String(stats.firmwareVersions), percentage: stats.firmwareVersions ? 80 : 0, sublabel: t('labels.versions') },
            { label: t('metrics.signal'), value: stats.avgRssi === null ? t('states.noData') : `${stats.avgRssi} dBm`, percentage: stats.avgRssi === null ? 0 : 75, sublabel: t('labels.average') },
          ].map((card) => (
            <div key={card.label} className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
              <div className="flex flex-col gap-3 py-5 ps-6 pe-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{card.label}</span>
                <span className="text-3xl font-black leading-none text-gray-900 dark:text-foreground">{card.value}</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-muted"><div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${card.percentage}%` }} /></div>
                  <span className="whitespace-nowrap text-[10px] font-medium text-gray-400">{card.sublabel}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
          <div className="py-5 ps-6 pe-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{t('sections.monitoring')}</span>
                <span className="text-base font-bold text-gray-900 dark:text-foreground">{t('sections.nodes')}</span>
              </div>
              <Cpu className="h-5 w-5 text-muted-foreground" />
            </div>
            {loading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">{t('states.loading')}</p>
            ) : nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                <div className="rounded-2xl bg-gray-100 p-6 dark:bg-muted"><Radio className="h-8 w-8 text-gray-400" /></div>
                <div>
                  <p className="text-sm font-bold text-gray-600 dark:text-muted-foreground">{t('states.empty')}</p>
                  <p className="mt-1 text-xs text-gray-400">{t('states.emptyDescription')}</p>
                </div>
              </div>
            ) : (
              <div className="-mx-6 overflow-x-auto px-0">
                <Table className="min-w-190 text-sm">
                  <TableHeader>
                    <TableRow className="border-y border-gray-100 bg-gray-50/80 dark:border-border dark:bg-muted/30">
                      <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.node')}</TableHead>
                      <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.gateway')}</TableHead>
                      <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.status')}</TableHead>
                      <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.firmware')}</TableHead>
                      <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.signal')}</TableHead>
                      <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.lastSeen')}</TableHead>
                      <TableHead className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nodes.map((node) => (
                      <TableRow key={`${node.gatewayId}-${node.nodeId}`} className="border-b border-gray-50 transition-colors duration-100 hover:bg-blue-50/30 dark:border-border/40 dark:hover:bg-primary/5">
                        <TableCell className="px-6 py-4 font-medium text-gray-700 dark:text-foreground">{node.name || node.nodeId}</TableCell>
                        <TableCell className="px-6 py-4 text-gray-700 dark:text-foreground">{node.gatewayName}</TableCell>
                        <TableCell className="px-6 py-4"><Badge className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold', node.status?.active ? 'border border-emerald-100 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border border-gray-200 bg-gray-100 text-gray-500 dark:bg-gray-500/10 dark:text-gray-400')}>{node.status?.active ? t('status.active') : t('status.inactive')}</Badge></TableCell>
                        <TableCell className="px-6 py-4 text-gray-700 dark:text-foreground"><span className="inline-flex items-center gap-2"><ActivitySquare className="h-4 w-4 text-muted-foreground" />{node.status?.firmwareVersion || t('states.noData')}</span></TableCell>
                        <TableCell className="px-6 py-4 text-gray-700 dark:text-foreground">{node.status?.lastRssi ?? t('states.noData')} / {node.status?.lastSnr ?? t('states.noData')}</TableCell>
                        <TableCell className="px-6 py-4 text-muted-foreground">{node.status?.lastSeenAt ? formatDate(node.status.lastSeenAt) : t('states.never')}</TableCell>
                        <TableCell className="px-6 py-4 text-right"><Button variant="outline" size="sm" disabled={measuringNode === node.nodeId} onClick={() => void triggerMeasure(node)}><Battery className="me-2 h-3.5 w-3.5" />{measuringNode === node.nodeId ? t('actions.measuring') : t('actions.measure')}</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

