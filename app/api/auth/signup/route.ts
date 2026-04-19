import { NextResponse } from 'next/server';
import { createUser } from '@/lib/user';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    const role = 'user' as const;

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

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
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
