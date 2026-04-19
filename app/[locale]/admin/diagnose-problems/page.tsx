'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, MoreHorizontal, Search, Send as SendIcon, Shield, TicketIcon, User, X } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/useT';
import { isRecentTimestamp, type SerializedChat } from '@/lib/chat';
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

type LiveChatUser = {
  userId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  nodeCount: number;
  accountStatus: string;
};

type WaitingChatUser = LiveChatUser & {
  reason: string;
  status: SerializedChat['status'];
  createdAt: string;
  waitTimeSeconds: number;
};

type LiveChatResponse = {
  chat: SerializedChat | null;
  user: LiveChatUser | null;
};

type WaitingQueueResponse = {
  waitingUsers: WaitingChatUser[];
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
  const t = useT('support');
  const tAdmin = useT('admin.diagnoseProblems');

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
  const [activeSection, setActiveSection] = useState<'tickets' | 'live-chat'>('tickets');
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
  const [queueLoading, setQueueLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatReplying, setChatReplying] = useState(false);
  const [waitingUsers, setWaitingUsers] = useState<WaitingChatUser[]>([]);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<SerializedChat | null>(null);
  const [selectedUser, setSelectedUser] = useState<LiveChatUser | null>(null);
  const [chatReply, setChatReply] = useState('');
  const [chatNow, setChatNow] = useState(Date.now());
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const typingPingRef = useRef<number | null>(null);

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

  const fetchWaitingQueue = useCallback(
    async (silent = false) => {
      if (!silent) {
        setQueueLoading(true);
      }

      try {
        const response = await fetch('/api/chat/waiting', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.status === 401 || response.status === 403) {
          router.push(`/${locale}/auth/signin`);
          return;
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(typeof payload?.error === 'string' ? payload.error : t('error'));
        }

        const payload = (await response.json()) as WaitingQueueResponse;
        setWaitingUsers(payload.waitingUsers || []);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('error');
        toast.error(message);
      } finally {
        if (!silent) {
          setQueueLoading(false);
        }
      }
    },
    [locale, router, t]
  );

  const fetchActiveChat = useCallback(
    async (userId?: string | null, silent = false) => {
      if (!silent) {
        setChatLoading(true);
      }

      try {
        const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
        const response = await fetch(`/api/chat/active${query}`, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.status === 401 || response.status === 403) {
          router.push(`/${locale}/auth/signin`);
          return;
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(typeof payload?.error === 'string' ? payload.error : t('error'));
        }

        const payload = (await response.json()) as LiveChatResponse;
        setSelectedChat(payload.chat);
        setSelectedUser(payload.user);

        if (payload.user?.userId) {
          setSelectedChatUserId(payload.user.userId);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : t('error');
        toast.error(message);
      } finally {
        if (!silent) {
          setChatLoading(false);
        }
      }
    },
    [locale, router, t]
  );

  useEffect(() => {
    if (sessionStatus !== 'authenticated') {
      return;
    }

    void fetchTickets();
  }, [fetchTickets, sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') {
      return;
    }

    void fetchWaitingQueue();
    if (selectedChatUserId) {
      void fetchActiveChat(selectedChatUserId);
    }

    const queueIntervalId = window.setInterval(() => {
      void fetchWaitingQueue(true);
    }, 5000);

    const activeIntervalId = window.setInterval(() => {
      if (selectedChatUserId) {
        void fetchActiveChat(selectedChatUserId, true);
      }
    }, 3000);

    const clockIntervalId = window.setInterval(() => {
      setChatNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(queueIntervalId);
      window.clearInterval(activeIntervalId);
      window.clearInterval(clockIntervalId);
    };
  }, [fetchActiveChat, fetchWaitingQueue, selectedChatUserId, sessionStatus]);

  useEffect(() => {
    if (!selectedChatUserId || sessionStatus !== 'authenticated') {
      return;
    }

    void fetchActiveChat(selectedChatUserId);
  }, [fetchActiveChat, selectedChatUserId, sessionStatus]);

  useEffect(() => {
    if (typingPingRef.current) {
      window.clearTimeout(typingPingRef.current);
      typingPingRef.current = null;
    }

    if (!selectedChatUserId || !selectedChat || selectedChat.status !== 'active' || !chatReply.trim()) {
      return;
    }

    typingPingRef.current = window.setTimeout(() => {
      void fetch('/api/chat/typing', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedChatUserId }),
      });
    }, 350);

    return () => {
      if (typingPingRef.current) {
        window.clearTimeout(typingPingRef.current);
        typingPingRef.current = null;
      }
    };
  }, [chatReply, selectedChat, selectedChatUserId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat?.messages]);

  const sendAdminReply = async () => {
    const text = chatReply.trim();
    if (!text || !selectedChatUserId || selectedChat?.status !== 'active') {
      return;
    }

    setChatReplying(true);

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedChatUserId,
          text,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('error'));
      }

      setChatReply('');
      await fetchActiveChat(selectedChatUserId, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
    } finally {
      setChatReplying(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter, priorityFilter, searchTerm]);

  const handleAcceptUser = async (userId: string) => {
    try {
      setChatLoading(true);
      const response = await fetch('/api/chat/accept', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('error'));
      }

      setSelectedChatUserId(userId);
      await Promise.all([fetchWaitingQueue(true), fetchActiveChat(userId, true)]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
    } finally {
      setChatLoading(false);
    }
  };

  const handleIgnoreUser = async (userId: string) => {
    try {
      setChatLoading(true);
      const response = await fetch('/api/chat/moderate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, action: 'end', reason: 'Ignored by admin' }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('error'));
      }

      await fetchWaitingQueue(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
    } finally {
      setChatLoading(false);
    }
  };

  const moderateActiveChat = async (action: 'suspend' | 'resume' | 'end') => {
    if (!selectedChatUserId) {
      return;
    }

    try {
      setChatLoading(true);
      const response = await fetch('/api/chat/moderate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedChatUserId, action }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('error'));
      }

      await fetchActiveChat(selectedChatUserId, true);
      await fetchWaitingQueue(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
    } finally {
      setChatLoading(false);
    }
  };

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
      <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <div className="mb-6 flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-500">EauSure · Diagnostics</p>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{tAdmin('title')}</h1>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">{tAdmin('description')}</p>
        </div>
        <SectionCard>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={`tickets-loading-${index}`} className="h-12 w-full" />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Live Chat" description="Queue waiting users, accept sessions, and manage active chats.">
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-xl border bg-background">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="text-sm font-medium">Waiting Users</p>
                <Button variant="outline" size="sm" onClick={() => void fetchWaitingQueue()} disabled={queueLoading}>
                  {queueLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Refresh
                </Button>
              </div>
              <div className="max-h-136 overflow-y-auto p-2">
                {queueLoading && waitingUsers.length === 0 ? (
                  <div className="space-y-2 p-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={`waiting-chat-loading-${index}`} className="h-24 w-full" />
                    ))}
                  </div>
                ) : waitingUsers.length === 0 ? (
                  <div className="flex min-h-44 items-center justify-center px-3 text-center text-sm text-muted-foreground">
                    No users are waiting right now.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {waitingUsers.map((user) => {
                      const isSelected = selectedChatUserId === user.userId;

                      return (
                        <button
                          key={user.userId}
                          type="button"
                          className={cn(
                            'w-full rounded-lg border px-3 py-3 text-start transition-colors',
                            isSelected
                              ? 'border-primary/30 bg-primary/5'
                              : 'border-transparent hover:border-border hover:bg-muted/40'
                          )}
                          onClick={() => {
                            setSelectedChatUserId(user.userId);
                            void fetchActiveChat(user.userId);
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0 capitalize">
                              {user.status}
                            </Badge>
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{user.reason}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{Math.floor(user.waitTimeSeconds / 60)}m {user.waitTimeSeconds % 60}s waiting</span>
                            <span>•</span>
                            <span>{user.phone || 'No phone'}</span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleAcceptUser(user.userId);
                              }}
                            >
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleIgnoreUser(user.userId);
                              }}
                            >
                              Ignore
                            </Button>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-h-128 flex-col overflow-hidden rounded-xl border bg-background">
              <div className="border-b px-4 py-3">
                {selectedUser && selectedChat ? (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{selectedUser.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {selectedChat.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedUser.phone || 'No phone'} · {selectedUser.address || 'No address'}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a waiting user or accept one to open the chat.</p>
                )}
              </div>

              {!selectedChat || !selectedUser ? (
                <div className="flex flex-1 items-center justify-center px-6 py-12 text-center text-sm text-muted-foreground">
                  The active chat panel will open here once you select or accept a user.
                </div>
              ) : (
                <div className="flex flex-1 flex-col">
                  <div className="grid gap-4 border-b p-4 md:grid-cols-[1fr_auto]">
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Reason / Subject</p>
                      <p className="mt-2 text-base font-semibold">{selectedChat.reason}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {selectedChat.startedAt ? (
                          <Badge variant="outline" className="font-mono">
                            {(() => {
                              const startTime = new Date(selectedChat.startedAt).getTime();
                              const endTime = selectedChat.endedAt ? new Date(selectedChat.endedAt).getTime() : chatNow;
                              const elapsedSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
                              const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
                              const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
                              return `${minutes}:${seconds}`;
                            })()}
                          </Badge>
                        ) : null}
                        <span
                          className={cn(
                            'inline-block h-2 w-2 rounded-full',
                            selectedChat.status === 'active' && 'bg-emerald-500',
                            selectedChat.status === 'waiting' && 'bg-amber-500',
                            selectedChat.status === 'suspended' && 'bg-orange-500',
                            selectedChat.status === 'ended' && 'bg-rose-500'
                          )}
                        />
                        <span>
                          {selectedChat.status === 'waiting' ? 'Waiting for acceptance' : null}
                          {selectedChat.status === 'active' ? 'Chat active' : null}
                          {selectedChat.status === 'suspended' ? `Suspended${selectedChat.suspendedBy ? ` by ${selectedChat.suspendedBy}` : ''}` : null}
                          {selectedChat.status === 'ended' ? 'Chat ended' : null}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:items-end">
                      <Button variant="outline" size="sm" onClick={() => void fetchActiveChat(selectedChatUserId)} disabled={!selectedChatUserId || chatLoading}>
                        {chatLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                        Refresh
                      </Button>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => void moderateActiveChat('suspend')} disabled={selectedChat.status !== 'active' || chatLoading}>
                          Suspend
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => void moderateActiveChat('resume')} disabled={selectedChat.status !== 'suspended' || chatLoading}>
                          Resume
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => void moderateActiveChat('end')} disabled={selectedChat.status === 'ended' || chatLoading}>
                          End Chat
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid flex-1 gap-0 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="border-b p-4 lg:border-b-0 lg:border-e">
                      <div className="rounded-xl border bg-card p-4 shadow-sm">
                        <p className="text-sm font-medium">Operator Profile</p>
                        <div className="mt-4 space-y-2 text-sm">
                          <p><span className="text-muted-foreground">Name:</span> {selectedUser.name}</p>
                          <p><span className="text-muted-foreground">Email:</span> {selectedUser.email}</p>
                          <p><span className="text-muted-foreground">Phone:</span> {selectedUser.phone || 'N/A'}</p>
                          <p><span className="text-muted-foreground">Address:</span> {selectedUser.address || 'N/A'}</p>
                          <p><span className="text-muted-foreground">Node count:</span> {selectedUser.nodeCount}</p>
                          <p><span className="text-muted-foreground">Account status:</span> {selectedUser.accountStatus}</p>
                        </div>
                      </div>

                      {selectedChat.operatorTyping && isRecentTimestamp(selectedChat.operatorTyping, 3000) ? (
                        <div className="mt-4 rounded-full border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
                          User is typing...
                        </div>
                      ) : null}

                      {selectedChat.status !== 'active' ? (
                        <div className="mt-4 rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                          {selectedChat.status === 'waiting'
                            ? 'Accept the user to start the conversation.'
                            : selectedChat.status === 'suspended'
                              ? 'This chat is suspended until you resume it.'
                              : 'This chat has ended.'}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex min-h-96 flex-col">
                      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                        {selectedChat.messages.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            No messages yet.
                          </div>
                        ) : (
                          selectedChat.messages.map((message, index) => {
                            const isUser = message.role === 'user';
                            return (
                              <div
                                key={`admin-chat-message-${index}-${message.timestamp}`}
                                className={cn('flex max-w-[82%] gap-2', isUser ? 'me-auto' : 'ms-auto flex-row-reverse')}
                              >
                                <div className={cn('rounded-full p-2', isUser ? 'bg-primary/10' : 'bg-muted')}>
                                  {isUser ? (
                                    <User className="h-4 w-4 text-primary" />
                                  ) : (
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0 space-y-1">
                                  <p className="text-xs text-muted-foreground">{isUser ? selectedUser.name : 'Support Agent'}</p>
                                  <div
                                    className={cn(
                                      'rounded-2xl px-4 py-2 text-sm',
                                      isUser ? 'rounded-tl-sm bg-muted text-foreground' : 'rounded-tr-sm bg-primary text-primary-foreground'
                                    )}
                                  >
                                    {message.text}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{formatDate(message.timestamp)}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={chatBottomRef} />
                      </div>

                      <div className="border-t bg-card px-4 py-3">
                        <div className="flex gap-2">
                          <Input
                            value={chatReply}
                            onChange={(event) => setChatReply(event.target.value)}
                            placeholder="Type a response..."
                            disabled={!selectedChatUserId || selectedChat.status !== 'active' || chatReplying}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                void sendAdminReply();
                              }
                            }}
                          />
                          <Button
                            onClick={() => void sendAdminReply()}
                            disabled={!selectedChatUserId || selectedChat.status !== 'active' || !chatReply.trim() || chatReplying}
                          >
                            {chatReplying ? <Loader2 className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <div className="mb-6 flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-500">EauSure · Diagnostics</p>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{tAdmin('title')}</h1>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">{tAdmin('description')}</p>
        </div>

        <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as 'tickets' | 'live-chat')}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
            <TabsTrigger value="live-chat">Live Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-7">
            <SectionCard title={tAdmin('title')} description={tAdmin('workspace')}>
              <div className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-4">
                  <div className="relative lg:col-span-2">
                    <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="ps-9"
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
                  <Button variant="outline" size="sm" className="active:scale-95 transition-transform duration-100" onClick={() => void fetchTickets()}>
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
                        <TableRow className="border-y border-gray-100 bg-gray-50/80 dark:border-border dark:bg-muted/30">
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
                          <TableRow key={ticket._id} className="cursor-pointer border-b border-gray-50 transition-colors duration-100 hover:bg-blue-50/30 dark:border-border/40 dark:hover:bg-primary/5" onClick={() => openDetail(ticket)}>
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
                      className="active:scale-95 transition-transform duration-100"
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
                      className="active:scale-95 transition-transform duration-100"
                      disabled={!meta.hasNextPage}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      {t('next')}
                    </Button>
                  </div>
                </>
              )}
            </SectionCard>
          </TabsContent>

          <TabsContent value="live-chat" className="space-y-7">
            <SectionCard title="Live Chat" description="Queue waiting users, accept sessions, and manage active chats.">
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-xl border bg-background">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <p className="text-sm font-medium">Waiting Users</p>
                    <Button variant="outline" size="sm" onClick={() => void fetchWaitingQueue()} disabled={queueLoading}>
                      {queueLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Refresh
                    </Button>
                  </div>
                  <div className="max-h-136 overflow-y-auto p-2">
                    {queueLoading && waitingUsers.length === 0 ? (
                      <div className="space-y-2 p-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <Skeleton key={`waiting-chat-loading-${index}`} className="h-24 w-full" />
                        ))}
                      </div>
                    ) : waitingUsers.length === 0 ? (
                      <div className="flex min-h-44 items-center justify-center px-3 text-center text-sm text-muted-foreground">
                        No users are waiting right now.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {waitingUsers.map((user) => {
                          const isSelected = selectedChatUserId === user.userId;

                          return (
                            <button
                              key={user.userId}
                              type="button"
                              className={cn(
                                'w-full rounded-lg border px-3 py-3 text-start transition-colors',
                                isSelected
                                  ? 'border-primary/30 bg-primary/5'
                                  : 'border-transparent hover:border-border hover:bg-muted/40'
                              )}
                              onClick={() => {
                                setSelectedChatUserId(user.userId);
                                void fetchActiveChat(user.userId);
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                                </div>
                                <Badge variant="outline" className="shrink-0 capitalize">
                                  {user.status}
                                </Badge>
                              </div>
                              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{user.reason}</p>
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>{Math.floor(user.waitTimeSeconds / 60)}m {user.waitTimeSeconds % 60}s waiting</span>
                                <span>•</span>
                                <span>{user.phone || 'No phone'}</span>
                              </div>
                              <div className="mt-3 flex gap-2">
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleAcceptUser(user.userId);
                                  }}
                                >
                                  Accept
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleIgnoreUser(user.userId);
                                  }}
                                >
                                  Ignore
                                </Button>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex min-h-128 flex-col overflow-hidden rounded-xl border bg-background">
                  <div className="border-b px-4 py-3">
                    {selectedUser && selectedChat ? (
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{selectedUser.name}</p>
                            <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {selectedChat.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{selectedUser.phone || 'No phone'} · {selectedUser.address || 'No address'}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Select a waiting user or accept one to open the chat.</p>
                    )}
                  </div>

                  {!selectedChat || !selectedUser ? (
                    <div className="flex flex-1 items-center justify-center px-6 py-12 text-center text-sm text-muted-foreground">
                      The active chat panel will open here once you select or accept a user.
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col">
                      <div className="grid gap-4 border-b p-4 md:grid-cols-[1fr_auto]">
                        <div className="rounded-xl border bg-muted/20 p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Reason / Subject</p>
                          <p className="mt-2 text-base font-semibold">{selectedChat.reason}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {selectedChat.startedAt ? (
                              <Badge variant="outline" className="font-mono">
                                {(() => {
                                  const startTime = new Date(selectedChat.startedAt).getTime();
                                  const endTime = selectedChat.endedAt ? new Date(selectedChat.endedAt).getTime() : chatNow;
                                  const elapsedSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
                                  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
                                  const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
                                  return `${minutes}:${seconds}`;
                                })()}
                              </Badge>
                            ) : null}
                            <span
                              className={cn(
                                'inline-block h-2 w-2 rounded-full',
                                selectedChat.status === 'active' && 'bg-emerald-500',
                                selectedChat.status === 'waiting' && 'bg-amber-500',
                                selectedChat.status === 'suspended' && 'bg-orange-500',
                                selectedChat.status === 'ended' && 'bg-rose-500'
                              )}
                            />
                            <span>
                              {selectedChat.status === 'waiting' ? 'Waiting for acceptance' : null}
                              {selectedChat.status === 'active' ? 'Chat active' : null}
                              {selectedChat.status === 'suspended' ? `Suspended${selectedChat.suspendedBy ? ` by ${selectedChat.suspendedBy}` : ''}` : null}
                              {selectedChat.status === 'ended' ? 'Chat ended' : null}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 md:items-end">
                          <Button variant="outline" size="sm" onClick={() => void fetchActiveChat(selectedChatUserId)} disabled={!selectedChatUserId || chatLoading}>
                            {chatLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                            Refresh
                          </Button>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => void moderateActiveChat('suspend')} disabled={selectedChat.status !== 'active' || chatLoading}>
                              Suspend
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => void moderateActiveChat('resume')} disabled={selectedChat.status !== 'suspended' || chatLoading}>
                              Resume
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => void moderateActiveChat('end')} disabled={selectedChat.status === 'ended' || chatLoading}>
                              End Chat
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="grid flex-1 gap-0 lg:grid-cols-[0.95fr_1.05fr]">
                        <div className="border-b p-4 lg:border-b-0 lg:border-e">
                          <div className="rounded-xl border bg-card p-4 shadow-sm">
                            <p className="text-sm font-medium">Operator Profile</p>
                            <div className="mt-4 space-y-2 text-sm">
                              <p><span className="text-muted-foreground">Name:</span> {selectedUser.name}</p>
                              <p><span className="text-muted-foreground">Email:</span> {selectedUser.email}</p>
                              <p><span className="text-muted-foreground">Phone:</span> {selectedUser.phone || 'N/A'}</p>
                              <p><span className="text-muted-foreground">Address:</span> {selectedUser.address || 'N/A'}</p>
                              <p><span className="text-muted-foreground">Node count:</span> {selectedUser.nodeCount}</p>
                              <p><span className="text-muted-foreground">Account status:</span> {selectedUser.accountStatus}</p>
                            </div>
                          </div>

                          {selectedChat.operatorTyping && isRecentTimestamp(selectedChat.operatorTyping, 3000) ? (
                            <div className="mt-4 rounded-full border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
                              User is typing...
                            </div>
                          ) : null}

                          {selectedChat.status !== 'active' ? (
                            <div className="mt-4 rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                              {selectedChat.status === 'waiting'
                                ? 'Accept the user to start the conversation.'
                                : selectedChat.status === 'suspended'
                                  ? 'This chat is suspended until you resume it.'
                                  : 'This chat has ended.'}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex min-h-96 flex-col">
                          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                            {selectedChat.messages.length === 0 ? (
                              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                No messages yet.
                              </div>
                            ) : (
                              selectedChat.messages.map((message, index) => {
                                const isUser = message.role === 'user';
                                return (
                                  <div
                                    key={`admin-chat-message-${index}-${message.timestamp}`}
                                    className={cn('flex max-w-[82%] gap-2', isUser ? 'me-auto' : 'ms-auto flex-row-reverse')}
                                  >
                                    <div className={cn('rounded-full p-2', isUser ? 'bg-primary/10' : 'bg-muted')}>
                                      {isUser ? (
                                        <User className="h-4 w-4 text-primary" />
                                      ) : (
                                        <Shield className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                      <p className="text-xs text-muted-foreground">{isUser ? selectedUser.name : 'Support Agent'}</p>
                                      <div
                                        className={cn(
                                          'rounded-2xl px-4 py-2 text-sm',
                                          isUser ? 'rounded-tl-sm bg-muted text-foreground' : 'rounded-tr-sm bg-primary text-primary-foreground'
                                        )}
                                      >
                                        {message.text}
                                      </div>
                                      <p className="text-xs text-muted-foreground">{formatDate(message.timestamp)}</p>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                            <div ref={chatBottomRef} />
                          </div>

                          <div className="border-t bg-card px-4 py-3">
                            <div className="flex gap-2">
                              <Input
                                value={chatReply}
                                onChange={(event) => setChatReply(event.target.value)}
                                placeholder="Type a response..."
                                disabled={!selectedChatUserId || selectedChat.status !== 'active' || chatReplying}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    void sendAdminReply();
                                  }
                                }}
                              />
                              <Button
                                onClick={() => void sendAdminReply()}
                                disabled={!selectedChatUserId || selectedChat.status !== 'active' || !chatReply.trim() || chatReplying}
                              >
                                {chatReplying ? <Loader2 className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>
        </div>
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
                      className="min-h-25"
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
