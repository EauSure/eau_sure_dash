import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { Db } from 'mongodb';
import { z } from 'zod';
import { dbConnect } from '@/lib/mongodb';
import { sessionCookieName } from '@/lib/session-cookie';
import type { User } from '@/lib/user';
import type { UserProfile, CompleteUserProfile, UserPreferences } from '@/types/user-profile';

const DB_NAME = process.env.MONGODB_DB || 'water_quality';
const USERS_COLLECTION = 'users';
const PROFILES_COLLECTION = 'userProfiles';

const DEFAULT_TIMEZONE = 'Africa/Tunis';
const DEFAULT_LANGUAGE = 'fr';
const DEFAULT_THEME = 'system';
const DEFAULT_DATE_FORMAT = 'DD/MM/YYYY';
const DEFAULT_TIME_FORMAT = '24h';

function isValidTimeZone(value: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .regex(/^[+()\d\s.-]*$/, 'Invalid phone format')
  .optional()
  .or(z.literal(''));

const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: phoneSchema,
    address: z.string().trim().max(200).optional().or(z.literal('')),
    timezone: z.string().trim().refine(isValidTimeZone, 'Invalid timezone').optional(),
    language: z.enum(['fr', 'en', 'ar']).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    sidebarCollapsed: z.boolean().optional(),
    compactMode: z.boolean().optional(),
    sidebarDefaultCollapsed: z.boolean().optional(),
    dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
    timeFormat: z.enum(['24h', '12h']).optional(),
    notificationsEnabled: z.boolean().optional(),
    alertSound: z.boolean().optional(),
    alertDisplayThreshold: z.enum(['all', 'medium', 'high', 'critical']).optional(),
    sessionTimeout: z.number().int().min(0).max(24 * 60).optional(),
    presenceVisible: z.boolean().optional(),
    sensorRefreshRate: z.union([z.literal(0), z.literal(5), z.literal(10), z.literal(30)]).optional(),
    dashboardDefaultTab: z.enum(['overview', 'live', 'alerts', 'devices']).optional(),
    tempUnit: z.enum(['C', 'F']).optional(),
    volumeUnit: z.enum(['L', 'gal']).optional(),
    reducedMotion: z.boolean().optional(),
    highContrast: z.boolean().optional(),
    fontSize: z.enum(['sm', 'md', 'lg']).optional(),
    image: z.string().url().optional().or(z.literal('')),
    bio: z.string().max(500).optional().or(z.literal('')),
    organization: z.string().max(100).optional().or(z.literal('')),
    role: z.string().max(100).optional().or(z.literal('')),
    preferences: z
      .object({
        notifications: z
          .object({
            emailAlerts: z.boolean().optional(),
            criticalOnly: z.boolean().optional(),
            dailySummary: z.boolean().optional(),
            maintenanceReminders: z.boolean().optional(),
          })
          .optional(),
        units: z
          .object({
            temperature: z.enum(['celsius', 'fahrenheit']).optional(),
            distance: z.enum(['metric', 'imperial']).optional(),
          })
          .optional(),
        language: z.enum(['fr', 'en', 'ar']).optional(),
      })
      .optional(),
  })
  .strict();

type UpdateUserInput = z.infer<typeof updateUserSchema>;

type UserDocument = User & {
  resetToken?: string;
  resetTokenExpiry?: Date;
  fingerprint?: string;
  loginHistory?: Array<{ timestamp: Date; timezone: string }>;
};

function defaultPreferences(language = DEFAULT_LANGUAGE): UserPreferences {
  return {
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
    language,
  };
}

function normalizeAddress(address: User['address']): string {
  if (!address) return '';
  if (typeof address === 'string') return address;
  return [address.street, address.city, address.country].filter(Boolean).join(', ');
}

