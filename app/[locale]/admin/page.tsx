'use client';

import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/components/admin-layout';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, Activity, Rocket, Stethoscope } from 'lucide-react';

export default function AdminDashboardPage() {
  const t = useTranslations('admin');

  const adminModules = [
    {
      title: t('manageUsers.title'),
      description: t('manageUsers.description'),
      href: '/admin/manage-users',
      icon: Users,
    },
    {
      title: t('superviseSystem.title'),
      description: t('superviseSystem.description'),
      href: '/admin/supervise-system',
      icon: Activity,
    },
    {
      title: t('deployUpdates.title'),
      description: t('deployUpdates.description'),
      href: '/admin/deploy-updates',
      icon: Rocket,
    },
    {
      title: t('diagnoseProblems.title'),
      description: t('diagnoseProblems.description'),
      href: '/admin/diagnose-problems',
      icon: Stethoscope,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('description')}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {adminModules.map((module) => (
            <SectionCard
              key={module.href}
              title={module.title}
              description={module.description}
              headerAction={<module.icon className="h-5 w-5 text-muted-foreground" />}
            >
              <Button asChild>
                <Link href={module.href}>Open</Link>
              </Button>
            </SectionCard>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
