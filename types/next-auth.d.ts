import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'user' | 'admin';
      timezone?: string;
      language?: 'fr' | 'en' | 'ar';
      theme?: 'light' | 'dark' | 'system';
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role?: 'user' | 'admin';
    rememberMe?: boolean;
    timezone?: string;
    language?: 'fr' | 'en' | 'ar';
    theme?: 'light' | 'dark' | 'system';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: 'user' | 'admin';
    rememberMe?: boolean;
    userId?: string;
    timezone?: string;
    language?: 'fr' | 'en' | 'ar';
    theme?: 'light' | 'dark' | 'system';
  }
}
