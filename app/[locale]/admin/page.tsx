'use client';

import { AdminLayout } from '@/components/admin-layout';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, Activity, Rocket, Stethoscope } from 'lucide-react';

const adminModules = [
  {
    title: 'Manage Users',
    description: 'Review user accounts, role assignments, and access control.',
    href: '/admin/manage-users',
    icon: Users,
  },
  {
    title: 'Supervise System',
    description: 'Track system status and operational health indicators.',
    href: '/admin/supervise-system',
    icon: Activity,
  },
  {
    title: 'Deploy Updates',
    description: 'Coordinate deployments and monitor update rollouts.',
    href: '/admin/deploy-updates',
    icon: Rocket,
  },
  {
    title: 'Diagnose Problems',
    description: 'Investigate incidents and run diagnostic procedures.',
    href: '/admin/diagnose-problems',
    icon: Stethoscope,
  },
];

export default function AdminDashboardPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Centralized administration for users, operations, deployment, and diagnostics.
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
