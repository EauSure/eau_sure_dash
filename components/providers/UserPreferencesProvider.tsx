'use client';

import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { CompleteUserProfile, DashboardPreferences } from '@/types/user-profile';

const DEFAULT_PREFERENCES: DashboardPreferences = {
  compactMode: false,
  sidebarDefaultCollapsed: false,
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  notificationsEnabled: false,
  alertSound: false,
  alertDisplayThreshold: 'all',
  sessionTimeout: 60,
  presenceVisible: true,
  loginHistory: [],
  sensorRefreshRate: 10,
  dashboardDefaultTab: 'overview',
  tempUnit: 'C',
  volumeUnit: 'L',
  reducedMotion: false,
  highContrast: false,
  fontSize: 'md',
  timezone: 'Africa/Tunis',
  language: 'fr',
};

type PreferencePatch = Partial<DashboardPreferences>;

type UserPreferencesContextValue = {
  preferences: DashboardPreferences;
  isLoading: boolean;
  updatePreference: <K extends keyof DashboardPreferences>(key: K, value: DashboardPreferences[K]) => Promise<boolean>;
  updatePreferences: (patch: PreferencePatch) => Promise<boolean>;
  refreshPreferences: () => Promise<void>;
};

const UserPreferencesContext = createContext<UserPreferencesContextValue>({
  preferences: DEFAULT_PREFERENCES,
  isLoading: true,
  updatePreference: async () => false,
  updatePreferences: async () => false,
  refreshPreferences: async () => undefined,
});

function toPreferences(profile?: Partial<CompleteUserProfile> | null): DashboardPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    compactMode: profile?.compactMode ?? DEFAULT_PREFERENCES.compactMode,
    sidebarDefaultCollapsed: profile?.sidebarDefaultCollapsed ?? DEFAULT_PREFERENCES.sidebarDefaultCollapsed,
    dateFormat: profile?.dateFormat ?? DEFAULT_PREFERENCES.dateFormat,
    timeFormat: profile?.timeFormat ?? DEFAULT_PREFERENCES.timeFormat,
    notificationsEnabled: profile?.notificationsEnabled ?? DEFAULT_PREFERENCES.notificationsEnabled,
    alertSound: profile?.alertSound ?? DEFAULT_PREFERENCES.alertSound,
    alertDisplayThreshold: profile?.alertDisplayThreshold ?? DEFAULT_PREFERENCES.alertDisplayThreshold,
    sessionTimeout: profile?.sessionTimeout ?? DEFAULT_PREFERENCES.sessionTimeout,
    presenceVisible: profile?.presenceVisible ?? DEFAULT_PREFERENCES.presenceVisible,
    loginHistory: profile?.loginHistory ?? DEFAULT_PREFERENCES.loginHistory,
    sensorRefreshRate: profile?.sensorRefreshRate ?? DEFAULT_PREFERENCES.sensorRefreshRate,
    dashboardDefaultTab: profile?.dashboardDefaultTab ?? DEFAULT_PREFERENCES.dashboardDefaultTab,
    tempUnit: profile?.tempUnit ?? DEFAULT_PREFERENCES.tempUnit,
    volumeUnit: profile?.volumeUnit ?? DEFAULT_PREFERENCES.volumeUnit,
    reducedMotion: profile?.reducedMotion ?? DEFAULT_PREFERENCES.reducedMotion,
    highContrast: profile?.highContrast ?? DEFAULT_PREFERENCES.highContrast,
    fontSize: profile?.fontSize ?? DEFAULT_PREFERENCES.fontSize,
    timezone: profile?.timezone ?? DEFAULT_PREFERENCES.timezone,
    language: profile?.language ?? DEFAULT_PREFERENCES.language,
  };
}

function applyDocumentPreferences(preferences: DashboardPreferences) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-compact', String(preferences.compactMode));
  root.setAttribute('data-reduced-motion', String(preferences.reducedMotion));
  root.setAttribute('data-high-contrast', String(preferences.highContrast));
  root.setAttribute('data-fontsize', preferences.fontSize);
}

export function UserPreferencesProvider({
  children,
  initialProfile,
}: {
  children: React.ReactNode;
  initialProfile?: Partial<CompleteUserProfile> | null;
}) {
  const [preferences, setPreferences] = useState<DashboardPreferences>(() => toPreferences(initialProfile));
  const [isLoading, setIsLoading] = useState(!initialProfile);

  useLayoutEffect(() => {
    applyDocumentPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', String(preferences.sidebarDefaultCollapsed));
    }
  }, [preferences.sidebarDefaultCollapsed]);

  const refreshPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/me', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) return;
      const profile = (await response.json()) as CompleteUserProfile;
      setPreferences(toPreferences(profile));
    } catch {
      toast.error('Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialProfile) {
      void refreshPreferences();
    }
  }, [initialProfile, refreshPreferences]);

  const updatePreferences = useCallback(async (patch: PreferencePatch) => {
    const previous = preferences;
    const next = { ...preferences, ...patch };
    setPreferences(next);

    try {
      const response = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      const profile = (await response.json()) as CompleteUserProfile;
      setPreferences(toPreferences(profile));
      return true;
    } catch {
      setPreferences(previous);
      toast.error('Failed to save preferences');
      return false;
    }
  }, [preferences]);

  const updatePreference = useCallback(
    async <K extends keyof DashboardPreferences>(key: K, value: DashboardPreferences[K]) => {
      return updatePreferences({ [key]: value } as PreferencePatch);
    },
    [updatePreferences]
  );

  const value = useMemo(
    () => ({
      preferences,
      isLoading,
      updatePreference,
      updatePreferences,
      refreshPreferences,
    }),
    [isLoading, preferences, refreshPreferences, updatePreference, updatePreferences]
  );

  return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>;
}

export function useUserPreferences() {
  return useContext(UserPreferencesContext);
}

export { DEFAULT_PREFERENCES };
