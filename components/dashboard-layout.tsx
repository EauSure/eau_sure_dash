'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserDropdown } from '@/components/user-dropdown';
import { 
  LayoutDashboard, 
  Droplets, 
  AlertTriangle, 
  Settings, 
  Radio,
  LogOut
} from 'lucide-react';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const tApp = useTranslations('app');

  const navigation = [
    { name: t('overview'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('wells'), href: '/dashboard/wells', icon: Droplets },
    { name: t('alerts'), href: '/dashboard/alerts', icon: AlertTriangle },
    { name: t('devices'), href: '/dashboard/devices', icon: Settings },
    { name: t('gateway'), href: '/dashboard/gateway', icon: Radio },
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col shadow-sm">
        {/* Logo & Brand Header */}
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0">
              <Image
                src="/logo.png"
                alt="EauSûre"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">
                EauSûre
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {tApp('subtitle')}
              </p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
              >
                <Link href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start transition-all duration-200',
                      isActive && 'bg-secondary',
                      !isActive && 'hover:translate-x-1'
                    )}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <Separator />
        
        <div className="p-4">
          <form action="/api/auth/signout" method="POST">
            <Button variant="outline" size="sm" className="w-full" type="submit">
              <LogOut className="mr-2 h-4 w-4" />
              {t('signOut')}
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="relative h-8 w-8 shrink-0">
                <Image
                  src="/logo.png"
                  alt="EauSûre"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {navigation.find((item) => item.href === pathname)?.name || 'Dashboard'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <UserDropdown />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <motion.div
            className="p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
