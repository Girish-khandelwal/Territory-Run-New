// src/lib/auth.ts
// NextAuth configuration — supports Google OAuth and email/password (credentials)

import { NextAuthOptions } from 'next-auth';
import GoogleProvider    from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectDB }    from '@/lib/db/mongoose';
import User from "@/models/User";
export const authOptions: NextAuthOptions = {
  // Store sessions as JWTs (no separate session DB table needed)
  session: { strategy: 'jwt' },

  providers: [
    // ── Google OAuth ──────────────────────────────────────────────────────────
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ── Email + Password ──────────────────────────────────────────────────────
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error('Email and password are required');
        }

        await connectDB();

        // Explicitly select password field (excluded by default in schema)
        const user = await User.findOne({ email: credentials.email }).select('+password');
        if (!user) throw new Error('No account found with that email');

        const valid = await user.comparePassword(credentials.password);
        if (!valid) throw new Error('Incorrect password');

        return {
          id:    user._id.toString(),
          email: user.email,
          name:  user.name,
          image: user.image,
          color: user.color,
        };
      },
    }),
  ],

  // ─── Callbacks ──────────────────────────────────────────────────────────────

  callbacks: {
    // Add user id and color to JWT token
    async jwt({ token, user, account }) {
      if (user) {
        token.id    = user.id;
        token.color = (user as { color?: string }).color;
      }

      // Handle Google sign-in: upsert user in MongoDB
      if (account?.provider === 'google' && token.email) {
        await connectDB();
        let dbUser = await User.findOne({ email: token.email });

        if (!dbUser) {
         dbUser = await User.create({
         name: token.name ?? "Unknown User",
         email: token.email ?? "",
         image: token.picture ?? "",
         provider: "google",
         });
        }

        token.id    = dbUser._id.toString();
        token.color = dbUser.color;
      }

      return token;
    },

    // Expose id and color on the client-side session object
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; color?: string }).id    = token.id as string;
        (session.user as { id?: string; color?: string }).color = token.color as string;
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error:  '/auth/error',
  },

  secret: process.env.NEXTAUTH_SECRET,
};