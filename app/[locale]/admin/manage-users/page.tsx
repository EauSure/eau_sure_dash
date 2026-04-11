'use client';

import { AdminLayout } from '@/components/admin-layout';
import { SectionCard } from '@/components/ui/section-card';

export default function ManageUsersPage() {
  return (
    <AdminLayout>
      <SectionCard
        title="Manage Users"
        description="Admin-only user management workspace"
      >
        <p className="text-sm text-muted-foreground">
          Use this page to manage accounts, role assignments, and access decisions.
        </p>
      </SectionCard>
    </AdminLayout>
  );
}
