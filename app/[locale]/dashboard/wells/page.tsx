import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { Droplets } from 'lucide-react';

// Note: This is a server component, so we need to pass translations as props
// For now, using English as fallback - will be handled by client wrapper
export default async function WellsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/${locale}/auth/signin`);
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <div className="mb-6 flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">EauSure · Wells</p>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">Wells & Reservoirs</h1>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">No monitoring sites configured</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
          <div className="py-5 ps-6 pe-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Monitoring</span>
                <span className="text-base font-bold text-gray-900 dark:text-foreground">Wells & Reservoirs</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="rounded-2xl bg-gray-100 p-6 dark:bg-muted">
                <Droplets className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-600 dark:text-muted-foreground">No Wells Configured</p>
                <p className="mt-1 text-xs text-gray-400">
                  Deploy buoy sensor nodes to your wells and reservoirs, then register them in the system to start monitoring water quality parameters.
                </p>
              </div>
            </div>
      </div>
        </div>
      </div>
    </div>
  );
}