async function getOrCreateProfile(db: Db, email: string, language: string) {
  const profiles = db.collection<UserProfile>(PROFILES_COLLECTION);
  const existing = await profiles.findOne({ userId: email });
  if (existing) return existing;

  const now = new Date();
  const profile: UserProfile = {
    userId: email,
    bio: undefined,
    organization: undefined,
    role: undefined,
    phone: undefined,
    timezone: DEFAULT_TIMEZONE,
    preferences: defaultPreferences(language),
    createdAt: now,
    updatedAt: now,
  };

  await profiles.insertOne(profile);
  return profile;
}

function serializeUser(user: UserDocument, profile: UserProfile): CompleteUserProfile {
  const language = user.language ?? profile.preferences?.language ?? DEFAULT_LANGUAGE;
  const timezone = user.timezone ?? profile.timezone ?? DEFAULT_TIMEZONE;
  const theme = user.theme ?? DEFAULT_THEME;
  const phone = typeof user.phone === 'string' ? user.phone : profile.phone ?? '';
  const address = normalizeAddress(user.address);
  const preferences = {
    ...defaultPreferences(language),
    ...profile.preferences,
    notifications: {
      ...defaultPreferences(language).notifications,
      ...profile.preferences?.notifications,
    },
    units: {
      ...defaultPreferences(language).units,
      ...profile.preferences?.units,
    },
    language,
  };

  return {
    ...profile,
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image,
    phone,
    address,
    timezone,
    language,
    theme,
    sidebarCollapsed: user.sidebarCollapsed ?? false,
    compactMode: user.compactMode ?? false,
    sidebarDefaultCollapsed: user.sidebarDefaultCollapsed ?? false,
    dateFormat: user.dateFormat ?? DEFAULT_DATE_FORMAT,
    timeFormat: user.timeFormat ?? DEFAULT_TIME_FORMAT,
    notificationsEnabled: user.notificationsEnabled ?? false,
    alertSound: user.alertSound ?? false,
    alertDisplayThreshold: user.alertDisplayThreshold ?? 'all',
    sessionTimeout: typeof user.sessionTimeout === 'number' ? user.sessionTimeout : user.role === 'admin' ? 120 : 60,
    presenceVisible: user.presenceVisible ?? true,
    loginHistory: (user.loginHistory ?? []).slice(0, 5).map((entry) => ({
      timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : new Date(entry.timestamp).toISOString(),
      timezone: entry.timezone || timezone,
    })),
    sensorRefreshRate: typeof user.sensorRefreshRate === 'number' ? user.sensorRefreshRate : 10,
    dashboardDefaultTab: user.dashboardDefaultTab ?? 'overview',
    tempUnit: user.tempUnit ?? 'C',
    volumeUnit: user.volumeUnit ?? 'L',
    reducedMotion: user.reducedMotion ?? false,
    highContrast: user.highContrast ?? false,
    fontSize: user.fontSize ?? 'md',
    iotNodeCount: typeof user.iotNodeCount === 'number' ? user.iotNodeCount : 0,
    role: user.role === 'admin' ? 'admin' : 'user',
    profileRole: profile.role,
    userRole: user.role === 'admin' ? 'admin' : 'user',
    preferences,
    isOnline: user.presence?.status === 'online' || user.presence?.status === 'away',
    lastSeen: user.presence?.lastSeen ? new Date(user.presence.lastSeen).toISOString() : null,
  };
}

