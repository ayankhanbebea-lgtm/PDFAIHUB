'use client';
// src/app/auth/forgot-password/page.tsx
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import axios from 'axios';

const schema = z.object({ email: z.string().email('Invalid email address') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/auth/forgot-password', { email: data.email.toLowerCase().trim() });
      setSubmitted(true);
    } catch (err: any) {
      // Always show success to prevent email enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-white">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-accent-500 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            PDFAI Hub
          </Link>
        </div>

        <div className="glass rounded-2xl p-8 border border-white/10">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-gray-400 text-sm mb-6">
                If an account exists for <strong className="text-white">{getValues('email')}</strong>,
                we've sent a password reset link. Check your spam folder too.
              </p>
              <Link href="/auth/login" className="flex items-center gap-2 text-brand-400 hover:text-brand-300 justify-center text-sm">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Forgot password?</h1>
                <p className="text-gray-400 text-sm mt-1">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="mb-4 text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      {...register('email')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-400 transition-all"
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-brand w-full py-3.5 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  Send Reset Link
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/auth/login" className="flex items-center gap-2 text-brand-400 hover:text-brand-300 justify-center text-sm">
                  <ArrowLeft className="w-4 h-4" /> Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
