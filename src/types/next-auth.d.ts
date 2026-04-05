// src/types/next-auth.d.ts
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      isAnonymous?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    username: string;
    role: string;
    email: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: string;
    isAnonymous?: boolean;
  }
}
