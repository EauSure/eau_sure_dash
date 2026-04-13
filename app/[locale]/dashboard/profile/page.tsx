'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Loader2, User as UserIcon } from 'lucide-react';
import type { CompleteUserProfile } from '@/types/user-profile';
import { AvatarSelector } from '@/components/avatar-selector';
import { PhoneInput } from '@/components/ui/phone-input';

const profileFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  image: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional().or(z.literal('')),
  organization: z.string().max(100).optional().or(z.literal('')),
  role: z.string().max(100).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const params = useParams<{ locale?: string | string[] }>();
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
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
    },
  });

  const locale = Array.isArray(params?.locale)
    ? (params.locale[0] ?? 'fr')
    : (params?.locale ?? 'fr');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/fr/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchProfile();
    }
  }, [status, router]);

  const fetchProfile = async () => {
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
        role: data.role || '',
        phone: data.phone || '',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

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
        role: updatedProfile.role || '',
        phone: updatedProfile.phone || '',
      });

      // Update session to reflect new avatar/name in UI
      await update();

      toast.success('Profile updated successfully');
      
      // Force a hard refresh to update session in all components
      window.location.reload();
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
        role: profile.role || '',
        phone: profile.phone || '',
      });
      toast.info('Changes discarded');
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-100">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
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
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('description')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('personalInfo')}</CardTitle>
            <CardDescription>
              {t('personalInfoDescription')}
            </CardDescription>
          </CardHeader>
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

                <div className="flex justify-center gap-3 pt-4">
                  <Button type="submit" disabled={!isDirty || isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {tCommon('save')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDiscard}
                    disabled={!isDirty || isSaving}
                  >
                    {tCommon('discard')}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
