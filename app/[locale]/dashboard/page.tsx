'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/dashboard-layout';
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
import { 
  Activity,
  AlertTriangle, 
  Cpu,
  Battery,
  History,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const t = useTranslations('dashboard');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/fr/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading' || !session) {
    return null;
  }

  const historyRows = [
    { timestamp: 'Today, 14:20', event: 'pH sampling cycle completed', status: 'Normal' },
    { timestamp: 'Today, 12:05', event: 'Battery optimization enabled', status: 'Info' },
    { timestamp: 'Today, 09:40', event: 'Temperature spike detected', status: 'Warning' },
    { timestamp: 'Yesterday, 18:30', event: 'Gateway sync successful', status: 'Normal' },
  ];

  const rangeCards = {
    hour: {
      quality: 'Stable',
      activeDevices: '6',
      alerts: '1',
      battery: '82% avg',
    },
    week: {
      quality: 'Good',
      activeDevices: '8',
      alerts: '4',
      battery: '79% avg',
    },
    month: {
      quality: 'Moderate',
      activeDevices: '10',
      alerts: '13',
      battery: '74% avg',
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('title')}: Visualize dashboard, review history, and track performance.
          </p>
        </div>

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
                  description="Connected now"
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
                  description="Fleet average"
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
                <TableRow key={`${row.timestamp}-${row.event}`}>
                  <TableCell className="text-muted-foreground">{row.timestamp}</TableCell>
                  <TableCell>{row.event}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={row.status === 'Warning' ? 'destructive' : 'secondary'}
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
