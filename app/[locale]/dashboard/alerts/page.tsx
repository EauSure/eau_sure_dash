'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const t = useTranslations('alerts');
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
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
        <div className="pt-1">
          <Button variant="outline" size="sm" onClick={() => void fetchFeed()}>
            Refresh alerts
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('criticalAlerts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.critical}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('warnings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.warning}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('totalActive')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            {t('feed')}
          </CardTitle>
          <CardDescription>{t('feedDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading alerts...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feed.map((alert) => {
                  const severity = deriveSeverity(alert);
                  const eventType = alert.event.type || 'Unknown';
                  const message = `${eventType} | pH ${alert.ph.value.toFixed(2)} | TDS ${alert.tds.value}`;

                  return (
                    <TableRow key={alert._id}>
                      <TableCell className="font-medium">{alert.sequence}</TableCell>
                      <TableCell>{eventType}</TableCell>
                      <TableCell>{alert.deviceId}</TableCell>
                      <TableCell>{message}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={severity === 'Critical' ? 'destructive' : 'secondary'}>
                          {severity === 'Critical' ? (
                            <ShieldAlert className="mr-1 h-3 w-3" />
                          ) : (
                            <AlertTriangle className="mr-1 h-3 w-3" />
                          )}
                          {severity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
