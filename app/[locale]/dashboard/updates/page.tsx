import { getServerSession } from 'next-auth/next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
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
import { Download, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function UpdatesPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations('updates');

  if (!session) {
    redirect('/fr/auth/signin');
  }

  const firmwareRows = [
    {
      device: 'DEV-ESP32-001',
      current: 'v1.2.4',
      available: 'v1.3.0',
      status: 'updateAvailable' as const,
      lastCheck: t('sample.todayAt', { time: '13:30' }),
    },
    {
      device: 'DEV-ESP32-002',
      current: 'v1.3.0',
      available: 'v1.3.0',
      status: 'upToDate' as const,
      lastCheck: t('sample.todayAt', { time: '13:25' }),
    },
    {
      device: 'DEV-ESP32-003',
      current: 'v1.1.9',
      available: 'v1.3.0',
      status: 'pending' as const,
      lastCheck: t('sample.yesterdayAt', { time: '22:10' }),
    },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">{t('eyebrow')}</p>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{t('title')}</h1>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">{t('description')}</p>
          </div>
          <Button className="active:scale-95 transition-transform duration-100">
            <Download className="me-2 h-4 w-4" />
            {t('actions.check')}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: t('metrics.totalDevices'), value: `${firmwareRows.length}`, pct: 100 },
            { label: t('statuses.upToDate'), value: `${firmwareRows.filter((r) => r.status === 'upToDate').length}`, pct: Math.round((firmwareRows.filter((r) => r.status === 'upToDate').length / firmwareRows.length) * 100) },
            { label: t('statuses.updateAvailable'), value: `${firmwareRows.filter((r) => r.status === 'updateAvailable').length}`, pct: Math.round((firmwareRows.filter((r) => r.status === 'updateAvailable').length / firmwareRows.length) * 100) },
            { label: t('statuses.pending'), value: `${firmwareRows.filter((r) => r.status === 'pending').length}`, pct: Math.round((firmwareRows.filter((r) => r.status === 'pending').length / firmwareRows.length) * 100) },
          ].map((card) => (
            <div key={card.label} className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
              <div className="flex flex-col gap-3 py-5 ps-6 pe-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{card.label}</span>
                <span className="text-3xl font-black leading-none text-gray-900 dark:text-foreground">{card.value}</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-muted">
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${card.pct}%` }} />
                  </div>
                  <span className="whitespace-nowrap text-[10px] font-medium text-gray-400">{card.pct}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
          <div className="py-5 ps-6 pe-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{t('sections.releases')}</span>
                <span className="text-base font-bold text-gray-900 dark:text-foreground">{t('sections.status')}</span>
              </div>
              <Wrench className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="-mx-6 overflow-x-auto px-0">
              <Table className="min-w-180 text-sm">
                <TableHeader>
                  <TableRow className="border-y border-gray-100 bg-gray-50/80 dark:border-border dark:bg-muted/30">
                    <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.device')}</TableHead>
                    <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.current')}</TableHead>
                    <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.available')}</TableHead>
                    <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.lastCheck')}</TableHead>
                    <TableHead className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{t('columns.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {firmwareRows.map((row) => (
                    <TableRow key={row.device} className="cursor-pointer border-b border-gray-50 transition-colors duration-100 hover:bg-blue-50/30 dark:border-border/40 dark:hover:bg-primary/5">
                      <TableCell className="px-6 py-4 font-medium text-gray-700 dark:text-foreground">{row.device}</TableCell>
                      <TableCell className="px-6 py-4 text-gray-700 dark:text-foreground">{row.current}</TableCell>
                      <TableCell className="px-6 py-4 text-gray-700 dark:text-foreground">{row.available}</TableCell>
                      <TableCell className="px-6 py-4 text-muted-foreground">{row.lastCheck}</TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Badge className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          row.status === 'updateAvailable'
                            ? 'border border-red-100 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                            : row.status === 'pending'
                              ? 'border border-amber-100 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                              : 'border border-emerald-100 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        )}>
                          {t(`statuses.${row.status}`)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
