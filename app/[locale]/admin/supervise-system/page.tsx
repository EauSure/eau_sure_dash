'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { MoreHorizontal, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type NodeStatusFilter = 'all' | 'active' | 'inactive';

type IotNode = {
  _id: string;
  nodeId: string;
  deviceId: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  firmwareVersion: string;
  isActive: boolean;
  lastSeen: string | null;
  location?: string;
  createdAt: string;
  updatedAt: string;
};

export default function SuperviseSystemPage() {
  const t = useTranslations('superviseSystem');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const [nodes, setNodes] = useState<IotNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<NodeStatusFilter>('all');
  const [firmwareFilter, setFirmwareFilter] = useState('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<IotNode | null>(null);
  const [locationDraft, setLocationDraft] = useState('');
  const [firmwareDraft, setFirmwareDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchNodes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/nodes', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : `HTTP ${res.status}`);
      }

      const data = (await res.json()) as IotNode[];
      setNodes(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.load');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNodes();
  }, []);

  const filteredNodes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return nodes.filter((node) => {
      const statusMatches =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? node.isActive : !node.isActive);

      const firmwareMatches = firmwareFilter === 'all' || node.firmwareVersion === firmwareFilter;

      const searchMatches =
        !query ||
        node.nodeId.toLowerCase().includes(query) ||
        node.ownerName.toLowerCase().includes(query) ||
        node.ownerEmail.toLowerCase().includes(query) ||
        (node.location || '').toLowerCase().includes(query);

      return statusMatches && firmwareMatches && searchMatches;
    });
  }, [firmwareFilter, nodes, search, statusFilter]);

  const firmwareOptions = useMemo(() => {
    return Array.from(new Set(nodes.map((node) => node.firmwareVersion).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [nodes]);

  const stats = useMemo(() => {
    const totalNodes = nodes.length;
    const activeNow = nodes.filter((node) => node.isActive).length;
    const inactive = totalNodes - activeNow;
    const uniqueOwners = new Set(nodes.map((node) => node.ownerId)).size;

    return { totalNodes, activeNow, inactive, uniqueOwners };
  }, [nodes]);

  const formatRelativeLastSeen = (value: string | null) => {
    if (!value) return t('never');

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return t('never');

    const diffMs = Date.now() - timestamp;
    const minutes = Math.floor(diffMs / 60_000);
    const hours = Math.floor(diffMs / 3_600_000);

    if (minutes < 1) return t('time.justNow');
    if (minutes < 60) return t('time.minutesAgo', { count: minutes });
    if (hours < 24) return t('time.hoursAgo', { count: hours });

    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  };

  const openNodeDetail = (node: IotNode) => {
    setSelectedNode(node);
    setLocationDraft(node.location || '');
    setFirmwareDraft(node.firmwareVersion || '');
    setDetailOpen(true);
  };

  const saveNode = async () => {
    if (!selectedNode) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/nodes/${selectedNode._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: locationDraft,
          firmwareVersion: firmwareDraft,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('errors.save'));
      }

      toast.success(t('toasts.saved'));
      setDetailOpen(false);
      await fetchNodes();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.save');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-500">EauSure · Supervision</p>
        <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{t('title')}</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">{t('totalNodes')}</p>
          <p className="text-2xl font-bold">{stats.totalNodes}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">{t('activeNow')}</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.activeNow}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">{t('inactive')}</p>
          <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">{t('uniqueOwners')}</p>
          <p className="text-2xl font-bold">{stats.uniqueOwners}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="ps-9"
            placeholder={t('searchPlaceholder')}
          />
        </div>

        <Select value={statusFilter} onValueChange={(value: NodeStatusFilter) => setStatusFilter(value)}>
          <SelectTrigger>
            <SelectValue placeholder={t('filters.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.all')}</SelectItem>
            <SelectItem value="active">{t('statuses.active')}</SelectItem>
            <SelectItem value="inactive">{t('statuses.inactive')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={firmwareFilter} onValueChange={setFirmwareFilter}>
          <SelectTrigger>
            <SelectValue placeholder={t('filters.firmware')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allFirmware')}</SelectItem>
            {firmwareOptions.map((version) => (
              <SelectItem key={version} value={version}>
                {version}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={`node-row-${index}`} className="h-12 w-full" />
          ))}
        </div>
      ) : filteredNodes.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">{t('noNodes')}</div>
      ) : (
        <div className="rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.nodeId')}</TableHead>
                <TableHead>{t('columns.owner')}</TableHead>
                <TableHead>{t('columns.location')}</TableHead>
                <TableHead>{t('columns.firmware')}</TableHead>
                <TableHead>{t('columns.status')}</TableHead>
                <TableHead>{t('columns.lastSeen')}</TableHead>
                <TableHead className="text-end" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNodes.map((node) => (
                <TableRow key={node._id} className="cursor-pointer" onClick={() => openNodeDetail(node)}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {node.nodeId}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{node.ownerName}</p>
                    <p className="text-xs text-muted-foreground">{node.ownerEmail}</p>
                  </TableCell>
                  <TableCell>
                    <span className={cn('text-sm', !node.location && 'text-muted-foreground')}>{node.location || t('never')}</span>
                  </TableCell>
                  <TableCell>
                    <span className="rounded px-2 py-1 text-xs text-blue-600 bg-blue-500/10">{node.firmwareVersion}</span>
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-2">
                      <span
                        className={cn(
                          'relative inline-flex h-2.5 w-2.5 rounded-full',
                          node.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                        )}
                      >
                        {node.isActive ? <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" /> : null}
                      </span>
                      <span className="text-sm">{node.isActive ? t('statuses.active') : t('statuses.inactive')}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatRelativeLastSeen(node.lastSeen)}</TableCell>
                  <TableCell className="text-end" onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="active:scale-95 transition-transform duration-100">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openNodeDetail(node)}>{t('editNode')}</DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={`/${locale}/dashboard/alerts?deviceId=${encodeURIComponent(node.deviceId)}`}>
                            {t('viewData')}
                          </a>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full max-w-xl rounded-2xl p-0">
          {selectedNode ? (
            <>
              <div className={cn('h-2 w-full', selectedNode.isActive ? 'bg-emerald-500' : 'bg-red-500')} />
              <div className="p-6">
                <SheetHeader>
                  <SheetTitle>{selectedNode.nodeId}</SheetTitle>
                  <SheetDescription>{t('editNode')}</SheetDescription>
                </SheetHeader>

                <div className="mt-5 grid gap-4">
                  <div className="grid gap-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('columns.owner')}</p>
                    <p className="text-sm font-medium">{selectedNode.ownerName}</p>
                    <p className="text-xs text-muted-foreground">{selectedNode.ownerEmail}</p>
                  </div>

                  <div className="grid gap-1">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="node-location">
                      {t('columns.location')}
                    </label>
                    <Input
                      id="node-location"
                      value={locationDraft}
                      onChange={(event) => setLocationDraft(event.target.value)}
                      placeholder={t('locationPlaceholder')}
                    />
                  </div>

                  <div className="grid gap-1">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="node-firmware">
                      {t('columns.firmware')}
                    </label>
                    <Input
                      id="node-firmware"
                      value={firmwareDraft}
                      onChange={(event) => setFirmwareDraft(event.target.value)}
                    />
                  </div>

                  <div className="grid gap-1 text-sm text-muted-foreground">
                    <p>{t('columns.lastSeen')}: {formatRelativeLastSeen(selectedNode.lastSeen)}</p>
                    <p>{t('deviceIdLabel')}: {selectedNode.deviceId}</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setDetailOpen(false)}>
                    {tCommon('discard')}
                  </Button>
                  <Button className="active:scale-95 transition-transform duration-100" onClick={() => void saveNode()} disabled={saving}>
                    {saving ? tCommon('loading') : tCommon('save')}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      </div>
    </div>
  );
}
