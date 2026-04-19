import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Cpu, Thermometer, Battery, ActivitySquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function DeviceManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/fr/auth/signin');
  }

  const devices = [
    {
      id: 'DEV-ESP32-001',
      status: 'Online',
      temperature: '22.4 C',
      battery: 87,
      esp32: 'Healthy',
      performance: 'Stable',
    },
    {
      id: 'DEV-ESP32-002',
      status: 'Warning',
      temperature: '29.1 C',
      battery: 41,
      esp32: 'High Load',
      performance: 'Degraded',
    },
    {
      id: 'DEV-ESP32-003',
      status: 'Offline',
      temperature: '--',
      battery: 0,
      esp32: 'No Signal',
      performance: 'Unavailable',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">EauSure · Devices</p>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">Dispositifs</h1>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">
              Connectez vos appareils, suivez leur etat et controlez leurs performances.
            </p>
          </div>
          <Button className="active:scale-95 transition-transform duration-100">
            <Plus className="me-2 h-4 w-4" />
            Connect Device
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Connected', value: '2 / 3', percentage: 67, sublabel: 'online', accent: 'bg-emerald-400' },
            { label: 'Temperature Avg', value: '25.7 C', percentage: 71, sublabel: 'stable', accent: 'bg-blue-500' },
            { label: 'Battery Avg', value: '64%', percentage: 64, sublabel: 'avg', accent: 'bg-amber-400' },
            { label: 'ESP32 Health', value: 'Good', percentage: 84, sublabel: 'fleet', accent: 'bg-blue-500' },
          ].map((card) => (
            <div key={card.label} className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">

              <div className="flex flex-col gap-3 py-5 ps-6 pe-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{card.label}</span>
                <span className="text-3xl font-black leading-none text-gray-900 dark:text-foreground">{card.value}</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-muted">
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${card.percentage}%` }} />
                  </div>
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
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Monitoring</span>
                <span className="text-base font-bold text-gray-900 dark:text-foreground">Device Monitoring</span>
              </div>
              <Cpu className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="-mx-6 overflow-x-auto px-0">
              <Table className="min-w-190 text-sm">
              <TableHeader>
                <TableRow className="border-y border-gray-100 bg-gray-50/80 dark:border-border dark:bg-muted/30">
                  <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Device</TableHead>
                  <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Status</TableHead>
                  <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Temperature</TableHead>
                  <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">ESP32</TableHead>
                  <TableHead className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Performance</TableHead>
                  <TableHead className="w-45 px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Battery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id} className="cursor-pointer border-b border-gray-50 transition-colors duration-100 hover:bg-blue-50/30 dark:border-border/40 dark:hover:bg-primary/5">
                    <TableCell className="px-6 py-4 font-medium text-gray-700 dark:text-foreground">{device.id}</TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          device.status === 'Warning'
                            ? 'border border-amber-100 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                            : device.status === 'Offline'
                              ? 'border border-gray-200 bg-gray-100 text-gray-500 dark:bg-gray-500/10 dark:text-gray-400'
                              : 'border border-emerald-100 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        )}
                      >
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="inline-flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-muted-foreground" />
                        {device.temperature}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-700 dark:text-foreground">{device.esp32}</TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="inline-flex items-center gap-2">
                        <ActivitySquare className="h-4 w-4 text-muted-foreground" />
                        {device.performance}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Battery className="h-3.5 w-3.5" /> Battery
                          </span>
                          <span>{device.battery}%</span>
                        </div>
                        <Progress value={device.battery} />
                      </div>
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
