'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Filter } from 'bad-words';
import { toast } from 'sonner';
import {
  ArrowLeft as ArrowLeftIcon,
  Headphones as HeadphonesIcon,
  Loader2,
  MessageCircle as MessageCircleIcon,
  PlusCircle as PlusCircleIcon,
  Shield as ShieldIcon,
  Ticket as TicketIcon,
  User as UserIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/useT';
import { isRecentTimestamp, type SerializedChat } from '@/lib/chat';
import {
  ticketCategories,
  ticketCreateSchema,
  ticketPriorities,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/models/Ticket';

type UserTicket = {
  _id: string;
  ticketId: string;
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

type ChatMessage = {
  role: 'user' | 'admin';
  text: string;
  timestamp: string;
};

type SupportChat = SerializedChat;

type SupportView = 'landing' | 'new-ticket' | 'my-tickets' | 'live-chat';

type TicketFormValues = z.infer<typeof ticketCreateSchema>;

const statusBadgeClasses: Record<TicketStatus, string> = {
  open: 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300',
  in_progress: 'border-yellow-500/30 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
  resolved: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  closed: 'border-muted-foreground/30 bg-muted text-muted-foreground',
};

export default function SupportPage() {
  const { status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useT('support');
  const isRtl = locale === 'ar';
  const [currentView, setCurrentView] = useState<SupportView>('landing');
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<UserTicket | null>(null);
  const [chatReason, setChatReason] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [requestingChat, setRequestingChat] = useState(false);
  const [chatSession, setChatSession] = useState<SupportChat | null>(null);
  const [chatNow, setChatNow] = useState(Date.now());
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingPingRef = useRef<number | null>(null);
  const chatFilter = useMemo(() => new Filter(), []);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketCreateSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'bug',
      priority: 'medium',
    },
  });

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

  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true);

    try {
      const response = await fetch('/api/tickets/mine?limit=100&page=1', {
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

      const payload = (await response.json()) as { tickets?: UserTicket[] };
      setTickets(payload.tickets ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
    } finally {
      setLoadingTickets(false);
    }
  }, [locale, router, t]);

  const fetchMyChat = useCallback(async (silent = false) => {
    if (!silent) {
      setLoadingChat(true);
    }

    try {
      const response = await fetch('/api/chat/mine', {
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

      const payload = (await response.json()) as SupportChat;
      setChatSession(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
    } finally {
      if (!silent) {
        setLoadingChat(false);
      }
    }
  }, [locale, router, t]);

  const requestLiveChat = async () => {
    const reason = chatReason.trim();

    if (reason.length < 3) {
      toast.error('Please provide a reason for the chat.');
      return;
    }

    setRequestingChat(true);

    try {
      const response = await fetch('/api/chat/request', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (response.status === 401) {
        router.push(`/${locale}/auth/signin`);
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('error'));
      }

      const payload = (await response.json()) as SupportChat;
      setChatSession(payload);
      setChatReason('');
      toast.success('Support request submitted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
    } finally {
      setRequestingChat(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/${locale}/auth/signin`);
      return;
    }

    if (status === 'authenticated') {
      void fetchTickets();
    }
  }, [fetchTickets, locale, router, status]);

  useEffect(() => {
    if (status !== 'authenticated' || currentView !== 'live-chat') {
      return;
    }

    void fetchMyChat();

    const intervalId = window.setInterval(() => {
      void fetchMyChat(true);
    }, 3000);

    const clockId = window.setInterval(() => {
      setChatNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
      window.clearInterval(clockId);
    };
  }, [currentView, fetchMyChat, status]);

  useEffect(() => {
    if (typingPingRef.current) {
      window.clearTimeout(typingPingRef.current);
      typingPingRef.current = null;
    }

    if (status !== 'authenticated' || currentView !== 'live-chat') {
      return;
    }

    if (!chatSession || !chatInput.trim() || chatSession.status !== 'active') {
      return;
    }

    typingPingRef.current = window.setTimeout(() => {
      void fetch('/api/chat/typing', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
    }, 350);

    return () => {
      if (typingPingRef.current) {
        window.clearTimeout(typingPingRef.current);
        typingPingRef.current = null;
      }
    };
  }, [chatInput, chatSession, currentView, status]);

  const chatMessages: ChatMessage[] = useMemo(() => chatSession?.messages ?? [], [chatSession?.messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const onSubmit = async (values: TicketFormValues) => {
    try {
      setSubmitting(true);
      const response = await fetch('/api/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('error'));
      }

      toast.success(t('toasts.created'));
      form.reset({
        title: '',
        description: '',
        category: 'bug',
        priority: 'medium',
      });
      await fetchTickets();
      setCurrentView('my-tickets');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const sendChatMessage = async () => {
    const nextMessage = chatInput.trim();
    if (!nextMessage || !chatSession || chatSession.status !== 'active') {
      return;
    }

    try {
      setSendingChat(true);
      const sanitizedMessage = chatFilter.clean(nextMessage);
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: sanitizedMessage }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('error'));
      }

      setChatInput('');
      await fetchMyChat();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
    } finally {
      setSendingChat(false);
    }
  };

  const openTicketDetail = (ticket: UserTicket) => {
    setSelectedTicket(ticket);
    setDetailOpen(true);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-[calc(100vh-64px)] px-4 py-10 sm:py-16">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <div className="space-y-2 text-center">
            <HeadphonesIcon className="mx-auto mb-4 h-10 w-10 text-primary opacity-80" />
            <h1 className="text-3xl font-bold">{t('pageTitle')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t('pageSubtitle')}</p>
          </div>

          <div className="space-y-3 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`support-loading-${index}`} className="h-28 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const showAdminNote =
    typeof selectedTicket?.adminNote === 'string' && selectedTicket.adminNote.trim().length > 0;
  const chatStatus = chatSession?.status ?? null;
  const canSendChat = Boolean(chatSession && chatStatus === 'active');
  const isChatLocked = Boolean(chatSession && ['suspended', 'ended'].includes(chatStatus ?? ''));

  const chatElapsedLabel = (() => {
    if (!chatSession?.startedAt) {
      return '00:00';
    }

    const startTime = new Date(chatSession.startedAt).getTime();
    const endTime = chatSession.endedAt ? new Date(chatSession.endedAt).getTime() : chatNow;
    const elapsedSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
    const minutes = Math.floor(elapsedSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  })();

  const renderBackButton = () => (
    <button
      onClick={() => setCurrentView('landing')}
      className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      type="button"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      {t('back')}
    </button>
  );

  const statusBadge = (statusValue: TicketStatus) => (
    <Badge variant="outline" className={statusBadgeClasses[statusValue]}>
      {t(`statuses.${statusValue}`)}
    </Badge>
  );

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-start px-4 py-10 sm:py-16">
      <div className="flex w-full max-w-3xl flex-col gap-8">
        <div className="space-y-2 text-center">
          <HeadphonesIcon className="mx-auto mb-4 h-10 w-10 text-primary opacity-80" />
          <h1 className="text-3xl font-bold text-center">{t('pageTitle')}</h1>
          <p className="mt-2 text-sm text-center text-muted-foreground">{t('pageSubtitle')}</p>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
          >
            {currentView === 'landing' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-6">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-8 text-center shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                  onClick={() => {
                    setCurrentView('my-tickets');
                    void fetchTickets();
                  }}
                  type="button"
                >
                  <div className="rounded-full bg-primary/10 p-4">
                    <TicketIcon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-base font-semibold">{t('landing.myTickets')}</span>
                  <span className="text-xs leading-snug text-muted-foreground">{t('landing.myTicketsDesc')}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-8 text-center shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                  onClick={() => setCurrentView('new-ticket')}
                  type="button"
                >
                  <div className="rounded-full bg-primary/10 p-4">
                    <PlusCircleIcon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-base font-semibold">{t('landing.newTicket')}</span>
                  <span className="text-xs leading-snug text-muted-foreground">{t('landing.newTicketDesc')}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-8 text-center shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                  onClick={() => setCurrentView('live-chat')}
                  type="button"
                >
                  <div className="rounded-full bg-primary/10 p-4">
                    <MessageCircleIcon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-base font-semibold">{t('landing.liveChat')}</span>
                  <span className="text-xs leading-snug text-muted-foreground">{t('landing.liveChatDesc')}</span>
                </motion.button>
              </div>
            ) : null}

            {currentView === 'new-ticket' ? (
              <div className="w-full">
                {renderBackButton()}
                <div className="w-full rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
                  <h2 className="mb-5 text-lg font-semibold">{t('submitTicket')}</h2>
                  <Form {...form}>
                    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('form.title')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('form.titlePlaceholder')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('form.category')}</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('form.category')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categoryOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('form.priority')}</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('form.priority')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {priorityOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('form.description')}</FormLabel>
                            <FormControl>
                              <Textarea className="min-h-40" placeholder={t('form.descriptionPlaceholder')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end">
                        <Button type="submit" disabled={submitting}>
                          {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                          {t('form.submit')}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            ) : null}

            {currentView === 'my-tickets' ? (
              <div className="w-full">
                {renderBackButton()}
                <div className="w-full rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
                  <h2 className="mb-5 text-lg font-semibold">{t('myTickets')}</h2>
                  {loadingTickets ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={`support-ticket-loading-${index}`} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                      {t('noTickets')}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((ticket) => (
                        <button
                          key={ticket._id}
                          type="button"
                          onClick={() => openTicketDetail(ticket)}
                          className="w-full text-left"
                        >
                          <div className="cursor-pointer rounded-xl border bg-background p-4 flex flex-col gap-2 hover:border-primary/30 hover:shadow-sm transition-all">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium leading-snug">{ticket.title}</span>
                              {statusBadge(ticket.status)}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{ticket.ticketId}</span>
                              <span>{t(`categories.${ticket.category}`)}</span>
                              <span>·</span>
                              <span>{formatDate(ticket.createdAt)}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {currentView === 'live-chat' ? (
              <div className="w-full">
                {renderBackButton()}
                <div className="w-full overflow-hidden rounded-2xl border bg-card shadow-sm">
                  <div className="border-b bg-muted/30 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{t('chat.title')}</p>
                        <p className="text-xs text-muted-foreground">Support Agent will respond when your request is accepted.</p>
                      </div>
                      {chatSession ? (
                        <Badge variant="outline" className="capitalize">
                          {chatSession.status}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {!chatSession || chatSession.status === 'ended' ? (
                    <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr]">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h2 className="text-lg font-semibold">Request a live chat</h2>
                          <p className="text-sm text-muted-foreground">
                            Enter a short subject or reason so Support Agent can route your request.
                          </p>
                        </div>
                        <div className="space-y-3">
                          <Textarea
                            className="min-h-36"
                            value={chatReason}
                            onChange={(event) => setChatReason(event.target.value)}
                            placeholder="Example: Sensor readings are inconsistent after reconnecting the gateway"
                          />
                          <Button onClick={() => void requestLiveChat()} disabled={requestingChat || !chatReason.trim()}>
                            {requestingChat ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                            Submit Request
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-background p-4">
                        <p className="text-sm font-medium">Before you start</p>
                        <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                          <p>• Live chat is queued in the order requests are received.</p>
                          <p>• Bad words are filtered before messages are sent.</p>
                          <p>• You can continue using tickets if the chat is paused or ended.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid min-h-128 gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                      <div className="border-b bg-background p-5 lg:border-b-0 lg:border-e">
                        <div className="space-y-4">
                          <div className="rounded-2xl border bg-muted/20 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Reason / Subject</p>
                                <p className="mt-1 text-base font-semibold">{chatSession.reason}</p>
                              </div>
                              {chatSession.startedAt ? (
                                <Badge variant="outline" className="font-mono">
                                  {chatElapsedLabel}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span
                                className={cn(
                                  'inline-block h-2 w-2 rounded-full',
                                  chatSession.status === 'active' && 'bg-emerald-500',
                                  chatSession.status === 'waiting' && 'bg-amber-500',
                                  chatSession.status === 'suspended' && 'bg-orange-500',
                                  chatSession.status === 'ended' && 'bg-rose-500'
                                )}
                              />
                              {chatSession.status === 'waiting' ? 'Waiting for Support Agent' : null}
                              {chatSession.status === 'active' ? 'Support Agent is connected' : null}
                              {chatSession.status === 'suspended' ? `Chat suspended${chatSession.suspendedBy ? ` by ${chatSession.suspendedBy}` : ''}` : null}
                              {chatSession.status === 'ended' ? 'Chat ended' : null}
                            </div>
                          </div>

                          {chatSession.adminTyping && isRecentTimestamp(chatSession.adminTyping, 3000) ? (
                            <div className="rounded-full border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
                              Admin is typing...
                            </div>
                          ) : null}

                          <div className="flex h-88 flex-col gap-3 overflow-y-auto rounded-2xl border bg-background p-4">
                            {loadingChat ? (
                              <div className="space-y-3">
                                <Skeleton className="h-12 w-2/3" />
                                <Skeleton className="ml-auto h-12 w-2/3" />
                              </div>
                            ) : chatMessages.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                {chatSession.status === 'waiting'
                                  ? 'Your request is in the queue. Messages will appear once Support Agent accepts it.'
                                  : 'Start the conversation with Support Agent.'}
                              </p>
                            ) : (
                              chatMessages.map((message, index) => {
                                const isUser = message.role === 'user';
                                return (
                                  <div
                                    key={`chat-message-${index}-${message.timestamp}`}
                                    className={cn(
                                      'flex max-w-[80%] gap-2',
                                      isUser
                                        ? isRtl
                                          ? 'mr-auto flex-row'
                                          : 'ml-auto flex-row-reverse'
                                        : isRtl
                                          ? 'ml-auto flex-row-reverse'
                                          : 'mr-auto'
                                    )}
                                  >
                                    {isUser ? (
                                      <div className="rounded-full bg-primary/10 p-2">
                                        <UserIcon className="h-4 w-4 text-primary" />
                                      </div>
                                    ) : (
                                      <div className="rounded-full bg-muted p-2">
                                        <ShieldIcon className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}

                                    <div className="flex min-w-0 flex-col gap-1">
                                      <p className="text-xs font-medium text-muted-foreground">{isUser ? t('chat.you') : t('chat.agentName')}</p>
                                      <div
                                        className={cn(
                                          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                                          isUser
                                            ? 'rounded-tr-sm bg-primary text-primary-foreground'
                                            : 'rounded-tl-sm bg-muted text-foreground'
                                        )}
                                      >
                                        {message.text}
                                      </div>
                                      <span className="text-xs text-muted-foreground">{formatDate(message.timestamp)}</span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                            <div ref={bottomRef} />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 p-5">
                        <div className="rounded-2xl border bg-background p-4">
                          <p className="text-sm font-medium">Live chat status</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {chatSession.status === 'waiting'
                              ? 'Support Agent has not accepted this chat yet.'
                              : chatSession.status === 'suspended'
                                ? 'Messaging is paused until Support Agent resumes the chat.'
                                : chatSession.status === 'ended'
                                  ? 'This conversation has ended.'
                                  : 'You can send messages now.'}
                          </p>
                        </div>

                        <div className="rounded-2xl border bg-background p-4">
                          <p className="text-sm font-medium">Message</p>
                          <div className="mt-3 flex gap-2">
                            <Textarea
                              className="min-h-28 flex-1"
                              placeholder="Type your message..."
                              value={chatInput}
                              onChange={(event) => setChatInput(event.target.value)}
                              disabled={!canSendChat || sendingChat}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                  event.preventDefault();
                                  void sendChatMessage();
                                }
                              }}
                            />
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="text-xs text-muted-foreground">
                              {isChatLocked ? 'This chat is locked by Support Agent.' : canSendChat ? 'Typing is shared with Support Agent.' : 'Messages can only be sent after the chat is accepted.'}
                            </p>
                            <Button onClick={() => void sendChatMessage()} disabled={!canSendChat || !chatInput.trim() || sendingChat}>
                              {sendingChat ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                              Send
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <AlertDialog open={detailOpen} onOpenChange={setDetailOpen}>
          <AlertDialogContent className="max-w-lg w-full rounded-2xl p-6 sm:p-8">
            {selectedTicket ? (
              <>
                <AlertDialogHeader>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline" className="text-muted-foreground">
                      {selectedTicket.ticketId}
                    </Badge>
                    {statusBadge(selectedTicket.status)}
                  </div>
                  <AlertDialogTitle className="mt-2 text-lg font-semibold">
                    {selectedTicket.title}
                  </AlertDialogTitle>
                </AlertDialogHeader>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t('labels.category')}:</span>{' '}
                    {t(`categories.${selectedTicket.category}`)}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t('labels.priority')}:</span>{' '}
                    {t(`priorities.${selectedTicket.priority}`)}
                  </p>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  {t('labels.submitted')}: {formatDate(selectedTicket.createdAt)}
                </p>

                <div className="mt-6 space-y-2">
                  <p className="text-sm font-medium">{t('labels.description')}</p>
                  <div className="max-h-40 overflow-y-auto rounded-xl border p-3 text-sm leading-6">
                    {selectedTicket.description}
                  </div>
                </div>

                {showAdminNote ? (
                  <div className="mt-6 space-y-2">
                    <p className="text-sm font-medium">{t('adminNote')}</p>
                    <div className="rounded-xl border bg-muted/40 p-3 text-sm italic text-muted-foreground">
                      {selectedTicket.adminNote}
                    </div>
                  </div>
                ) : null}

                <AlertDialogFooter className="mt-6">
                  <AlertDialogCancel>{t('close')}</AlertDialogCancel>
                </AlertDialogFooter>
              </>
            ) : null}
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
