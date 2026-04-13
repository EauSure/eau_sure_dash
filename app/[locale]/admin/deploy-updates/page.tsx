'use client';

import { useTranslations } from 'next-intl';
import { SectionCard } from '@/components/ui/section-card';

export default function DeployUpdatesPage() {
  const t = useTranslations('admin.deployUpdates');

  return (
    <SectionCard
      title={t('title')}
      description={t('workspace')}
    >
      <p className="text-sm text-muted-foreground">
        {t('action')}
      </p>
    </SectionCard>
  );
}
