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
  name: string;
  email: string;
  image?: string;
  isOnline: boolean;
  lastSeen: string | null;
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  units: UnitsPreferences;
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
  timezone?: string;
  preferences?: {
    notifications?: Partial<NotificationPreferences>;
    units?: Partial<UnitsPreferences>;
    language?: string;
  };
}
