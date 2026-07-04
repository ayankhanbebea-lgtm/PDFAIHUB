'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { FileText, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

const schema = z.object({
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });
type FormData = z.infer<typeof schema>;

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!token) { setError('Invalid or expired reset link.'); return; }
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/auth/reset-password', { token, password: data.password });
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-white">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-accent-500 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            PDFAI Hub
          </Link>
        </div>
        <div className="glass rounded-2xl p-8 border border-white/10">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Password Reset!</h2>
              <p className="text-gray-400 text-sm">Redirecting to sign in...</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-1">Set new password</h1>
              <p className="text-gray-400 text-sm mb-6">Choose a strong password for your account.</p>
              {error && (
                <div className="mb-4 flex items-center gap-2 text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {[
                  { name: 'password', label: 'New Password', auto: 'new-password' },
                  { name: 'confirmPassword', label: 'Confirm Password', auto: 'new-password' },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="text-sm font-medium text-gray-300 mb-1.5 block">{field.label}</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        autoComplete={field.auto}
                        placeholder="••••••••"
                        {...register(field.name as any)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-brand-400 transition-all"
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" tabIndex={-1}>
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors[field.name as keyof FormData] && (
                      <p className="text-xs text-red-400 mt-1">{errors[field.name as keyof FormData]?.message}</p>
                    )}
                  </div>
                ))}
                <button type="submit" disabled={loading} className="btn-brand w-full py-3.5 disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  Reset Password
                </button>
              </form>
              <p className="text-center mt-4">
                <Link href="/auth/login" className="text-sm text-brand-400 hover:text-brand-300">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-hero-gradient"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ResetForm />
    </Suspense>
  );
}
