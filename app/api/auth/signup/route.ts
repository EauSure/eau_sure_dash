import { NextResponse } from 'next/server';
import { createUser } from '@/lib/user';

export async function POST(request: Request) {
  try {
    const {
      name,
      email,
      password,
      role: requestedRole,
      adminSecret,
    } = await request.json();

    const role: 'user' | 'admin' = requestedRole === 'admin' ? 'admin' : 'user';

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

    if (role === 'admin') {
      const expectedAdminSecret = process.env.ADMIN_SIGNUP_SECRET;

      if (!expectedAdminSecret) {
        return NextResponse.json(
          { error: 'Admin account creation is currently disabled' },
          { status: 403 }
        );
      }

      if (adminSecret !== expectedAdminSecret) {
        return NextResponse.json(
          { error: 'Invalid admin access key' },
          { status: 403 }
        );
      }
    }

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
