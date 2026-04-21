'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import type { CompleteUserProfile } from '@/types/user-profile';
import { AvatarSelector } from '@/components/avatar-selector';
import { PhoneInput } from '@/components/ui/phone-input';
import { useT } from '@/lib/useT';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  image: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional().or(z.literal('')),
  organization: z.string().max(100).optional().or(z.literal('')),
  role: z.string().max(100).optional().or(z.literal('')),
  phone: z.string().max(20).regex(/^[+()\d\s.-]*$/, 'Invalid phone format').optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { status, update } = useSession();
  const router = useRouter();
  const params = useParams<{ locale?: string | string[] }>();
  const t = useT('profile');
  const tCommon = useT('common');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<CompleteUserProfile | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      image: '',
      bio: '',
      organization: '',
      role: '',
      phone: '',
      address: '',
    },
  });

  const locale = Array.isArray(params?.locale)
    ? (params.locale[0] ?? 'fr')
    : (params?.locale ?? 'fr');

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.status === 401) {
        router.push(`/${locale}/auth/signin`);
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
        name: data.name,
        image: data.image || '',
        bio: data.bio || '',
        organization: data.organization || '',
        role: data.profileRole || '',
        phone: data.phone || '',
        address: data.address || '',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [form, locale, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/${locale}/auth/signin`);
      return;
    }

    if (status === 'authenticated') {
      void fetchProfile();
    }
  }, [fetchProfile, locale, status, router]);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Profile update failed:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updatedProfile: CompleteUserProfile = await response.json();
      setProfile(updatedProfile);
      
      // Reset form with updated data to clear dirty state
      form.reset({
        name: updatedProfile.name,
        image: updatedProfile.image || '',
        bio: updatedProfile.bio || '',
        organization: updatedProfile.organization || '',
        role: updatedProfile.profileRole || '',
        phone: updatedProfile.phone || '',
        address: updatedProfile.address || '',
      });

      // Update session to reflect new avatar/name in UI
      await update();

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (profile) {
      form.reset({
        name: profile.name,
        image: profile.image || '',
        bio: profile.bio || '',
        organization: profile.organization || '',
        role: profile.profileRole || '',
        phone: profile.phone || '',
        address: profile.address || '',
      });
      toast.info('Changes discarded');
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userInitials = form.watch('name')
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const isDirty = form.formState.isDirty;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0 }}>
          <div className="mb-6 flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">EauSure · Profile</p>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{t('title')}</h1>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-muted-foreground">{t('description')}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.07 }}>
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
            <div className="py-5 ps-6 pe-5">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Identity</span>
                  <span className="text-base font-bold text-gray-900 dark:text-foreground">{t('personalInfo')}</span>
                </div>
              </div>
            </div>
            <CardContent>
              <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Avatar Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24 border-2 border-border">
                      <AvatarImage 
                        src={form.watch('image') || undefined} 
                        key={form.watch('image')}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium mb-1">Profile Picture</h3>
                      <p className="text-xs text-muted-foreground">
                        Choose from suggested avatars or provide your own image
                      </p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <AvatarSelector
                            currentAvatar={field.value || ''}
                            userName={form.watch('name') || 'User'}
                            onAvatarChange={(url) => {
                              field.onChange(url);
                              form.trigger('image');
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fullName')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('fullNamePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about yourself..."
                          className="min-h-25 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Brief description for your profile (max 500 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="organization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('company')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('companyPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('role')}</FormLabel>
                        <FormControl>
                          <Input placeholder="Your job title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('phone')}</FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder={t('phonePlaceholder')}
                        />
                      </FormControl>
                      <FormDescription>{t('phoneDescription')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('location')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('locationPlaceholder')} {...field} />
                      </FormControl>
                      <FormDescription>{t('locationDescription')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-center gap-3 pt-4">
                  <Button type="submit" className="active:scale-95 transition-transform duration-100" disabled={!isDirty || isSaving}>
                    {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {tCommon('save')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="active:scale-95 transition-transform duration-100"
                    onClick={handleDiscard}
                    disabled={!isDirty || isSaving}
                  >
                    {tCommon('discard')}
                  </Button>
                </div>
              </form>
            </Form>
            </CardContent>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
