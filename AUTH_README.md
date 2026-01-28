# Authentication System Documentation

## Overview
This is a complete authentication system built with NextAuth.js, MongoDB, and Next.js 14+ (App Router).

## Features
- ✅ User registration (signup)
- ✅ User login (credentials provider)
- ✅ Password hashing with bcrypt
- ✅ MongoDB integration
- ✅ Session management with JWT
- ✅ Protected routes using middleware
- ✅ Automatic redirect for authenticated users
- ✅ Server-side session validation

## Tech Stack
- **Next.js 14+** (App Router)
- **NextAuth.js** - Authentication
- **MongoDB** - Database
- **bcryptjs** - Password hashing
- **TypeScript** - Type safety

## Setup Instructions

### 1. Environment Variables
Make sure your `.env.local` file contains:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<your-generated-secret>
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/database
```

### 2. MongoDB Setup
- Create a MongoDB Atlas account or use a local MongoDB instance
- Replace the `MONGODB_URI` in `.env.local` with your connection string
- The database will automatically create the required collections

### 3. Install Dependencies
All required packages are already installed:
- next-auth
- @auth/mongodb-adapter
- mongodb
- bcryptjs
- @types/bcryptjs

### 4. Run the Application
```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
app/
├── api/
│   └── auth/
│       ├── [...nextauth]/
│       │   └── route.ts          # NextAuth API routes
│       └── signup/
│           └── route.ts          # User registration endpoint
├── auth/
│   ├── signin/
│   │   └── page.tsx             # Sign in page
│   └── signup/
│       └── page.tsx             # Sign up page
├── dashboard/
│   └── page.tsx                 # Protected dashboard
├── layout.tsx                   # Root layout with SessionProvider
├── page.tsx                     # Home/landing page
└── providers.tsx                # Auth provider component

lib/
├── auth.ts                      # Password hashing utilities
├── auth-options.ts              # NextAuth configuration
├── mongodb.ts                   # MongoDB client
└── user.ts                      # User CRUD operations

middleware.ts                    # Route protection
types/
└── next-auth.d.ts              # TypeScript types for NextAuth
```

## How It Works

### Authentication Flow

1. **Sign Up**
   - User fills out signup form
   - POST request to `/api/auth/signup`
   - Password is hashed using bcrypt
   - User is stored in MongoDB
   - User is automatically signed in

2. **Sign In**
   - User enters credentials
   - NextAuth validates against MongoDB
   - Password is verified using bcrypt
   - JWT token is created
   - Session is established

3. **Protected Routes**
   - Middleware checks for valid session
   - Unauthenticated users redirected to signin
   - Authenticated users can access protected pages

### Key Components

#### MongoDB Connection (`lib/mongodb.ts`)
- Singleton pattern for connection reuse
- Handles both development and production environments
- Prevents connection pool exhaustion

#### User Management (`lib/user.ts`)
- `getUserByEmail()` - Find user by email
- `getUserById()` - Find user by ID
- `createUser()` - Create new user with hashed password
- `updateUser()` - Update user information

#### Auth Configuration (`lib/auth-options.ts`)
- Configures NextAuth with MongoDB adapter
- Sets up credentials provider
- Defines JWT strategy
- Customizes signin page

#### Middleware (`middleware.ts`)
- Protects all routes except auth pages
- Redirects unauthenticated users
- Prevents authenticated users from accessing auth pages

## API Routes

### POST `/api/auth/signup`
Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### NextAuth Endpoints
- `GET/POST /api/auth/signin` - Sign in
- `GET/POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get session
- `GET /api/auth/csrf` - CSRF token
- `GET /api/auth/providers` - Available providers

## Usage Examples

### Client-Side Session Check
```tsx
'use client';
import { useSession } from 'next-auth/react';

export default function Component() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Loading...</div>;
  if (!session) return <div>Not authenticated</div>;

  return <div>Welcome {session.user?.name}</div>;
}
```

### Server-Side Session Check
```tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  return <div>Protected content</div>;
}
```

### Sign Out
```tsx
import { signOut } from 'next-auth/react';

<button onClick={() => signOut()}>Sign Out</button>
```

## Security Features

1. **Password Hashing**: All passwords are hashed with bcrypt (salt rounds: 12)
2. **JWT Tokens**: Secure session management with encrypted JWT
3. **CSRF Protection**: Built-in CSRF protection
4. **Secure Cookies**: HTTP-only cookies for session storage
5. **Environment Variables**: Sensitive data stored in .env.local
6. **Input Validation**: Email format and password length validation

## Customization

### Add More Providers
Edit `lib/auth-options.ts` to add Google, GitHub, etc.:
```typescript
import GoogleProvider from 'next-auth/providers/google';

providers: [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
  // ... existing providers
]
```

### Add User Fields
Modify `lib/user.ts` to add more user properties:
```typescript
export interface User {
  _id: ObjectId;
  name: string;
  email: string;
  password?: string;
  role?: string;      // Add role
  avatar?: string;    // Add avatar
  // ... more fields
}
```

## Troubleshooting

### MongoDB Connection Issues
- Verify MONGODB_URI is correct
- Check network access in MongoDB Atlas
- Ensure IP is whitelisted

### NextAuth Errors
- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your domain
- Clear browser cookies and try again

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript errors with `npm run build`

## Next Steps

1. ✅ Basic authentication is complete
2. Add email verification
3. Implement password reset
4. Add OAuth providers (Google, GitHub)
5. Add user profile management
6. Implement role-based access control
7. Add 2FA authentication

## License
MIT
