'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, Activity, Rocket, Stethoscope } from 'lucide-react';
import { useT } from '@/lib/useT';

export default function AdminDashboardPage() {
  const t = useT('admin');

  const adminModules = [
    {
      title: t('manageUsers.title'),
      description: t('manageUsers.description'),
      href: '/admin/manage-users',
      icon: Users,
    },
    {
      title: t('superviseSystem.title'),
      description: t('superviseSystem.description'),
      href: '/admin/supervise-system',
      icon: Activity,
    },
    {
      title: t('deployUpdates.title'),
      description: t('deployUpdates.description'),
      href: '/admin/deploy-updates',
      icon: Rocket,
    },
    {
      title: t('diagnoseProblems.title'),
      description: t('diagnoseProblems.description'),
      href: '/admin/diagnose-problems',
      icon: Stethoscope,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0 }}>
          <div className="mb-6 flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-500">EauSure · Admin</p>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{t('title')}</h1>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">{t('description')}</p>
          </div>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          {adminModules.map((module, index) => (
            <motion.div
              key={module.href}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.07 + index * 0.07 }}
              whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
              whileTap={{ y: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card"
            >
              <div className="py-5 ps-6 pe-5">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Admin module</span>
                    <span className="text-base font-bold text-gray-900 dark:text-foreground">{module.title}</span>
                  </div>
                  <div className="rounded-lg bg-indigo-50 p-2 transition-transform duration-200 group-hover:scale-110 dark:bg-indigo-500/10">
                    <module.icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <p className="mb-5 text-sm text-gray-500 dark:text-muted-foreground">{module.description}</p>
                <Button asChild className="active:scale-95 transition-transform duration-100">
                  <Link href={module.href}>Open</Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
