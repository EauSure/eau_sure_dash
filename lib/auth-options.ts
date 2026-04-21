import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { createHash } from 'crypto';
import clientPromise from './mongodb';
import { dbConnect } from './mongodb';
import { comparePassword } from './auth';
import {
  getUserByEmail,
  updateUserPresenceByEmail,
  updateUserPresenceById,
  type User,
} from './user';

const nextAuthSecret = process.env.NEXTAUTH_SECRET || '';
const jwtSecret = process.env.JWT_SECRET || '';

if (nextAuthSecret.length < 64) {
  console.warn('NEXTAUTH_SECRET is shorter than 64 characters.');
}

if (jwtSecret && jwtSecret.length < 64) {
  console.warn('JWT_SECRET is shorter than 64 characters when set.');
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  // NEXTAUTH_SECRET must be ≥64 chars. Rotate every 90 days.
  // Rotating invalidates all existing sessions — warn users.
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Host-eausure.session'
          : 'eausure.session',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        role: { label: 'Role', type: 'text' },
        expectedRole: { label: 'Expected Role', type: 'text' },
        roleMismatchError: { label: 'Role Mismatch Error', type: 'text' },
        rememberMe: { label: 'Remember Me', type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const requestedRole: 'user' | 'admin' =
          credentials.role === 'admin' ? 'admin' : 'user';

        const user = await getUserByEmail(credentials.email);

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await comparePassword(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        if (user.status === 'suspended') {
          return null;
        }

        const actualRole: 'user' | 'admin' = user.role === 'admin' ? 'admin' : 'user';
        const expectedRole =
          credentials.expectedRole === 'admin'
            ? 'admin'
            : credentials.expectedRole === 'operator' || credentials.expectedRole === 'user'
              ? 'user'
              : null;

        if (expectedRole && actualRole !== expectedRole) {
          return null;
        }

        if (requestedRole === 'admin' && actualRole !== 'admin') {
          return null;
        }

        const userAgent = req?.headers?.['user-agent'] || '';
        const fingerprint = createHash('sha256')
          .update(Array.isArray(userAgent) ? userAgent.join(' ') : userAgent)
          .digest('hex')
          .slice(0, 16);

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: actualRole,
          timezone: user.timezone ?? 'Africa/Tunis',
          language: user.language ?? 'fr',
          theme: user.theme ?? 'system',
          rememberMe: credentials.rememberMe === 'true',
          fingerprint,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/fr/auth/signin',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.userId = user.id;
        token.email = user.email;
        token.role = user.role;
        token.timezone = user.timezone ?? 'Africa/Tunis';
        token.language = user.language ?? 'fr';
        token.theme = user.theme ?? 'system';
        token.rememberMe = user.rememberMe;
        token.fingerprint = user.fingerprint;

        if (typeof user.email === 'string') {
          await updateUserPresenceByEmail(user.email, 'online');
        }
      }
      
      // Refresh user data on session update
      if (trigger === 'update' && token.email) {
        const updatedUser = await getUserByEmail(token.email as string);
        if (updatedUser) {
          token.name = updatedUser.name;
          token.picture = updatedUser.image;
          token.role = updatedUser.role === 'admin' ? 'admin' : 'user';
          token.timezone = updatedUser.timezone ?? 'Africa/Tunis';
          token.language = updatedUser.language ?? 'fr';
          token.theme = updatedUser.theme ?? 'system';
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.id = token.id as string;
        session.user.role = (token.role === 'admin' ? 'admin' : 'user');
        session.user.timezone = token.timezone ?? 'Africa/Tunis';
        session.user.language = token.language ?? 'fr';
        session.user.theme = token.theme ?? 'system';
        
        // Fetch latest user data from database
        const user = await getUserByEmail(token.email as string);
        if (user) {
          session.user.name = user.name;
          session.user.email = user.email;
          session.user.image = user.image || null;
          session.user.role = user.role === 'admin' ? 'admin' : 'user';
          session.user.timezone = user.timezone ?? 'Africa/Tunis';
          session.user.language = user.language ?? 'fr';
          session.user.theme = user.theme ?? 'system';
        }
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.email) return;

      try {
        const client = await dbConnect();
        const db = client.db(process.env.MONGODB_DB || 'water_quality');
        const currentUser = await db
          .collection('users')
          .findOne<{ timezone?: string }>({ email: user.email }, { projection: { timezone: 1 } });

        await db.collection<User>('users').updateOne(
          { email: user.email },
          {
            $push: {
              loginHistory: {
                $each: [
                  {
                    timestamp: new Date(),
                    timezone: currentUser?.timezone || 'Africa/Tunis',
                  },
                ],
                $position: 0,
                $slice: 5,
              },
            },
          }
        );
      } catch (error) {
        console.error('Failed to record login history:', error);
      }
    },
    async signOut(message) {
      const tokenUserId =
        message && typeof message === 'object' && 'token' in message
          ? (message.token?.id as string | undefined)
          : undefined;
      const tokenEmail =
        message && typeof message === 'object' && 'token' in message
          ? (message.token?.email as string | undefined)
          : undefined;
      const sessionEmail =
        message && typeof message === 'object' && 'session' in message
          ? message.session?.user?.email || undefined
          : undefined;

      if (tokenUserId) {
        const updated = await updateUserPresenceById(tokenUserId, 'offline');
        if (updated) {
          return;
        }
      }

      const email = tokenEmail || sessionEmail;
      if (email) {
        await updateUserPresenceByEmail(email, 'offline');
      }
    },
  },
};
