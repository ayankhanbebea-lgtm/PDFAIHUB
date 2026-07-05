'use client';
// src/app/dashboard/profile/page.tsx — Theme-aware
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});
type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: session?.user?.name || '' },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      await axios.patch('/api/user/profile', data);
      await update({ name: data.name });
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />
      <main className="pt-20">
        <div className="section-container py-8 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Profile Settings</h1>

          <div className="bg-card border border-border rounded-2xl p-8 space-y-8 transition-colors duration-300">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative">
                {session.user.image ? (
                  <img src={session.user.image} alt="" className="w-20 h-20 rounded-2xl object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                    {session.user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{session.user.name}</p>
                <p className="text-sm text-muted-foreground">{session.user.email}</p>
                <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full mt-2 font-semibold ${
                  session.user.plan === 'PRO'
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {session.user.plan === 'PRO' ? '⚡ Pro Plan' : '🆓 Free Plan'}
                </span>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Edit form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-primary transition-colors duration-300"
                />
                {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Email Address</label>
                <input
                  type="email"
                  value={session.user.email || ''}
                  disabled
                  className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border text-muted-foreground/60 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground/60 mt-1">Email cannot be changed</p>
              </div>

              <button
                type="submit"
                disabled={saving || !isDirty}
                className="btn-brand py-3 px-6 flex items-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
