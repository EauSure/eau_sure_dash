'use client';

import { AdminLayout } from '@/components/admin-layout';
import { SectionCard } from '@/components/ui/section-card';

export default function SuperviseSystemPage() {
  return (
    <AdminLayout>
      <SectionCard
        title="Supervise System"
        description="Admin-only system supervision workspace"
      >
        <p className="text-sm text-muted-foreground">
          Monitor platform-wide health, uptime signals, and system-level activity.
        </p>
      </SectionCard>
    </AdminLayout>
  );
}
