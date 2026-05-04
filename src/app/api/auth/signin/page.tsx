'use client';

import { signIn } from 'next-auth/react';

export default function SignInPage() {
  return (
    <div className="h-screen flex items-center justify-center">
      <button
        onClick={() => signIn('google')}
        className="bg-blue-500 text-white px-6 py-3 rounded"
      >
        Sign in with Google
      </button>
    </div>
  );
}