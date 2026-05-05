'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Zap, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // ─── Credentials Login / Signup ─────────────────────────────
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || (mode === 'signup' && !name)) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      // ── SIGNUP FLOW ──
      if (mode === 'signup') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });

        let data: any = {};
        try {
          data = await res.json();
        } catch {
          // prevent crash if response is not JSON
        }

        if (!res.ok) {
          throw new Error(data?.error || 'Signup failed');
        }

        toast.success('Account created! Logging you in...');
      }

      // ── SIGNIN ──
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success('Welcome back 🚀');

      router.replace('/dashboard'); // better than push
    } catch (err) {
      toast.error((err as Error).message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── Google Login ──────────────────────────────────────────
  const handleGoogle = async () => {
    await signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-brand-600/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-brand-400" />
            </div>
            <span className="text-3xl font-display text-slate-100">
              Territory<span className="text-brand-400">Run</span>
            </span>
          </div>
          <p className="text-slate-400">Claim the streets. Own the city.</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8">
          
          {/* Toggle */}
          <div className="flex rounded-xl p-1 mb-6 bg-white/5">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm ${
                  mode === m
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'text-slate-500'
                }`}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleCredentials} className="space-y-4">

            {/* Name */}
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
            )}

            {/* Email */}
            <div className="relative">
              <Mail className="icon-left" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input pl-10"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="icon-left" />
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="input pl-10 pr-10"
              />

              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="icon-right"
              >
                {showPw ? <EyeOff /> : <Eye />}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading
                ? 'Please wait...'
                : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-slate-600">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="btn-secondary w-full"
          >
            Continue with Google
          </button>

          <p className="text-center text-xs text-slate-600 mt-6">
            By continuing you agree to our{' '}
            <Link href="#" className="text-brand-400">Terms</Link>
          </p>
        </div>
      </div>
    </div>
  );
}