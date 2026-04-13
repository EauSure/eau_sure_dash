'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  ArrowLeft as ArrowLeftIcon,
  Headphones as HeadphonesIcon,
  Loader2,
  MessageCircle as MessageCircleIcon,
  PlusCircle as PlusCircleIcon,
  Send as SendIcon,
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

type SupportView = 'landing' | 'new-ticket' | 'my-tickets' | 'live-chat';

type AdminAvailability = {
  loading: boolean;
  available: boolean;
};

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
  const t = useTranslations('support');
  const isRtl = locale === 'ar';
  const [currentView, setCurrentView] = useState<SupportView>('landing');
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<UserTicket | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [adminAvailability, setAdminAvailability] = useState<AdminAvailability>({
    loading: false,
    available: false,
  });

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

  const fetchAdminAvailability = useCallback(async () => {
    setAdminAvailability((previous) => ({ ...previous, loading: true }));

    try {
      const response = await fetch('/api/admin/online', {
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

      const payload = (await response.json()) as { available: boolean };
      setAdminAvailability({
        loading: false,
        available: payload.available,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
      setAdminAvailability({ loading: false, available: false });
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

      const payload = (await response.json()) as { messages?: ChatMessage[] };
      setChatMessages(payload.messages ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      toast.error(message);
    } finally {
      if (!silent) {
        setLoadingChat(false);
      }
    }
  }, [locale, router, t]);

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

    void fetchAdminAvailability();
    void fetchMyChat();

    const intervalId = window.setInterval(() => {
      void fetchMyChat(true);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentView, fetchAdminAvailability, fetchMyChat, status]);

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
    if (!nextMessage) {
      return;
    }

    try {
      setSendingChat(true);
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: nextMessage }),
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

                {!adminAvailability.loading && !adminAvailability.available ? (
                  <div className="w-full rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
                    <div className="space-y-3 rounded-xl border border-dashed p-6 text-center sm:text-start">
                      <p className="text-base font-semibold">{t('chat.unavailable')}</p>
                      <p className="text-sm text-muted-foreground">{t('chat.unavailableHint')}</p>
                      <Button onClick={() => setCurrentView('new-ticket')} className="w-full sm:w-auto">
                        {t('landing.newTicket')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border bg-card shadow-sm w-full flex flex-col overflow-hidden h-130">
                    <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-4">
                      <div className="rounded-full bg-primary/10 p-2">
                        <HeadphonesIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t('chat.title')}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span
                            className={cn(
                              'inline-block h-1.5 w-1.5 rounded-full',
                              adminAvailability.loading ? 'bg-amber-500' : 'bg-green-500'
                            )}
                          />
                          {adminAvailability.loading ? t('refresh') : t('chat.available')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
                      {loadingChat ? (
                        <div className="space-y-3">
                          <Skeleton className="h-12 w-2/3" />
                          <Skeleton className="ml-auto h-12 w-2/3" />
                        </div>
                      ) : chatMessages.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('chat.empty')}</p>
                      ) : (
                        chatMessages.map((message, index) => {
                          const isUser = message.role === 'user';
                          const displayName = isUser ? t('chat.you') : t('chat.agentName');

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
                                <p className="text-xs font-medium text-muted-foreground">{displayName}</p>
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
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(message.timestamp)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={bottomRef} />
                    </div>

                    <div className="flex gap-2 border-t bg-background px-4 py-3">
                      <Input
                        className="flex-1 rounded-xl border bg-muted/50 px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        placeholder={t('chat.placeholder')}
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            void sendChatMessage();
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        onClick={() => void sendChatMessage()}
                        disabled={!chatInput.trim() || sendingChat}
                      >
                        {sendingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
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
