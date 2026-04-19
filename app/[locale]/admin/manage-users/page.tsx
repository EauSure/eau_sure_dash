'use client';

import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useT } from '@/lib/useT';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SectionCard } from '@/components/ui/section-card';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, House, MoreHorizontal, Phone, PlugZap, Search, Shield, UserRound, Users } from 'lucide-react';

type UserRole = 'admin' | 'user';
type UserStatus = 'active' | 'suspended';
type PresenceStatus = 'online' | 'away' | 'offline';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    country?: string;
  };
  iotNodeCount?: number;
  role: UserRole;
  status: UserStatus;
  presence?: {
    status: PresenceStatus;
    lastSeen?: string | Date | null;
  };
  image?: string;
  createdAt?: string | Date;
}

type RoleFilter = 'all' | 'admin' | 'operator';
type StatusFilter = 'all' | UserStatus;
type SortKey = 'name' | 'email' | 'role' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';
type ActionType = 'role' | 'status' | 'delete';

interface PendingAction {
  type: ActionType;
  user: AdminUser;
}

function getDiceBearAvatar(seed: string): string {
  return `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(seed)}`;
}

interface PresenceDotProps {
  status: PresenceStatus;
  showLabel?: boolean;
  lastSeen?: string | Date | null;
  onlineLabel: string;
  awayLabel: string;
  formatLastSeen: (value?: string | Date | null) => string;
}

function PresenceDot({
  status,
  showLabel = false,
  lastSeen,
  onlineLabel,
  awayLabel,
  formatLastSeen,
}: PresenceDotProps) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {status === 'online' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className={cn(
            'relative inline-flex h-2.5 w-2.5 rounded-full',
            status === 'online' && 'bg-emerald-500',
            status === 'away' && 'bg-amber-400',
            status === 'offline' && 'bg-gray-300 dark:bg-gray-600'
          )}
        />
      </span>

      {showLabel && (
        <span
          className={cn(
            'text-xs font-medium',
            status === 'online' && 'text-emerald-600',
            status === 'away' && 'text-amber-500',
            status === 'offline' && 'text-gray-400'
          )}
        >
          {status === 'online' && onlineLabel}
          {status === 'away' && awayLabel}
          {status === 'offline' && formatLastSeen(lastSeen)}
        </span>
      )}
    </span>
  );
}

