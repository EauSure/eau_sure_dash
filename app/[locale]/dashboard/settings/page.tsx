'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Accessibility,
  AlertTriangle,
  Bell,
  ChevronDown,
  Gauge,
  Lock,
  MonitorCog,
  Save,
  Shield,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/useT';
import { playAlertTone } from '@/lib/alert-tone';
import { useDateFormat } from '@/lib/hooks/useDateFormat';
import { useTimeFormat } from '@/lib/hooks/useTimeFormat';
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider';
import type { DashboardPreferences } from '@/types/user-profile';

type SectionKey = 'appearance' | 'alerts' | 'privacy' | 'dashboard' | 'accessibility' | 'danger';
type PreferencePatch = Partial<DashboardPreferences>;

const timezoneGroups = [
  { labelKey: 'timezoneRegions.africa', zones: ['Africa/Tunis', 'Africa/Cairo', 'Africa/Casablanca', 'Africa/Lagos'] },
  { labelKey: 'timezoneRegions.europe', zones: ['Europe/Paris', 'Europe/London', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam'] },
  { labelKey: 'timezoneRegions.america', zones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'America/Sao_Paulo'] },
  { labelKey: 'timezoneRegions.asia', zones: ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai'] },
  { labelKey: 'timezoneRegions.australiaPacific', zones: ['Australia/Sydney', 'Pacific/Auckland'] },
  { labelKey: 'timezoneRegions.universal', zones: ['UTC'] },
] as const;

const languages = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'العربية' },
] as const;

const DEFAULTS = {
  appearance: {
    language: 'fr',
    timezone: 'Africa/Tunis',
    compactMode: false,
    sidebarDefaultCollapsed: false,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  alerts: {
    notificationsEnabled: false,
    alertSound: false,
    alertDisplayThreshold: 'all',
  },
  privacy: {
    sessionTimeout: 60,
    presenceVisible: true,
  },
  dashboard: {
    sensorRefreshRate: 10,
    dashboardDefaultTab: 'overview',
    tempUnit: 'C',
    volumeUnit: 'L',
  },
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    fontSize: 'md',
  },
} satisfies Record<string, PreferencePatch>;

function formatTimeZoneOffset(timezone: string) {
  try {
    const part = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    })
      .formatToParts(new Date())
      .find((item) => item.type === 'timeZoneName')?.value;

    return part ? part.replace('GMT', 'UTC') : 'UTC+00:00';
  } catch {
    return 'UTC+00:00';
  }
}

function getSectionPatch(section: Exclude<SectionKey, 'danger'>, draft: DashboardPreferences): PreferencePatch {
  if (section === 'appearance') {
    return {
      language: draft.language,
      timezone: draft.timezone,
      compactMode: draft.compactMode,
      sidebarDefaultCollapsed: draft.sidebarDefaultCollapsed,
      dateFormat: draft.dateFormat,
      timeFormat: draft.timeFormat,
    };
  }
  if (section === 'alerts') {
    return {
      notificationsEnabled: draft.notificationsEnabled,
      alertSound: draft.alertSound,
      alertDisplayThreshold: draft.alertDisplayThreshold,
    };
  }
  if (section === 'privacy') {
    return {
      sessionTimeout: draft.sessionTimeout,
      presenceVisible: draft.presenceVisible,
    };
  }
  if (section === 'dashboard') {
    return {
      sensorRefreshRate: draft.sensorRefreshRate,
      dashboardDefaultTab: draft.dashboardDefaultTab,
      tempUnit: draft.tempUnit,
      volumeUnit: draft.volumeUnit,
    };
  }
  return {
    reducedMotion: draft.reducedMotion,
    highContrast: draft.highContrast,
    fontSize: draft.fontSize,
  };
}

function hasChanges(patch: PreferencePatch, preferences: DashboardPreferences) {
  return Object.entries(patch).some(([key, value]) => preferences[key as keyof DashboardPreferences] !== value);
}

