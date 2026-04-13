'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, MoreHorizontal, Search, TicketIcon, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { SectionCard } from '@/components/ui/section-card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  ticketCategories,
  ticketPriorities,
  ticketStatuses,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/models/Ticket';

type TicketResponse = {
  _id: string;
  ticketId: string;
  userId: string;
  userEmail: string;
  userName: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  title: string;
  description: string;
  adminNote?: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TicketListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  count: number;
};

type TicketListResponse = {
  tickets: TicketResponse[];
  meta: TicketListMeta;
};

const statusBadgeClasses: Record<TicketStatus, string> = {
  open: 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300',
  in_progress: 'border-yellow-500/30 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
  resolved: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  closed: 'border-muted-foreground/30 bg-muted text-muted-foreground',
};

const priorityBadgeClasses: Record<TicketPriority, string> = {
  low: 'border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-300',
  medium: 'border-yellow-500/30 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
  high: 'border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-300',
  critical: 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300',
};

export default function DiagnoseProblemsPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('support');
  const tAdmin = useTranslations('admin.diagnoseProblems');

  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [meta, setMeta] = useState<TicketListMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TicketCategory>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TicketPriority>('all');
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<TicketResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState<TicketStatus>('open');
  const [noteDraft, setNoteDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<TicketResponse | null>(null);

  const categoryOptions = useMemo(
    () => ticketCategories.map((category) => ({ value: category, label: t(`categories.${category}`) })),
    [t]
  );

  const priorityOptions = useMemo(
    () => ticketPriorities.map((priority) => ({ value: priority, label: t(`priorities.${priority}`) })),
    [t]
  );

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push(`/${locale}/auth/signin`);
    }
  }, [locale, router, sessionStatus]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });

      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (searchTerm) params.set('search', searchTerm);

      const response = await fetch(`/api/tickets?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.status === 401) {
        router.push(`/${locale}/auth/signin`);
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('error'));
      }

      const payload = (await response.json()) as TicketListResponse;
      setTickets(payload.tickets ?? []);
      setMeta(
        payload.meta ?? {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          count: 0,
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, locale, page, priorityFilter, router, searchTerm, statusFilter, t]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      void fetchTickets();
    }
  }, [fetchTickets, sessionStatus]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter, priorityFilter, searchTerm]);

  const openDetail = (ticket: TicketResponse) => {
    setSelectedTicket(ticket);
    setStatusDraft(ticket.status);
    setNoteDraft(ticket.adminNote ?? '');
    setDetailOpen(true);
  };

  const openDeleteDialog = (ticket: TicketResponse) => {
    setTicketToDelete(ticket);
    setDeleteDialogOpen(true);
  };

  const saveTicket = async (
    ticket: TicketResponse,
    patch: Partial<Pick<TicketResponse, 'status' | 'adminNote'>>
  ) => {
    setSaving(true);

    try {
      const response = await fetch(`/api/tickets/${ticket._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('error'));
      }

      toast.success(t('toasts.updated'));
      setDetailOpen(false);
      await fetchTickets();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteTicket = async () => {
    if (!ticketToDelete) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/tickets/${ticketToDelete._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('error'));
      }

      toast.success(t('toasts.deleted'));
      setDeleteDialogOpen(false);
      setTicketToDelete(null);
      await fetchTickets();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const currentTicket = selectedTicket;

  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && loading)) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{tAdmin('title')}</h1>
          <p className="text-muted-foreground">{tAdmin('description')}</p>
        </div>
        <SectionCard>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={`tickets-loading-${index}`} className="h-12 w-full" />
            ))}
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{tAdmin('title')}</h1>
          <p className="text-muted-foreground">{tAdmin('description')}</p>
        </div>

        <SectionCard title={tAdmin('title')} description={tAdmin('workspace')}>
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-4">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={t('searchPlaceholder')}
                />
              </div>

              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('filters.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
                  {ticketStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`statuses.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as typeof categoryFilter)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('filters.category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allCategories')}</SelectItem>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as typeof priorityFilter)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('filters.priority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allPriorities')}</SelectItem>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {t('showing', { count: meta.count, total: meta.total })}
              </p>
              <Button variant="outline" size="sm" onClick={() => void fetchTickets()}>
                {t('refresh')}
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <TicketIcon className="mb-4 size-12 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t('noTickets')}</h2>
              <p className="text-sm text-muted-foreground">{tAdmin('action')}</p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('columns.ticket')}</TableHead>
                      <TableHead>{t('columns.user')}</TableHead>
                      <TableHead>{t('columns.category')}</TableHead>
                      <TableHead>{t('columns.priority')}</TableHead>
                      <TableHead>{t('columns.status')}</TableHead>
                      <TableHead>{t('columns.createdAt')}</TableHead>
                      <TableHead className="text-right">{t('columns.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket._id} className="cursor-pointer" onClick={() => openDetail(ticket)}>
                        <TableCell>
                          <Badge variant="outline">{ticket.ticketId}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">{ticket.userName}</p>
                            <p className="text-xs text-muted-foreground">{ticket.userEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>{t(`categories.${ticket.category}`)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={priorityBadgeClasses[ticket.priority]}>
                            {t(`priorities.${ticket.priority}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClasses[ticket.status]}>
                            {t(`statuses.${ticket.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  openDetail(ticket);
                                }}
                              >
                                {t('actions.viewDetails')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  openDetail(ticket);
                                }}
                              >
                                {t('actions.changeStatus')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  openDetail(ticket);
                                }}
                              >
                                {t('actions.editNote')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={(event) => {
                                  event.preventDefault();
                                  openDeleteDialog(ticket);
                                }}
                              >
                                {t('actions.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {t('prev')}
                </Button>
                <div className="text-sm text-muted-foreground">
                  {meta.page} / {meta.totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {t('next')}
                </Button>
              </div>
            </>
          )}
        </SectionCard>
      </div>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-full max-w-2xl overflow-hidden p-0 sm:max-w-2xl" showCloseButton={false}>
          {currentTicket ? (
            <>
              <div
                className={cn(
                  'h-1.5 w-full',
                  currentTicket.priority === 'critical' && 'bg-red-500',
                  currentTicket.priority === 'high' && 'bg-orange-500',
                  currentTicket.priority === 'medium' && 'bg-yellow-500',
                  currentTicket.priority === 'low' && 'bg-slate-400'
                )}
              />

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-8">
                  <SheetHeader className="p-0 text-start">
                    <div className="flex items-center justify-between gap-3">
                      <span className="w-fit rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                        {currentTicket.ticketId}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => setDetailOpen(false)}>
                        <X className="size-4" />
                      </Button>
                    </div>
                    <SheetTitle className="mt-2 text-xl font-semibold">
                      {currentTicket.title}
                    </SheetTitle>
                    <SheetDescription className="mt-1 text-sm text-muted-foreground">
                      {t('detail.submittedBy', {
                        name: currentTicket.userName,
                        email: currentTicket.userEmail,
                      })}
                    </SheetDescription>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('detail.createdAt', { date: formatDate(currentTicket.createdAt) })}
                    </p>
                  </SheetHeader>

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                        {t('columns.category')}
                      </p>
                      <Badge variant="outline" className="w-fit">
                        {t(`categories.${currentTicket.category}`)}
                      </Badge>
                    </div>
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                        {t('columns.priority')}
                      </p>
                      <Badge variant="outline" className={priorityBadgeClasses[currentTicket.priority]}>
                        {t(`priorities.${currentTicket.priority}`)}
                      </Badge>
                    </div>
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                        {t('columns.status')}
                      </p>
                      <Badge variant="outline" className={statusBadgeClasses[currentTicket.status]}>
                        {t(`statuses.${currentTicket.status}`)}
                      </Badge>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div>
                    <p className="mb-2 text-sm font-medium">{t('labels.description')}</p>
                    <div className="max-h-48 overflow-y-auto rounded-lg bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
                      {currentTicket.description}
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div>
                    <p className="mb-3 text-sm font-medium">{t('detail.updateStatus')}</p>
                    <Select value={statusDraft} onValueChange={(value) => setStatusDraft(value as TicketStatus)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('actions.changeStatus')} />
                      </SelectTrigger>
                      <SelectContent>
                        {ticketStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`statuses.${status}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <p className="mb-3 mt-5 text-sm font-medium">{t('detail.internalNote')}</p>
                    <Textarea
                      className="min-h-[100px]"
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder={t('detail.internalNotePlaceholder')}
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-3 pb-0">
                    <Button variant="outline" onClick={() => setDetailOpen(false)}>
                      {t('cancel')}
                    </Button>
                    <Button
                      onClick={() => currentTicket && void saveTicket(currentTicket, { status: statusDraft, adminNote: noteDraft })}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      {t('detail.saveChanges')}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTicketToDelete(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteTicket()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
