'use client';

import { Shield, Users, Activity, Rocket, Stethoscope } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard-layout';

type AdminLayoutProps = {
  children: React.ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigation = [
    { name: 'Admin Overview', href: '/admin', icon: Shield },
    { name: 'Manage Users', href: '/admin/manage-users', icon: Users },
    { name: 'Supervise System', href: '/admin/supervise-system', icon: Activity },
    { name: 'Deploy Updates', href: '/admin/deploy-updates', icon: Rocket },
    { name: 'Diagnose Problems', href: '/admin/diagnose-problems', icon: Stethoscope },
  ];

  return (
    <DashboardLayout
      navigation={navigation}
      sidebarStorageKey="adminSidebarCollapsed"
      userDropdownProps={{
        profileHref: '/admin',
        settingsHref: '/admin',
        showProfileSettings: false,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
