// Extended profile data (stored in userProfiles collection)
// Note: name, email, image are stored in NextAuth's users collection
export interface UserProfile {
  userId: string;
  bio?: string;
  organization?: string;
  role?: string;
  phone?: string;
  timezone: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

// Complete profile (merged from users + userProfiles)
export interface CompleteUserProfile extends UserProfile {
  id: string;
  name: string;
  email: string;
  address?: string;
  role?: string;
  profileRole?: string;
  userRole: 'user' | 'admin';
  image?: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  iotNodeCount: number;
  isOnline: boolean;
  lastSeen: string | null;
  compactMode: boolean;
  sidebarDefaultCollapsed: boolean;
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
  notificationsEnabled: boolean;
  alertSound: boolean;
  alertDisplayThreshold: AlertDisplayThreshold;
  sessionTimeout: number;
  presenceVisible: boolean;
  loginHistory: LoginHistoryEntry[];
  sensorRefreshRate: number;
  dashboardDefaultTab: DashboardDefaultTab;
  tempUnit: TempUnitPreference;
  volumeUnit: VolumeUnitPreference;
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: FontSizePreference;
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  units: UnitsPreferences;
  language: string;
}

export type DateFormatPreference = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type TimeFormatPreference = '24h' | '12h';
export type AlertDisplayThreshold = 'all' | 'medium' | 'high' | 'critical';
export type DashboardDefaultTab = 'overview' | 'live' | 'alerts' | 'devices';
export type TempUnitPreference = 'C' | 'F';
export type VolumeUnitPreference = 'L' | 'gal';
export type FontSizePreference = 'sm' | 'md' | 'lg';

export interface LoginHistoryEntry {
  timestamp: string | Date;
  timezone: string;
}

export interface DashboardPreferences {
  compactMode: boolean;
  sidebarDefaultCollapsed: boolean;
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
  notificationsEnabled: boolean;
  alertSound: boolean;
  alertDisplayThreshold: AlertDisplayThreshold;
  sessionTimeout: number;
  presenceVisible: boolean;
  loginHistory: LoginHistoryEntry[];
  sensorRefreshRate: number;
  dashboardDefaultTab: DashboardDefaultTab;
  tempUnit: TempUnitPreference;
  volumeUnit: VolumeUnitPreference;
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: FontSizePreference;
  timezone: string;
  language: string;
}

export interface NotificationPreferences {
  emailAlerts: boolean;
  criticalOnly: boolean;
  dailySummary: boolean;
  maintenanceReminders: boolean;
}

export interface UnitsPreferences {
  temperature: 'celsius' | 'fahrenheit';
  distance: 'metric' | 'imperial';
}

export interface UpdateProfileInput {
  // These fields update NextAuth's users collection
  name?: string;
  image?: string;
  // These fields update userProfiles collection
  bio?: string;
  organization?: string;
  role?: string;
  phone?: string;
  address?: string;
  timezone?: string;
  language?: string;
  theme?: 'light' | 'dark' | 'system';
  sidebarCollapsed?: boolean;
  compactMode?: boolean;
  sidebarDefaultCollapsed?: boolean;
  dateFormat?: DateFormatPreference;
  timeFormat?: TimeFormatPreference;
  notificationsEnabled?: boolean;
  alertSound?: boolean;
  alertDisplayThreshold?: AlertDisplayThreshold;
  sessionTimeout?: number;
  presenceVisible?: boolean;
  sensorRefreshRate?: number;
  dashboardDefaultTab?: DashboardDefaultTab;
  tempUnit?: TempUnitPreference;
  volumeUnit?: VolumeUnitPreference;
  reducedMotion?: boolean;
  highContrast?: boolean;
  fontSize?: FontSizePreference;
  preferences?: {
    notifications?: Partial<NotificationPreferences>;
    units?: Partial<UnitsPreferences>;
    language?: string;
  };
}
