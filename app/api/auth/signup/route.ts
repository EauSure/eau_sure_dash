import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createUser } from '@/lib/user';

const signupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  password: z.string().min(6).max(128),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    const { name, email, password } = validation.data;
    const role = 'user' as const;

    // Admin accounts are never created through self-service signup.
    // Seed them directly in MongoDB or create them with a protected internal script.

    // Create user
    const user = await createUser(name, email, password, role);

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Return user without password
    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role ?? 'user',
      },
    });
  } catch (error: unknown) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Unable to create account' },
      { status: 500 }
    );
  }
}
