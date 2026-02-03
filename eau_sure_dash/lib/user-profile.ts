import { MongoClient } from 'mongodb';
import { getClient } from './mongodb';
import { updateUser } from './user';
import type { UserProfile, CompleteUserProfile, UpdateProfileInput } from '@/types/user-profile';

const DB_NAME = process.env.MONGODB_DB || 'water_quality';
const COLLECTION_NAME = 'userProfiles';

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const client = await getClient();
  const db = client.db(DB_NAME);
  const collection = db.collection<UserProfile>(COLLECTION_NAME);

  const profile = await collection.findOne({ userId });
  return profile;
}

export async function createDefaultProfile(userId: string): Promise<UserProfile> {
  const client = await getClient();
  const db = client.db(DB_NAME);
  const collection = db.collection<UserProfile>(COLLECTION_NAME);

  const defaultProfile: UserProfile = {
    userId,
    bio: undefined,
    organization: undefined,
    role: undefined,
    phone: undefined,
    timezone: 'Africa/Tunis',
    preferences: {
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
      language: 'en',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await collection.insertOne(defaultProfile);
  return defaultProfile;
}

export async function getOrCreateUserProfile(userId: string): Promise<UserProfile> {
  let profile = await getUserProfile(userId);
  
  if (!profile) {
    profile = await createDefaultProfile(userId);
  }

  return profile;
}

export async function updateUserProfile(
  userId: string,
  updates: UpdateProfileInput
): Promise<UserProfile | null> {
  const client = await getClient();
  const db = client.db(DB_NAME);
  const collection = db.collection<UserProfile>(COLLECTION_NAME);

  // Separate updates for users collection vs userProfiles collection
  const userUpdates: any = {};
  const profileUpdates: any = {
    updatedAt: new Date(),
  };

  // Fields that go to users collection (NextAuth)
  if (updates.name !== undefined) userUpdates.name = updates.name;
  if (updates.image !== undefined) userUpdates.image = updates.image;

  // Fields that go to userProfiles collection
  if (updates.bio !== undefined) profileUpdates.bio = updates.bio;
  if (updates.organization !== undefined) profileUpdates.organization = updates.organization;
  if (updates.role !== undefined) profileUpdates.role = updates.role;
  if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
  if (updates.timezone !== undefined) profileUpdates.timezone = updates.timezone;
  
  if (updates.preferences !== undefined) {
    const currentProfile = await getUserProfile(userId);
    if (currentProfile) {
      profileUpdates.preferences = {
        ...currentProfile.preferences,
        ...updates.preferences,
        notifications: {
          ...currentProfile.preferences.notifications,
          ...(updates.preferences.notifications || {}),
        },
        units: {
          ...currentProfile.preferences.units,
          ...(updates.preferences.units || {}),
        },
      };
    }
  }

  // Update users collection if needed (name/image)
  if (Object.keys(userUpdates).length > 0) {
    const usersCollection = db.collection('users');
    await usersCollection.updateOne(
      { email: userId }, // userId is the email
      { $set: { ...userUpdates, updatedAt: new Date() } }
    );
  }

  // Update userProfiles collection
  const result = await collection.findOneAndUpdate(
    { userId },
    { $set: profileUpdates },
    { returnDocument: 'after' }
  );

  return result;
}