function customizedCount(defaults: PreferencePatch, draft: DashboardPreferences) {
  return Object.entries(defaults).filter(([key, value]) => draft[key as keyof DashboardPreferences] !== value).length;
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  const { preferences } = useUserPreferences();

  return (
    <motion.div
      initial={preferences.reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={preferences.reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: preferences.reducedMotion ? 0 : 0.18, ease: 'easeOut' }}
      className="flex flex-col gap-3 border-b border-border/60 py-4 last:border-b-0 md:flex-row md:items-center md:justify-between"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 justify-start md:justify-end">{children}</div>
    </motion.div>
  );
}

function PermissionStatus({ status }: { status: NotificationPermission | 'unsupported' }) {
  const color =
    status === 'granted'
      ? 'bg-emerald-500'
      : status === 'denied'
        ? 'bg-red-500'
        : 'bg-gray-400';
  return <span className={cn('me-2 inline-block h-2 w-2 rounded-full', color)} />;
}

export default function SettingsPage() {
  const t = useT('settings');
  const tCommon = useT('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { preferences, updatePreferences, updatePreference } = useUserPreferences();
  const { formatDate } = useDateFormat();
  const { formatTime } = useTimeFormat();
  const [openSection, setOpenSection] = useState<SectionKey>('appearance');
  const [savingSection, setSavingSection] = useState<SectionKey | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [draft, setDraft] = useState<DashboardPreferences>(preferences);
  const reduceMotion = preferences.reducedMotion;

  useEffect(() => {
    setDraft(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }
    setNotificationPermission(Notification.permission);
  }, []);

  const timezoneOptions = useMemo(
    () =>
      timezoneGroups.map((group) => ({
        ...group,
        zones: group.zones.map((zone) => ({
          value: zone,
          label: `(${formatTimeZoneOffset(zone)}) ${zone}`,
        })),
      })),
    []
  );

  const setDraftValue = <K extends keyof DashboardPreferences>(key: K, value: DashboardPreferences[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveSection = async (section: Exclude<SectionKey, 'danger'>) => {
    const patch = getSectionPatch(section, draft);
    setSavingSection(section);

    if (section === 'appearance' && draft.language !== locale) {
      await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: draft.language }),
      });
    }

    const saved = await updatePreferences(patch);
    setSavingSection(null);

    if (saved) {
      toast.success(t('toasts.saved'));
      if (section === 'appearance' && draft.language !== locale) {
        router.replace(pathname, { locale: draft.language });
      }
    }
  };

  const handleBrowserNotifications = async (checked: boolean) => {
    if (!checked) {
      setDraftValue('notificationsEnabled', false);
      await updatePreference('notificationsEnabled', false);
      return;
    }

    if (!('Notification' in window)) {
      toast.warning(t('notifications.browserUnsupported'));
      return;
    }

    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
    setNotificationPermission(permission);

    if (permission === 'granted') {
      setDraftValue('notificationsEnabled', true);
      await updatePreference('notificationsEnabled', true);
      toast.success(t('notifications.browserGranted'));
      return;
    }

    setDraftValue('notificationsEnabled', false);
    toast.warning(t('notifications.browserDenied'));
  };

  const sections = [
    { key: 'appearance' as const, icon: MonitorCog, title: t('sections.appearance'), defaults: DEFAULTS.appearance },
    { key: 'alerts' as const, icon: Bell, title: t('sections.alerts'), defaults: DEFAULTS.alerts },
    { key: 'privacy' as const, icon: Shield, title: t('sections.privacy'), defaults: DEFAULTS.privacy },
    { key: 'dashboard' as const, icon: Gauge, title: t('sections.dashboard'), defaults: DEFAULTS.dashboard },
    { key: 'accessibility' as const, icon: Accessibility, title: t('sections.accessibility'), defaults: DEFAULTS.accessibility },
    { key: 'danger' as const, icon: Lock, title: t('sections.danger'), defaults: {} },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
        >
          <div className="mb-6 flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">EauSure · Settings</p>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{t('title')}</h1>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">{t('description')}</p>
          </div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : 'hidden'}
          animate={reduceMotion ? undefined : 'show'}
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.045,
              },
            },
          }}
          className="space-y-4"
        >
          {sections.map((section, index) => {
            const Icon = section.icon;
            const isOpen = openSection === section.key;
            const isDanger = section.key === 'danger';
            const sectionPatch = isDanger ? {} : getSectionPatch(section.key, draft);
            const dirty = !isDanger && hasChanges(sectionPatch, preferences);
            const count = customizedCount(section.defaults, draft);

            return (
              <motion.section
                key={section.key}
                layout={reduceMotion ? false : 'position'}
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0 },
                }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
                whileHover={reduceMotion ? undefined : { y: -1 }}
                className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
              >
                <button
                  type="button"
                  className="group flex w-full items-center justify-between gap-4 border-s-4 border-s-primary px-5 py-4 text-start transition-colors duration-150 hover:bg-muted/35"
                  onClick={() => setOpenSection(isOpen ? 'appearance' : section.key)}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <motion.span
                      initial={false}
                      animate={reduceMotion ? undefined : { scale: isOpen ? 1.08 : 1 }}
                      transition={{ duration: reduceMotion ? 0 : 0.18 }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                    >
                      <Icon className="h-5 w-5" />
                    </motion.span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{section.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {section.title} · {count} {t(count === 1 ? 'customizedSingular' : 'customizedPlural')}
                        {dirty ? ` · ${t('unsaved')}` : ''}
                      </span>
                    </span>
                  </span>
                  <motion.span
                    initial={false}
                    animate={reduceMotion ? undefined : { rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
                    className="shrink-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key={`${section.key}-content-${index}`}
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={reduceMotion ? undefined : { height: 'auto', opacity: 1 }}
                      exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.24, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <motion.div
                        initial={reduceMotion ? false : { y: -6 }}
                        animate={reduceMotion ? undefined : { y: 0 }}
                        exit={reduceMotion ? undefined : { y: -4 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
                        className="px-5 pb-5"
                      >
                    {section.key === 'appearance' && (
                      <>
                        <SettingRow label={t('regional.language')} description={t('regional.languageDescription')}>
                          <Select value={draft.language} onValueChange={(value) => setDraftValue('language', value)}>
                            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {languages.map((language) => <SelectItem key={language.value} value={language.value}>{language.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </SettingRow>
                        <SettingRow label={t('timezone')} description={t('regional.timezoneDescription')}>
                          <Select value={draft.timezone} onValueChange={(value) => setDraftValue('timezone', value)}>
                            <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {timezoneOptions.map((group) => (
                                <SelectGroup key={group.labelKey}>
                                  <SelectLabel>{t(group.labelKey)}</SelectLabel>
                                  {group.zones.map((zone) => <SelectItem key={zone.value} value={zone.value}>{zone.label}</SelectItem>)}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                        </SettingRow>
                        <SettingRow label={t('appearance.compactMode')} description={t('appearance.compactModeDescription')}>
                          <Switch checked={draft.compactMode} onCheckedChange={(value) => setDraftValue('compactMode', value)} />
                        </SettingRow>
                        <SettingRow label={t('appearance.sidebarDefaultCollapsed')} description={t('appearance.sidebarDefaultCollapsedDescription')}>
                          <Switch checked={draft.sidebarDefaultCollapsed} onCheckedChange={(value) => setDraftValue('sidebarDefaultCollapsed', value)} />
                        </SettingRow>
                        <SettingRow label={t('appearance.dateFormat')} description={t('appearance.dateFormatDescription')}>
                          <Select value={draft.dateFormat} onValueChange={(value) => setDraftValue('dateFormat', value as DashboardPreferences['dateFormat'])}>
                            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                              <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                            </SelectContent>
                          </Select>
                        </SettingRow>
                        <SettingRow label={t('appearance.timeFormat')} description={t('appearance.timeFormatDescription')}>
                          <Switch checked={draft.timeFormat === '24h'} onCheckedChange={(value) => setDraftValue('timeFormat', value ? '24h' : '12h')} />
                        </SettingRow>
                      </>
                    )}

                    {section.key === 'alerts' && (
                      <>
                        <SettingRow label={t('notifications.browserNotifications')} description={t('notifications.browserNotificationsDescription')}>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              <PermissionStatus status={notificationPermission} />
                              {t(`notifications.permission.${notificationPermission}`)}
                            </span>
                            <Switch checked={draft.notificationsEnabled} onCheckedChange={(value) => void handleBrowserNotifications(value)} />
                          </div>
                        </SettingRow>
                        <SettingRow label={t('notifications.alertSound')} description={t('notifications.alertSoundDescription')}>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={playAlertTone}>
                              <Volume2 className="me-2 h-4 w-4" />
                              {t('notifications.testSound')}
                            </Button>
                            <Switch checked={draft.alertSound} onCheckedChange={(value) => setDraftValue('alertSound', value)} />
                          </div>
                        </SettingRow>
                        <SettingRow label={t('notifications.alertThreshold')} description={t('notifications.alertThresholdDescription')}>
                          <Select value={draft.alertDisplayThreshold} onValueChange={(value) => setDraftValue('alertDisplayThreshold', value as DashboardPreferences['alertDisplayThreshold'])}>
                            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('notifications.thresholds.all')}</SelectItem>
                              <SelectItem value="medium">{t('notifications.thresholds.medium')}</SelectItem>
                              <SelectItem value="high">{t('notifications.thresholds.high')}</SelectItem>
                              <SelectItem value="critical">{t('notifications.thresholds.critical')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </SettingRow>
                      </>
                    )}

                    {section.key === 'privacy' && (
                      <>
                        <SettingRow label={t('privacy.sessionTimeout')} description={t('privacy.sessionTimeoutDescription')}>
                          <Select value={String(draft.sessionTimeout)} onValueChange={(value) => setDraftValue('sessionTimeout', Number(value))}>
                            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30">{t('privacy.timeout.30')}</SelectItem>
                              <SelectItem value="60">{t('privacy.timeout.60')}</SelectItem>
                              <SelectItem value="120">{t('privacy.timeout.120')}</SelectItem>
                              <SelectItem value="240">{t('privacy.timeout.240')}</SelectItem>
                              <SelectItem value="0">{t('privacy.timeout.never')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </SettingRow>
                        {draft.sessionTimeout === 0 && (
                          <div className="mb-2 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                            <AlertTriangle className="h-4 w-4" />
                            {t('privacy.neverWarning')}
                          </div>
                        )}
                        <SettingRow label={t('privacy.presenceVisible')} description={t('privacy.presenceVisibleDescription')}>
                          <Switch checked={draft.presenceVisible} onCheckedChange={(value) => setDraftValue('presenceVisible', value)} />
                        </SettingRow>
                        <div className="py-4">
                          <p className="text-sm font-medium text-foreground">{t('privacy.loginHistory')}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{t('privacy.loginHistoryDescription')}</p>
                          <div className="mt-3 space-y-2">
                            {draft.loginHistory.length === 0 ? (
                              <p className="text-xs text-muted-foreground">{t('privacy.noLoginHistory')}</p>
                            ) : draft.loginHistory.slice(0, 5).map((entry, index) => (
                              <div key={`${entry.timestamp}-${index}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs">
                                <span>{formatDate(entry.timestamp)} {formatTime(entry.timestamp)}</span>
                                <span className="text-muted-foreground">{entry.timezone}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {section.key === 'dashboard' && (
                      <>
                        <SettingRow label={t('dashboardBehavior.refreshRate')} description={t('dashboardBehavior.refreshRateDescription')}>
                          <Select value={String(draft.sensorRefreshRate)} onValueChange={(value) => setDraftValue('sensorRefreshRate', Number(value))}>
                            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">{t('dashboardBehavior.refresh.5')}</SelectItem>
                              <SelectItem value="10">{t('dashboardBehavior.refresh.10')}</SelectItem>
                              <SelectItem value="30">{t('dashboardBehavior.refresh.30')}</SelectItem>
                              <SelectItem value="0">{t('dashboardBehavior.refresh.manual')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </SettingRow>
                        <SettingRow label={t('dashboardBehavior.defaultTab')} description={t('dashboardBehavior.defaultTabDescription')}>
                          <Select value={draft.dashboardDefaultTab} onValueChange={(value) => setDraftValue('dashboardDefaultTab', value as DashboardPreferences['dashboardDefaultTab'])}>
                            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="overview">{t('dashboardBehavior.tabs.overview')}</SelectItem>
                              <SelectItem value="live">{t('dashboardBehavior.tabs.live')}</SelectItem>
                              <SelectItem value="alerts">{t('dashboardBehavior.tabs.alerts')}</SelectItem>
                              <SelectItem value="devices">{t('dashboardBehavior.tabs.devices')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </SettingRow>
                        <SettingRow label={t('units.temperature')} description={t('units.temperatureDescription')}>
                          <Select value={draft.tempUnit} onValueChange={(value) => setDraftValue('tempUnit', value as DashboardPreferences['tempUnit'])}>
                            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="C">{t('units.celsius')}</SelectItem>
                              <SelectItem value="F">{t('units.fahrenheit')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </SettingRow>
                        <SettingRow label={t('units.volume')} description={t('units.volumeDescription')}>
                          <Select value={draft.volumeUnit} onValueChange={(value) => setDraftValue('volumeUnit', value as DashboardPreferences['volumeUnit'])}>
                            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="L">{t('units.liters')}</SelectItem>
                              <SelectItem value="gal">{t('units.gallons')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </SettingRow>
                      </>
                    )}

                    {section.key === 'accessibility' && (
                      <>
                        <SettingRow label={t('accessibility.reducedMotion')} description={t('accessibility.reducedMotionDescription')}>
                          <Switch checked={draft.reducedMotion} onCheckedChange={(value) => setDraftValue('reducedMotion', value)} />
                        </SettingRow>
                        <SettingRow label={t('accessibility.highContrast')} description={t('accessibility.highContrastDescription')}>
                          <Switch checked={draft.highContrast} onCheckedChange={(value) => setDraftValue('highContrast', value)} />
                        </SettingRow>
                        <SettingRow label={t('accessibility.fontSize')} description={t('accessibility.fontSizeDescription')}>
                          <Select value={draft.fontSize} onValueChange={(value) => setDraftValue('fontSize', value as DashboardPreferences['fontSize'])}>
                            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sm">{t('accessibility.font.sm')}</SelectItem>
                              <SelectItem value="md">{t('accessibility.font.md')}</SelectItem>
                              <SelectItem value="lg">{t('accessibility.font.lg')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </SettingRow>
                      </>
                    )}

                    {section.key === 'danger' ? (
                      <div className="py-4">
                        <p className="text-sm font-medium text-foreground">{t('danger.password')}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{t('danger.passwordDescription')}</p>
                        <Button className="mt-4" variant="outline" onClick={() => router.push('/auth/forgot-password', { locale })}>
                          <Lock className="me-2 h-4 w-4" />
                          {t('danger.passwordLink')}
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-5 flex justify-end">
                        <motion.div whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
                          <Button
                          type="button"
                          disabled={!dirty || savingSection === section.key}
                          onClick={() => void saveSection(section.key)}
                        >
                          <Save className="me-2 h-4 w-4" />
                          {savingSection === section.key ? tCommon('loading') : tCommon('save')}
                          </Button>
                        </motion.div>
                      </div>
                    )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