function buildUserUpdates(input: UpdateUserInput) {
  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.address !== undefined) updates.address = input.address;
  if (input.timezone !== undefined) updates.timezone = input.timezone;
  if (input.language !== undefined) updates.language = input.language;
  if (input.theme !== undefined) updates.theme = input.theme;
  if (input.sidebarCollapsed !== undefined) updates.sidebarCollapsed = input.sidebarCollapsed;
  if (input.compactMode !== undefined) updates.compactMode = input.compactMode;
  if (input.sidebarDefaultCollapsed !== undefined) updates.sidebarDefaultCollapsed = input.sidebarDefaultCollapsed;
  if (input.dateFormat !== undefined) updates.dateFormat = input.dateFormat;
  if (input.timeFormat !== undefined) updates.timeFormat = input.timeFormat;
  if (input.notificationsEnabled !== undefined) updates.notificationsEnabled = input.notificationsEnabled;
  if (input.alertSound !== undefined) updates.alertSound = input.alertSound;
  if (input.alertDisplayThreshold !== undefined) updates.alertDisplayThreshold = input.alertDisplayThreshold;
  if (input.sessionTimeout !== undefined) updates.sessionTimeout = input.sessionTimeout;
  if (input.presenceVisible !== undefined) updates.presenceVisible = input.presenceVisible;
  if (input.sensorRefreshRate !== undefined) updates.sensorRefreshRate = input.sensorRefreshRate;
  if (input.dashboardDefaultTab !== undefined) updates.dashboardDefaultTab = input.dashboardDefaultTab;
  if (input.tempUnit !== undefined) updates.tempUnit = input.tempUnit;
  if (input.volumeUnit !== undefined) updates.volumeUnit = input.volumeUnit;
  if (input.reducedMotion !== undefined) updates.reducedMotion = input.reducedMotion;
  if (input.highContrast !== undefined) updates.highContrast = input.highContrast;
  if (input.fontSize !== undefined) updates.fontSize = input.fontSize;
  if (input.image !== undefined) updates.image = input.image;

  return updates;
}

function buildProfileUpdates(input: UpdateUserInput, current: UserProfile) {
  const updates: Partial<UserProfile> = { updatedAt: new Date() };

  if (input.bio !== undefined) updates.bio = input.bio;
  if (input.organization !== undefined) updates.organization = input.organization;
  if (input.role !== undefined) updates.role = input.role;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.timezone !== undefined) updates.timezone = input.timezone;

  const language = input.language ?? input.preferences?.language ?? current.preferences.language;
  if (input.preferences !== undefined || input.language !== undefined) {
    updates.preferences = {
      ...current.preferences,
      ...input.preferences,
      notifications: {
        ...current.preferences.notifications,
        ...(input.preferences?.notifications || {}),
      },
      units: {
        ...current.preferences.units,
        ...(input.preferences?.units || {}),
      },
      language,
    };
  }

  return updates;
}

async function getAuthorizedEmail(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: sessionCookieName,
  });

  return typeof token?.email === 'string' ? token.email : null;
}

export async function GET(request: NextRequest) {
  try {
    const client = await dbConnect();
    const email = await getAuthorizedEmail(request);

    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = client.db(DB_NAME);
    const user = await db.collection<UserDocument>(USERS_COLLECTION).findOne(
      { email },
      {
        projection: {
          password: 0,
          resetToken: 0,
          resetTokenExpiry: 0,
          fingerprint: 0,
        },
      }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found in database. Please sign up again.' },
        { status: 404 }
      );
    }

    const profile = await getOrCreateProfile(db, email, user.language ?? DEFAULT_LANGUAGE);

    return NextResponse.json(serializeUser(user, profile));
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const client = await dbConnect();
    const email = await getAuthorizedEmail(request);

    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const input = validationResult.data;
    const db = client.db(DB_NAME);
    const users = db.collection<UserDocument>(USERS_COLLECTION);
    const profiles = db.collection<UserProfile>(PROFILES_COLLECTION);

    const user = await users.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentProfile = await getOrCreateProfile(db, email, user.language ?? DEFAULT_LANGUAGE);
    const userUpdates = buildUserUpdates(input);
    const profileUpdates = buildProfileUpdates(input, currentProfile);
    const now = new Date();

    if (Object.keys(userUpdates).length > 0) {
      await users.updateOne({ email }, { $set: { ...userUpdates, updatedAt: now } });
    }

    await profiles.updateOne({ userId: email }, { $set: profileUpdates });

    const updatedUser = await users.findOne(
      { email },
      {
        projection: {
          password: 0,
          resetToken: 0,
          resetTokenExpiry: 0,
          fingerprint: 0,
        },
      }
    );
    const updatedProfile = await profiles.findOne({ userId: email });

    if (!updatedUser || !updatedProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(serializeUser(updatedUser, updatedProfile));
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
