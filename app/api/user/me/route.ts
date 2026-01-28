import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateUserProfile, updateUserProfile } from '@/lib/user-profile';
import { getUserByEmail } from '@/lib/user';
import type { CompleteUserProfile } from '@/types/user-profile';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.string().url().optional().or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
  organization: z.string().max(100).optional().or(z.literal('')),
  role: z.string().max(100).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  timezone: z.string().optional(),
  preferences: z.object({
    notifications: z.object({
      emailAlerts: z.boolean().optional(),
      criticalOnly: z.boolean().optional(),
      dailySummary: z.boolean().optional(),
      maintenanceReminders: z.boolean().optional(),
    }).optional(),
    units: z.object({
      temperature: z.enum(['celsius', 'fahrenheit']).optional(),
      distance: z.enum(['metric', 'imperial']).optional(),
    }).optional(),
    language: z.string().optional(),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.email;
    
    // Get user data from NextAuth users collection
    const user = await getUserByEmail(userId);
    if (!user) {
      console.error('User not found in database:', userId);
      return NextResponse.json(
        { error: 'User not found in database. Please sign up again.' },
        { status: 404 }
      );
    }

    // Get or create extended profile
    const profile = await getOrCreateUserProfile(userId);

    // Merge data from both collections
    const completeProfile: CompleteUserProfile = {
      ...profile,
      name: user.name,
      email: user.email,
      image: user.image,
    };

    return NextResponse.json(completeProfile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = updateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const userId = session.user.email;
    
    // Update both collections as needed
    const updatedProfile = await updateUserProfile(userId, validationResult.data);

    if (!updatedProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get updated user data from users collection
    const user = await getUserByEmail(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return merged complete profile
    const completeProfile: CompleteUserProfile = {
      ...updatedProfile,
      name: user.name,
      email: user.email,
      image: user.image,
    };

    return NextResponse.json(completeProfile);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
