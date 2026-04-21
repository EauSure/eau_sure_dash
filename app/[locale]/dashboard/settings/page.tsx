'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { useRouter, usePathname } from '@/i18n/routing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Loader2, Globe, Bell, Gauge, Save, X } from 'lucide-react';
import { useT } from '@/lib/useT';
import type { CompleteUserProfile } from '@/types/user-profile';

const settingsFormSchema = z.object({
  timezone: z.string(),
  notifications: z.object({
    emailAlerts: z.boolean(),
    criticalOnly: z.boolean(),
    dailySummary: z.boolean(),
    maintenanceReminders: z.boolean(),
  }),
  units: z.object({
    temperature: z.enum(['celsius', 'fahrenheit']),
    distance: z.enum(['metric', 'imperial']),
  }),
  language: z.string(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const timezones = [
  { value: 'Africa/Tunis', label: 'Africa/Tunis (GMT+1)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'America/New_York', label: 'America/New York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'UTC', label: 'UTC' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'العربية' },
];

export default function SettingsPage() {
  const t = useT('settings');
  const tCommon = useT('common');
  const currentLocale = useLocale();
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<CompleteUserProfile | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      timezone: 'Africa/Tunis',
      notifications: {
        emailAlerts: true,
        criticalOnly: false,
        dailySummary: true,
        maintenanceReminders: true,
      },
      units: {
        temperature: 'celsius',
        distance: 'metric',
      },
      language: currentLocale,
    },
  });

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.status === 401) {
        router.push('/auth/signin', { locale: currentLocale });
        return;
      }

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const message =
          typeof errorPayload?.error === 'string'
            ? errorPayload.error
            : `HTTP ${response.status}`;
        throw new Error(message);
      }

      const data: CompleteUserProfile = await response.json();
      setProfile(data);
      
      // Update form with fetched data
      form.reset({
        timezone: data.timezone,
        notifications: data.preferences.notifications,
        units: data.preferences.units,
        language: data.preferences.language,
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [currentLocale, form, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/${currentLocale}/auth/signin`);
      return;
    }

    if (status === 'authenticated') {
      void fetchProfile();
    }
  }, [currentLocale, fetchProfile, status, router]);

  const onSubmit = async (values: SettingsFormValues) => {
    try {
      setIsSaving(true);
      
      const languageChanged = values.language !== currentLocale;

      // Update locale cookie if language changed
      if (languageChanged) {
        await fetch('/api/locale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale: values.language }),
        });
      }

      const response = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timezone: values.timezone,
          preferences: {
            notifications: values.notifications,
            units: values.units,
            language: values.language,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const updatedProfile: CompleteUserProfile = await response.json();
      setProfile(updatedProfile);
      
      // Reset form with updated data to clear dirty state
      form.reset({
        timezone: updatedProfile.timezone,
        notifications: updatedProfile.preferences.notifications,
        units: updatedProfile.preferences.units,
        language: updatedProfile.preferences.language,
      });

      toast.success(tCommon('allChangesSaved'));
      
      if (languageChanged) {
        router.replace(pathname, { locale: values.language });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (profile) {
      form.reset({
        timezone: profile.timezone,
        notifications: profile.preferences.notifications,
        units: profile.preferences.units,
        language: profile.preferences.language,
      });
      toast.info(tCommon('discard'));
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isDirty = form.formState.isDirty;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0 }}>
          <div className="mb-6 flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">EauSure · Settings</p>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{t('title')}</h1>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">{t('description')}</p>
          </div>
        </motion.div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="regional" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="regional">
                  <Globe className="h-4 w-4 mr-2" />
                  {t('tabs.regional')}
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  <Bell className="h-4 w-4 mr-2" />
                  {t('tabs.notifications')}
                </TabsTrigger>
                <TabsTrigger value="units">
                  <Gauge className="h-4 w-4 mr-2" />
                  {t('tabs.units')}
                </TabsTrigger>
              </TabsList>

              {/* Regional Settings Tab */}
              <TabsContent value="regional" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      {t('regional.title')}
                    </CardTitle>
                    <CardDescription>
                      {t('regional.description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('regional.timezone')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('regional.timezone')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timezones.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {t('regional.timezoneDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <FormField
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('regional.language')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('regional.language')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {languages.map((lang) => (
                                <SelectItem key={lang.value} value={lang.value}>
                                  {lang.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {t('regional.languageDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      {t('notifications.title')}
                    </CardTitle>
                    <CardDescription>
                      {t('notifications.description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="notifications.emailAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">{t('notifications.emailAlerts')}</FormLabel>
                            <FormDescription className="text-sm">
                              {t('notifications.emailAlertsDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notifications.criticalOnly"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">{t('notifications.criticalOnly')}</FormLabel>
                            <FormDescription className="text-sm">
                              {t('notifications.criticalOnlyDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <FormField
                      control={form.control}
                      name="notifications.dailySummary"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">{t('notifications.dailySummary')}</FormLabel>
                            <FormDescription className="text-sm">
                              {t('notifications.dailySummaryDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notifications.maintenanceReminders"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">{t('notifications.maintenanceReminders')}</FormLabel>
                            <FormDescription className="text-sm">
                              {t('notifications.maintenanceRemindersDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Units Tab */}
              <TabsContent value="units" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gauge className="h-5 w-5 text-muted-foreground" />
                      {t('units.title')}
                    </CardTitle>
                    <CardDescription>
                      {t('units.description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="units.temperature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('units.temperature')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="celsius">Celsius (°C)</SelectItem>
                                <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {t('units.temperatureDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="units.distance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('units.distance')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="metric">Metric (m, km)</SelectItem>
                                <SelectItem value="imperial">Imperial (ft, mi)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {t('units.distanceDescription')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">{t('units.note')}</p>
                      <p>{t('units.noteText')}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Action Bar */}
            <Card className="relative overflow-hidden border border-gray-100 shadow-sm dark:border-border">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium">
                      {isDirty ? tCommon('unsavedChanges') : tCommon('allChangesSaved')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isDirty 
                        ? t('actionBar.unsavedMessage')
                        : t('actionBar.savedMessage')
                      }
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="active:scale-95 transition-transform duration-100"
                      onClick={handleDiscard}
                      disabled={!isDirty || isSaving}
                    >
                      <X className="me-2 h-4 w-4" />
                      {tCommon('discard')}
                    </Button>
                    <Button type="submit" className="active:scale-95 transition-transform duration-100" disabled={!isDirty || isSaving}>
                      {isSaving ? (
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="me-2 h-4 w-4" />
                      )}
                      {tCommon('save')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}
