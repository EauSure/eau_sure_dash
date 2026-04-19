import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function GatewayPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/fr/auth/signin');
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <div className="mb-6 flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">EauSure · Gateway</p>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">Gateway</h1>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">Network infrastructure status</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Gateways', value: '0', percentage: 0 },
            { label: 'Online', value: '0', percentage: 0 },
            { label: 'Connected Devices', value: '0', percentage: 0 },
            { label: 'Uptime', value: '0%', percentage: 0 },
          ].map((card) => (
            <div key={card.label} className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
              <div className="flex flex-col gap-3 py-5 ps-6 pe-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{card.label}</span>
                <span className="text-3xl font-black leading-none text-gray-900 dark:text-foreground">{card.value}</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-muted">
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${card.percentage}%` }} />
                  </div>
                  <span className="whitespace-nowrap text-[10px] font-medium text-gray-400">{card.percentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
          <div className="py-5 ps-6 pe-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Infrastructure</span>
                <span className="text-base font-bold text-gray-900 dark:text-foreground">LoRaWAN Gateways</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="rounded-2xl bg-gray-100 p-6 dark:bg-muted">
                <Radio className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-600 dark:text-muted-foreground">No Gateways Configured</p>
                <p className="mt-1 text-xs text-gray-400">
                  Set up LoRaWAN gateways to establish network connectivity with your deployed sensor nodes. Gateway metrics including RSSI, SNR, and packet loss will be displayed here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
