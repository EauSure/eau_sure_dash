'use client';

import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut } from 'lucide-react';

export function UserDropdown() {
  const { data: session } = useSession();
  const router = useRouter();
  const t = useTranslations('userMenu');

  if (!session?.user) {
    return null;
  }

  const userInitials = session.user.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : session.user.email?.[0].toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative h-9 w-9 rounded-full border-2 border-border hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <Avatar className="h-full w-full">
            <AvatarImage src={session.user.image || undefined} alt={session.user.name || ''} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user.name || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>{t('profile')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>{t('settings')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/fr/auth/signin' })}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('signOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
