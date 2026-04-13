import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from './mongodb';
import { comparePassword } from './auth';
import { getUserByEmail, updateUserPresenceByEmail } from './user';

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        role: { label: 'Role', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter both email and password');
        }

        const requestedRole: 'user' | 'admin' =
          credentials.role === 'admin' ? 'admin' : 'user';

        const user = await getUserByEmail(credentials.email);

        if (!user || !user.password) {
          throw new Error('Invalid email or password');
        }

        const isPasswordValid = await comparePassword(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        if (user.status === 'suspended') {
          throw new Error('Your account is suspended. Contact an administrator.');
        }

        const actualRole: 'user' | 'admin' = user.role === 'admin' ? 'admin' : 'user';

        if (requestedRole === 'admin' && actualRole !== 'admin') {
          throw new Error('Your account does not have admin access');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: actualRole,
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
        token.email = user.email;
        token.role = user.role;

        if (typeof user.email === 'string') {
          await updateUserPresenceByEmail(user.email, true);
        }
      }
      
      // Refresh user data on session update
      if (trigger === 'update' && token.email) {
        const updatedUser = await getUserByEmail(token.email as string);
        if (updatedUser) {
          token.name = updatedUser.name;
          token.picture = updatedUser.image;
          token.role = updatedUser.role === 'admin' ? 'admin' : 'user';
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.id = token.id as string;
        session.user.role = (token.role === 'admin' ? 'admin' : 'user');
        
        // Fetch latest user data from database
        const user = await getUserByEmail(token.email as string);
        if (user) {
          session.user.name = user.name;
          session.user.email = user.email;
          session.user.image = user.image || null;
          session.user.role = user.role === 'admin' ? 'admin' : 'user';
        }
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      const tokenEmail =
        message && typeof message === 'object' && 'token' in message
          ? (message.token?.email as string | undefined)
          : undefined;
      const sessionEmail =
        message && typeof message === 'object' && 'session' in message
          ? message.session?.user?.email || undefined
          : undefined;

      const email = tokenEmail || sessionEmail;
      if (email) {
        await updateUserPresenceByEmail(email, false);
      }
    },
  },
};
