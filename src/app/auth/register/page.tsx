'use client';
// src/app/auth/register/page.tsx
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { FileText, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

const freeBenefits = [
  '10 AI summaries per day',
  '5 PDF conversions per day',
  'All PDF tools free (no limit)',
  'No credit card required',
];

export default function RegisterPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace('/dashboard');
    }
  }, [session, status, router]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/auth/register', {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        password: data.password,
      });

      // Auto sign-in after registration
      const result = await signIn('credentials', {
        email: data.email.toLowerCase().trim(),
        password: data.password,
        redirect: false,
      });

      if (result?.ok) {
        toast.success('Welcome to PDFAI Hub! 🎉');
        router.replace('/dashboard');
      } else {
        // Sign-in failed but registration succeeded — redirect to login
        router.push('/auth/login?registered=1');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-white">
            <div className="w-9 h-9 bg-[#10B981] rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            PDFAI Hub
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Create free account</h1>
          <p className="text-[#9CA3AF] mt-1 text-sm">Join 500,000+ users today</p>
        </div>

        {/* Benefits */}
        <div className="bg-[#161B22] border border-[#1F2937] rounded-xl p-4 mb-5">
          <div className="grid grid-cols-2 gap-2">
            {freeBenefits.map((b) => (
              <div key={b} className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                <Check className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />
                {b}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#161B22] border border-[#1F2937] rounded-2xl p-8">
          {/* Google */}
          <button
            onClick={() => { setGoogleLoading(true); signIn('google', { callbackUrl: '/dashboard' }); }}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#374151] text-white hover:bg-[#111827] hover:border-[#1F2937] transition-all mb-6 disabled:opacity-60"
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
            Continue with Google
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1F2937]" />
            </div>
            <div className="relative text-center">
              <span className="px-3 text-xs text-[#6B7280] bg-[#161B22]">
                or with email
              </span>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-start gap-2 text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="text-sm font-medium text-[#9CA3AF] mb-1.5 block">Full Name</label>
              <input
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                {...register('name')}
                className="w-full bg-[#111827] border border-[#1F2937] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#10B981] transition-all"
              />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
            </div>

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
              <label className="text-sm font-medium text-[#9CA3AF] mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min 8 characters"
                  {...register('password')}
                  className="w-full bg-[#111827] border border-[#1F2937] rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-[#10B981] transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-[#9CA3AF] mb-1.5 block">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  {...register('confirmPassword')}
                  className="w-full bg-[#111827] border border-[#1F2937] rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-[#10B981] transition-all"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" tabIndex={-1}>
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-brand w-full py-3.5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Create Free Account
            </button>
          </form>

          <p className="text-center text-xs text-[#9CA3AF] mt-4">
            By signing up you agree to our{' '}
            <Link href="/terms" className="text-[#10B981] hover:text-[#059669]">Terms</Link> &{' '}
            <Link href="/privacy" className="text-[#10B981] hover:text-[#059669]">Privacy Policy</Link>
          </p>

          <p className="text-center text-sm text-[#9CA3AF] mt-4">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#10B981] hover:text-[#059669] font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
