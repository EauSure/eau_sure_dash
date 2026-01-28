'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/dashboard-layout';
import { AnimatedKPICard } from '@/components/animated-kpi-card';
import { PageShell } from '@/components/ui/page-shell';
import { SectionCard } from '@/components/ui/section-card';
import { 
  Droplets, 
  AlertTriangle, 
  Radio,
  Battery,
  Settings
} from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const t = useTranslations('dashboard');

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/fr/auth/signin');
    }
  }, [status]);

  if (status === 'loading' || !session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <AnimatedKPICard
            title={t('kpi.waterStatus')}
            value="0/0"
            icon={Droplets}
            description={t('kpi.noWells')}
            index={0}
          />
          <AnimatedKPICard
            title={t('kpi.activeAlerts')}
            value="0"
            icon={AlertTriangle}
            description={t('kpi.noAlerts')}
            index={1}
          />
          <AnimatedKPICard
            title={t('kpi.gatewaysOnline')}
            value="0/0"
            icon={Radio}
            description={t('kpi.noGateways')}
            index={2}
          />
          <AnimatedKPICard
            title={t('kpi.avgBatteryLife')}
            value="—"
            icon={Battery}
            description={t('kpi.noData')}
            index={3}
          />
        </div>

        <SectionCard
          title={t('setup.title')}
          description={t('setup.description')}
          headerAction={<Settings className="h-5 w-5 text-muted-foreground" />}
        >
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-6">
              {t('setup.noDevices')}
            </p>
            <div className="text-left max-w-md mx-auto space-y-4">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <span className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {step}
                  </span>
                  <span className="text-sm text-foreground pt-0.5">
                    {t(`setup.step${step}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
