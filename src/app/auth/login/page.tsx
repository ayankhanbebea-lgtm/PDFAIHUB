'use client';
// src/app/auth/login/page.tsx
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { FileText, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const redirect = searchParams.get('redirect') || searchParams.get('callbackUrl') || '/dashboard';
  const urlError = searchParams.get('error');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Map NextAuth URL error codes to human-readable messages
  const oauthErrorMessages: Record<string, string> = {
    OAuthCallback: 'Google sign-in failed. This is usually because: (1) your GOOGLE_CLIENT_SECRET in .env.local is wrong, or (2) the database is not connected. Check your server console for details.',
    OAuthSignin: 'Could not initiate Google sign-in. Check your GOOGLE_CLIENT_ID in .env.local.',
    OAuthAccountNotLinked: 'This email is already registered with a different sign-in method.',
    Callback: 'Authentication callback failed. Check server logs.',
    AccessDenied: 'Access denied. You may not be on the test users list.',
    Configuration: 'Server configuration error. Contact support.',
    Default: 'Authentication failed. Please try again.',
  };
  const [error, setError] = useState(
    urlError ? (oauthErrorMessages[urlError] || `Authentication error: ${urlError}`) : ''
  );

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace(redirect);
    }
  }, [session, status, router, redirect]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { rememberMe: true },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: data.email.toLowerCase().trim(),
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // Map NextAuth error codes to friendly messages
        const errMap: Record<string, string> = {
          CredentialsSignin: 'Invalid email or password',
          'No account found with this email': 'No account found with this email',
          'Please sign in with Google': 'This email uses Google Sign-In. Click "Continue with Google".',
          'Account suspended. Contact support.': 'Your account has been suspended.',
          'Incorrect password': 'Incorrect password. Try again or reset it.',
        };
        setError(errMap[result.error] || result.error);
      } else if (result?.ok) {
        toast.success('Welcome back!');
        router.replace(redirect);
        router.refresh();
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await signIn('google', { callbackUrl: redirect });
    } catch {
      setError('Google sign-in failed. Try again.');
      setGoogleLoading(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
        <div className="w-8 h-8 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-white mb-4">
            <div className="w-9 h-9 bg-[#10B981] rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            PDFAI Hub
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-[#9CA3AF] mt-1 text-sm">Sign in to your account</p>
        </div>

        <div className="bg-[#161B22] rounded-2xl p-8 border border-[#1F2937]">
          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#374151] text-white hover:bg-[#111827] hover:border-[#1F2937] transition-all mb-6 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1F2937]" />
            </div>
            <div className="relative text-center">
              <span className="px-3 text-xs text-[#6B7280] bg-[#161B22]">
                or sign in with email
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-start gap-2 text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Success from registration */}
          {searchParams.get('registered') === '1' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2 text-sm text-green-400 bg-green-950/30 border border-green-800/40 rounded-xl px-4 py-3"
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Account created! Sign in below.
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="text-sm font-medium text-[#9CA3AF] mb-1.5 block">Email</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register('email')}
                className="w-full bg-[#111827] border border-[#1F2937] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#10B981] transition-all"
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-[#9CA3AF]">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-[#10B981] hover:text-[#059669] transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full bg-[#111827] border border-[#1F2937] rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-[#10B981] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                {...register('rememberMe')}
                className="w-4 h-4 rounded border-[#374151] bg-[#111827] text-[#10B981] focus:ring-[#10B981] focus:ring-offset-0"
              />
              <label htmlFor="rememberMe" className="text-sm text-[#9CA3AF]">Remember me</label>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-brand w-full py-3.5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Sign In
            </button>
          </form>

          <p className="text-center text-sm text-[#9CA3AF] mt-6">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-[#10B981] hover:text-[#059669] font-medium transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-hero-gradient">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