export default function ManageUsersPage() {
  const { data: session } = useSession();
  const t = useT('manageUsers');
  const tPresence = useT('presence');
  const locale = useLocale();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(
          typeof payload?.error === 'string' ? payload.error : `HTTP ${res.status}`
        );
      }

      const data = (await res.json()) as AdminUser[];
      setUsers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchUsers();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = users.filter((user) => {
      const roleValue = user.role === 'admin' ? 'admin' : 'operator';
      const roleMatches = roleFilter === 'all' || roleFilter === roleValue;
      const statusMatches = statusFilter === 'all' || statusFilter === user.status;
      const searchMatches =
        !normalizedSearch ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch);

      return roleMatches && statusMatches && searchMatches;
    });

    return [...filtered].sort((a, b) => {
      const aValue =
        sortBy === 'createdAt'
          ? new Date(a.createdAt || 0).getTime()
          : String(a[sortBy] || '').toLowerCase();
      const bValue =
        sortBy === 'createdAt'
          ? new Date(b.createdAt || 0).getTime()
          : String(b[sortBy] || '').toLowerCase();

      if (aValue < bValue) return sortDir === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, searchTerm, roleFilter, statusFilter, sortBy, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(key);
    setSortDir('asc');
  };

  const getRoleLabel = (role: UserRole) =>
    role === 'admin' ? t('roles.admin') : t('roles.operator');

  const getStatusLabel = (status: UserStatus) =>
    status === 'active' ? t('statuses.active') : t('statuses.suspended');

  const formatDate = (value?: string | Date) => {
    if (!value) return '-';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(new Date(value));
  };

  const formatLastSeen = (value?: string | Date | null) => {
    if (!value) return tPresence('never');

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return tPresence('never');

    const diffMs = Date.now() - timestamp;

    if (diffMs < 60_000) return tPresence('justNow');
    if (diffMs < 3_600_000) return tPresence('minutesAgo', { count: Math.floor(diffMs / 60_000) });
    if (diffMs < 86_400_000) return tPresence('hoursAgo', { count: Math.floor(diffMs / 3_600_000) });

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  const getPresenceStatus = (user: AdminUser): PresenceStatus => {
    return user.presence?.status ?? 'offline';
  };

  const formatAddress = (user: AdminUser) => {
    const street = user.address?.street?.trim();
    const city = user.address?.city?.trim();
    const country = user.address?.country?.trim();
    const pieces = [street, city, country].filter((value): value is string => Boolean(value));
    return pieces.length > 0 ? pieces.join(', ') : null;
  };

  const getNodeLabel = (count: number) => (count === 1 ? t('node') : t('nodes'));

  const renderDetailCell = ({
    icon,
    label,
    value,
    muted,
  }: {
    icon: ReactNode;
    label: string;
    value: string;
    muted?: boolean;
  }) => (
    <div className="flex flex-col gap-1 rounded-xl border bg-background p-3">
      <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </span>
      <span className={cn('text-sm font-medium', muted && 'text-muted-foreground')}>{value}</span>
    </div>
  );

  const openActionDialog = (type: ActionType, user: AdminUser) => {
    setPendingAction({ type, user });
    setIsDialogOpen(true);
  };

  const closeActionDialog = () => {
    setIsDialogOpen(false);
    setPendingAction(null);
  };

  const handleAction = async () => {
    if (!pendingAction) return;
    const { type, user } = pendingAction;
    setIsActionLoading(true);

    try {
      if (type === 'delete') {
        const res = await fetch(`/api/admin/users/${user._id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(typeof payload?.error === 'string' ? payload.error : t('error'));
        }
        toast.success(t('toast.deleted'));
      } else {
        const body =
          type === 'role'
            ? { role: user.role === 'admin' ? 'operator' : 'admin' }
            : { status: user.status === 'active' ? 'suspended' : 'active' };

        const res = await fetch(`/api/admin/users/${user._id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(typeof payload?.error === 'string' ? payload.error : t('error'));
        }

        toast.success(type === 'role' ? t('toast.roleUpdated') : t('toast.statusUpdated'));
      }

      await fetchUsers();
      closeActionDialog();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error');
      toast.error(message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const dialogCopy = useMemo(() => {
    if (!pendingAction) {
      return {
        title: '',
        description: '',
        confirm: '',
        confirmVariant: 'default' as 'default' | 'destructive',
      };
    }

    if (pendingAction.type === 'delete') {
      return {
        title: t('dialog.deleteTitle'),
        description: t('confirmDelete', { name: pendingAction.user.name }),
        confirm: t('actions.delete'),
        confirmVariant: 'destructive' as const,
      };
    }

    if (pendingAction.type === 'status') {
      const isSuspending = pendingAction.user.status === 'active';
      return {
        title: isSuspending ? t('dialog.suspendTitle') : t('dialog.reactivateTitle'),
        description: isSuspending
          ? t('confirmSuspend', { name: pendingAction.user.name })
          : t('confirmReactivate', { name: pendingAction.user.name }),
        confirm: isSuspending ? t('actions.suspend') : t('actions.reactivate'),
        confirmVariant: isSuspending ? ('destructive' as const) : ('default' as const),
      };
    }

    const promoting = pendingAction.user.role !== 'admin';
    return {
      title: t('dialog.changeRoleTitle'),
      description: promoting
        ? t('confirmPromote', { name: pendingAction.user.name })
        : t('confirmDemote', { name: pendingAction.user.name }),
      confirm: t('actions.changeRole'),
      confirmVariant: 'default' as const,
    };
  }, [pendingAction, t]);

  return (
    <>
      <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <div className="mb-6 flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-500">EauSure · Users</p>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{t('title')}</h1>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">{t('description')}</p>
        </div>

        <SectionCard>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="relative">
                  <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="ps-9"
                  />
                </div>
              </div>

              <Select value={roleFilter} onValueChange={(value: RoleFilter) => setRoleFilter(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('filterRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allRoles')}</SelectItem>
                  <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                  <SelectItem value="operator">{t('roles.operator')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('filterStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('statuses.active')}</SelectItem>
                  <SelectItem value="suspended">{t('statuses.suspended')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="active:scale-95 transition-transform duration-100" onClick={fetchUsers}>
                {t('refresh')}
              </Button>
            </div>

            <p className="text-muted-foreground text-sm">
              {t('showing', { count: filteredUsers.length, total: users.length })}
            </p>
          </div>
        </SectionCard>

        {loading ? (
          <SectionCard>
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={`users-skeleton-${index}`} className="h-12 w-full" />
              ))}
            </div>
          </SectionCard>
        ) : error ? (
          <SectionCard>
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Users className="text-muted-foreground size-10" />
              <p className="text-sm text-destructive">{error}</p>
              <Button onClick={fetchUsers}>{t('retry')}</Button>
            </div>
          </SectionCard>
        ) : filteredUsers.length === 0 ? (
          <SectionCard>
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Users className="text-muted-foreground size-10" />
              <p className="text-sm text-muted-foreground">{t('noUsers')}</p>
            </div>
          </SectionCard>
        ) : (
          <SectionCard>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('name')}>
                        {t('columns.user')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('email')}>
                        {t('columns.email')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('role')}>
                        {t('columns.role')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('status')}>
                        {t('columns.status')}
                      </Button>
                    </TableHead>
                    <TableHead>{t('columns.presence')}</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('createdAt')}>
                        {t('columns.createdAt')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">{t('columns.actions')}</TableHead>
                    <TableHead className="w-12 text-right" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredUsers.map((user) => {
                    const isSelf = session?.user?.email === user.email;
                    const avatarSeed = user.name || user.email;
                    const isExpanded = expandedUserId === user._id;
                    const presenceStatus = getPresenceStatus(user);
                    const phoneValue = user.phone?.trim() || null;
                    const addressValue = formatAddress(user);
                    const nodeCount = user.iotNodeCount ?? 0;

                    return (
                      <Fragment key={user._id}>
                        <TableRow key={`${user._id}-base`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={user.image || getDiceBearAvatar(avatarSeed)} alt={user.name} />
                                <AvatarFallback>{user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={user.role === 'admin' ? 'default' : 'secondary'}
                              className={user.role === 'admin' ? '' : 'bg-slate-600 text-white'}
                            >
                              {user.role === 'admin' ? <Shield className="size-3" /> : <UserRound className="size-3" />}
                              {getRoleLabel(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={user.status === 'active' ? 'secondary' : 'destructive'}
                              className={user.status === 'active' ? 'bg-emerald-600 text-white' : ''}
                            >
                              {getStatusLabel(user.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <PresenceDot
                              status={presenceStatus}
                              showLabel
                              lastSeen={user.presence?.lastSeen}
                              onlineLabel={tPresence('online')}
                              awayLabel={tPresence('away')}
                              formatLastSeen={formatLastSeen}
                            />
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            {isSelf ? (
                              <span className="text-muted-foreground text-xs">{t('cannotEditSelf')}</span>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon-sm" className="active:scale-95 transition-transform duration-100">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => openActionDialog('role', user)}>
                                    {t('actions.changeRole')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => openActionDialog('status', user)}>
                                    {user.status === 'active' ? t('actions.suspend') : t('actions.reactivate')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem variant="destructive" onSelect={() => openActionDialog('delete', user)}>
                                    {t('actions.delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="active:scale-95 transition-transform duration-100"
                              aria-label={isExpanded ? t('collapseUser') : t('expandUser')}
                              onClick={() => setExpandedUserId((prev) => (prev === user._id ? null : user._id))}
                            >
                              {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>

                        <TableRow key={`${user._id}-details`}>
                          <TableCell colSpan={8} className="p-0">
                            <AnimatePresence initial={false}>
                              {isExpanded ? (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="grid grid-cols-1 gap-4 border-t bg-muted/30 px-4 pb-4 pt-4 sm:grid-cols-3"
                                >
                                  {renderDetailCell({
                                    icon: <Phone className="h-3 w-3" />,
                                    label: t('phone'),
                                    value: phoneValue || '—',
                                    muted: !phoneValue,
                                  })}
                                  {renderDetailCell({
                                    icon: <House className="h-3 w-3" />,
                                    label: t('address'),
                                    value: addressValue || '—',
                                    muted: !addressValue,
                                  })}
                                  {renderDetailCell({
                                    icon: <PlugZap className="h-3 w-3" />,
                                    label: t('iotNodes'),
                                    value: `${nodeCount} ${getNodeLabel(nodeCount)}`,
                                  })}
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 md:hidden">
              {filteredUsers.map((user) => {
                const isSelf = session?.user?.email === user.email;
                const avatarSeed = user.name || user.email;
                const isExpanded = expandedUserId === user._id;
                const presenceStatus = getPresenceStatus(user);
                const phoneValue = user.phone?.trim() || null;
                const addressValue = formatAddress(user);
                const nodeCount = user.iotNodeCount ?? 0;

                return (
                  <div key={user._id} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.image || getDiceBearAvatar(avatarSeed)} alt={user.name} />
                          <AvatarFallback>{user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.name}</p>
                          <p className="text-muted-foreground truncate text-sm">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!isSelf && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" className="active:scale-95 transition-transform duration-100">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => openActionDialog('role', user)}>
                                {t('actions.changeRole')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => openActionDialog('status', user)}>
                                {user.status === 'active' ? t('actions.suspend') : t('actions.reactivate')}
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onSelect={() => openActionDialog('delete', user)}>
                                {t('actions.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="active:scale-95 transition-transform duration-100"
                          aria-label={isExpanded ? t('collapseUser') : t('expandUser')}
                          onClick={() => setExpandedUserId((prev) => (prev === user._id ? null : user._id))}
                        >
                          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className={user.role === 'admin' ? '' : 'bg-slate-600 text-white'}
                      >
                        {getRoleLabel(user.role)}
                      </Badge>
                      <Badge
                        variant={user.status === 'active' ? 'secondary' : 'destructive'}
                        className={user.status === 'active' ? 'bg-emerald-600 text-white' : ''}
                      >
                        {getStatusLabel(user.status)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          presenceStatus === 'online'
                            ? 'border-emerald-500/60 text-emerald-700'
                            : presenceStatus === 'away'
                              ? 'border-amber-500/60 text-amber-700'
                              : ''
                        }
                      >
                        <PresenceDot
                          status={presenceStatus}
                          lastSeen={user.presence?.lastSeen}
                          onlineLabel={tPresence('online')}
                          awayLabel={tPresence('away')}
                          formatLastSeen={formatLastSeen}
                        />
                        <span className="ml-2">
                          {presenceStatus === 'online' && tPresence('online')}
                          {presenceStatus === 'away' && tPresence('away')}
                          {presenceStatus === 'offline' && formatLastSeen(user.presence?.lastSeen)}
                        </span>
                      </Badge>
                      <Badge variant="outline">{formatDate(user.createdAt)}</Badge>
                    </div>

                    {isSelf && (
                      <p className="text-muted-foreground text-xs">{t('cannotEditSelf')}</p>
                    )}

                    <AnimatePresence initial={false}>
                      {isExpanded ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="grid grid-cols-1 gap-4 border-t bg-muted/30 px-4 pb-4 pt-4 sm:grid-cols-3"
                        >
                          {renderDetailCell({
                            icon: <Phone className="h-3 w-3" />,
                            label: t('phone'),
                            value: phoneValue || '—',
                            muted: !phoneValue,
                          })}
                          {renderDetailCell({
                            icon: <House className="h-3 w-3" />,
                            label: t('address'),
                            value: addressValue || '—',
                            muted: !addressValue,
                          })}
                          {renderDetailCell({
                            icon: <PlugZap className="h-3 w-3" />,
                            label: t('iotNodes'),
                            value: `${nodeCount} ${getNodeLabel(nodeCount)}`,
                          })}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}
        </div>
      </div>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogCopy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeActionDialog}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className={dialogCopy.confirmVariant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
              onClick={handleAction}
              disabled={isActionLoading}
            >
              {isActionLoading ? t('working') : dialogCopy.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
