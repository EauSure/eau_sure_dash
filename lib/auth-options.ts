import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from './mongodb';
import { comparePassword } from './auth';
import { getUserByEmail } from './user';

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter both email and password');
        }

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

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
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
      }
      
      // Refresh user data on session update
      if (trigger === 'update' && token.email) {
        const updatedUser = await getUserByEmail(token.email as string);
        if (updatedUser) {
          token.name = updatedUser.name;
          token.picture = updatedUser.image;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.id = token.id as string;
        
        // Fetch latest user data from database
        const user = await getUserByEmail(token.email as string);
        if (user) {
          session.user.name = user.name;
          session.user.email = user.email;
          session.user.image = user.image || null;
        }
      }
      return session;
    },
  },
};
