'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Radio, Router, Signal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/useT';
import { useDateFormat } from '@/lib/hooks/useDateFormat';
import { apiErrorFromResponse, classifyApiError } from '@/lib/api/error-utils';
import type { Gateway, IotNode } from '@/lib/api/client';

export default function GatewayPage() {
  const { status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useT('gateway');
  const { formatDate } = useDateFormat();
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [nodes, setNodes] = useState<IotNode[]>([]);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push(`/${locale}/auth/signin`);
  }, [locale, router, status]);

  const loadGateways = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/eausure/gateways', { cache: 'no-store' });
      if (!response.ok) throw await apiErrorFromResponse(response);
      const payload = (await response.json()) as Gateway[];
      setGateways(Array.isArray(payload) ? payload : []);
      setSelectedGatewayId((current) => current ?? payload[0]?.gatewayId ?? null);
    } catch (err) {
      console.error('[gateway] Failed to load gateways', err);
      const reason = classifyApiError(err, t);
      setError(reason);
      toast.error(t('errors.load'), {
        description: reason,
        duration: 6000,
        action: { label: t('actions.retry'), onClick: () => void loadGateways() },
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadGateways();
  }, [loadGateways]);

  useEffect(() => {
    if (!selectedGatewayId) {
      setNodes([]);
      return;
    }

    const loadNodes = async () => {
      setNodesLoading(true);
      try {
        const response = await fetch(`/api/eausure/gateways/${encodeURIComponent(selectedGatewayId)}/nodes`, { cache: 'no-store' });
        if (!response.ok) throw await apiErrorFromResponse(response);
        const payload = (await response.json()) as IotNode[];
        setNodes(Array.isArray(payload) ? payload : []);
      } catch (err) {
        console.error('[gateway] Failed to load gateway nodes', err);
        const reason = classifyApiError(err, t);
        setError(reason);
        toast.error(t('errors.loadNodes'), {
          description: reason,
          duration: 6000,
          action: { label: t('actions.retry'), onClick: () => void loadGateways() },
        });
      } finally {
        setNodesLoading(false);
      }
    };

    void loadNodes();
  }, [loadGateways, selectedGatewayId, t]);

  const selectedGateway = gateways.find((gateway) => gateway.gatewayId === selectedGatewayId) ?? gateways[0] ?? null;
  const onlineCount = gateways.filter((gateway) => gateway.status?.online).length;
  const activeNodes = nodes.filter((node) => node.status?.active).length;
  const avgRssi = useMemo(() => {
    const values = gateways.map((gateway) => gateway.status?.rssi).filter((value): value is number => typeof value === 'number');
    if (values.length === 0) return null;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [gateways]);

  if (status === 'loading') return null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <div className="mb-6 flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">{t('eyebrow')}</p>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{t('title')}</h1>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">{t('description')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadGateways()}>{t('actions.refresh')}</Button>
          {error && (
            <div className="w-full rounded-2xl border border-red-100 bg-red-50/70 p-5 text-sm shadow-sm dark:border-red-500/20 dark:bg-red-500/10">
              <p className="font-bold text-red-700 dark:text-red-300">{t('errors.load')}</p>
              <p className="mt-1 text-red-600 dark:text-red-200">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => void loadGateways()}>{t('actions.retry')}</Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: t('metrics.total'), value: String(gateways.length), percentage: gateways.length ? 100 : 0 },
            { label: t('metrics.online'), value: String(onlineCount), percentage: gateways.length ? Math.round((onlineCount / gateways.length) * 100) : 0 },
            { label: t('metrics.connectedNodes'), value: String(activeNodes), percentage: nodes.length ? Math.round((activeNodes / nodes.length) * 100) : 0 },
            { label: t('metrics.averageRssi'), value: avgRssi === null ? t('states.noData') : `${avgRssi} dBm`, percentage: avgRssi === null ? 0 : 75 },
          ].map((card) => (
            <div key={card.label} className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
              <div className="flex flex-col gap-3 py-5 ps-6 pe-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{card.label}</span>
                <span className="text-3xl font-black leading-none text-gray-900 dark:text-foreground">{card.value}</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-muted"><div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${card.percentage}%` }} /></div>
                  <span className="whitespace-nowrap text-[10px] font-medium text-gray-400">{card.percentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
          <div className="py-5 ps-6 pe-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{t('sections.infrastructure')}</span>
                <span className="text-base font-bold text-gray-900 dark:text-foreground">{t('sections.gateways')}</span>
              </div>
              <Radio className="h-5 w-5 text-muted-foreground" />
            </div>

            {loading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">{t('states.loading')}</p>
            ) : gateways.length === 0 ? (
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
                      <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.gateway')}</TableHead>
                      <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.status')}</TableHead>
                      <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.signal')}</TableHead>
                      <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.lastSeen')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gateways.map((gateway) => (
                      <TableRow key={gateway.gatewayId} onClick={() => setSelectedGatewayId(gateway.gatewayId)} className="cursor-pointer border-b border-gray-50 transition-colors duration-100 hover:bg-blue-50/30 dark:border-border/40 dark:hover:bg-primary/5">
                        <TableCell className="px-6 py-4 font-medium text-gray-700 dark:text-foreground">{gateway.name || gateway.gatewayId}</TableCell>
                        <TableCell className="px-6 py-4"><Badge className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', gateway.status?.online ? 'border border-emerald-100 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border border-gray-200 bg-gray-100 text-gray-500 dark:bg-gray-500/10 dark:text-gray-400')}>{gateway.status?.online ? t('status.online') : t('status.offline')}</Badge></TableCell>
                        <TableCell className="px-6 py-4 text-gray-700 dark:text-foreground"><span className="inline-flex items-center gap-2"><Signal className="h-4 w-4 text-muted-foreground" />{gateway.status?.rssi ?? t('states.noData')} / {gateway.status?.snr ?? t('states.noData')}</span></TableCell>
                        <TableCell className="px-6 py-4 text-muted-foreground">{gateway.lastSeenAt ? formatDate(gateway.lastSeenAt) : t('states.never')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {selectedGateway && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-border dark:bg-card">
              <div className="mb-4 flex items-center gap-2"><Router className="h-5 w-5 text-muted-foreground" /><h2 className="font-bold text-gray-900 dark:text-foreground">{t('sections.config')}</h2></div>
              <div className="grid gap-3 text-sm text-muted-foreground">
                <p>{t('config.measureInterval')}: <span className="font-medium text-foreground">{selectedGateway.config?.measureInterval ?? t('states.noData')}</span></p>
                <p>{t('config.shakeEnabled')}: <span className="font-medium text-foreground">{selectedGateway.config?.shakeEnabled ? t('common.yes') : t('common.no')}</span></p>
                <p>{t('config.shakeThreshold')}: <span className="font-medium text-foreground">{selectedGateway.config?.shakeThreshold ?? t('states.noData')}</span></p>
                <p>{t('config.units')}: <span className="font-medium text-foreground">{selectedGateway.config?.units ?? t('states.noData')}</span></p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-border dark:bg-card">
              <h2 className="mb-4 font-bold text-gray-900 dark:text-foreground">{t('sections.nodes')}</h2>
              {nodesLoading ? <p className="text-sm text-muted-foreground">{t('states.loading')}</p> : nodes.length === 0 ? <p className="text-sm text-muted-foreground">{t('states.emptyNodes')}</p> : (
                <div className="space-y-3">
                  {nodes.map((node) => <div key={node.nodeId} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm dark:bg-muted/30"><span className="font-medium">{node.name || node.nodeId}</span><Badge variant="outline">{node.status?.active ? t('status.active') : t('status.inactive')}</Badge></div>)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
