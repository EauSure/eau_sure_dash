'use client';

import { AdminLayout } from '@/components/admin-layout';
import { SectionCard } from '@/components/ui/section-card';

export default function DeployUpdatesPage() {
  return (
    <AdminLayout>
      <SectionCard
        title="Deploy Updates"
        description="Admin-only deployment workspace"
      >
        <p className="text-sm text-muted-foreground">
          Plan releases, trigger update rollouts, and validate deployment readiness.
        </p>
      </SectionCard>
    </AdminLayout>
  );
}
