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
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Droplets, 
  AlertTriangle, 
  Settings, 
  Radio,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const tApp = useTranslations('app');
  
  // Initialize state from localStorage immediately to avoid animation flash
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarCollapsed');
      return savedState === 'true';
    }
    return false;
  });

  // Save sidebar state to localStorage when it changes
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  const navigation = [
    { name: t('overview'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('wells'), href: '/dashboard/wells', icon: Droplets },
    { name: t('alerts'), href: '/dashboard/alerts', icon: AlertTriangle },
    { name: t('devices'), href: '/dashboard/devices', icon: Settings },
    { name: t('gateway'), href: '/dashboard/gateway', icon: Radio },
    { name: t('profile'), href: '/dashboard/profile', icon: User },
    { name: t('settings'), href: '/dashboard/settings', icon: Settings },
  ];

  // Get current page name
  const currentPage = navigation.find((item) => pathname === item.href)?.name || t('overview');

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className={cn(
        "border-r border-border bg-card flex flex-col shadow-sm transition-all duration-300 overflow-hidden",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {/* Collapse toggle button */}
        <div className={cn("px-4 py-2 transition-all duration-300", isCollapsed && "px-2")}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn("w-full transition-all duration-300", isCollapsed && "justify-center px-2")}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4 mr-2" />}
            {!isCollapsed && <span className="text-xs opacity-100 transition-opacity duration-200">Collapse</span>}
          </Button>
        </div>

        <Separator />
        
        <nav className={cn("flex-1 p-4 space-y-1 transition-all duration-300", isCollapsed && "px-2")}>
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
                      'w-full transition-all duration-300',
                      isCollapsed ? 'justify-center px-2' : 'justify-start',
                      isActive && 'bg-secondary',
                      !isActive && 'hover:translate-x-1'
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon className={cn("h-4 w-4 transition-all duration-300", !isCollapsed && "mr-2")} />
                    {!isCollapsed && <span className="opacity-100 transition-opacity duration-200">{item.name}</span>}
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <Separator />
        
        <div className={cn("p-4 transition-all duration-300", isCollapsed && "px-2")}>
          <form action="/api/auth/signout" method="POST">
            <Button 
              variant="outline" 
              size="sm" 
              className={cn("w-full transition-all duration-300", isCollapsed && "justify-center px-2")} 
              type="submit"
              title={isCollapsed ? t('signOut') : undefined}
            >
              <LogOut className={cn("h-4 w-4 transition-all duration-300", !isCollapsed && "mr-2")} />
              {!isCollapsed && <span className="opacity-100 transition-opacity duration-200">{t('signOut')}</span>}
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="relative h-8 w-8 shrink-0">
                <Image
                  src="/logo.png"
                  alt="EauSûre"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-foreground truncate">
                  EauSûre
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {tApp('subtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <UserDropdown />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background/40 backdrop-blur-sm">
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