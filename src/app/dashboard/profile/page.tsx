'use client';
// src/app/dashboard/profile/page.tsx
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import toast from 'react-hot-toast';
import { User, Camera, Save } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 dark:bg-surface-dark">
      <Navbar />
      <main className="pt-20">
        <div className="section-container py-8 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Profile Settings</h1>

          <div className="bg-[#161B22] border border-[#1F2937] rounded-2xl p-8 space-y-8">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative">
                {session.user.image ? (
                  <img src={session.user.image} alt="" className="w-20 h-20 rounded-2xl" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-[#10B981] flex items-center justify-center text-white text-2xl font-bold">
                    {session.user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-white">{session.user.name}</p>
                <p className="text-sm text-[#9CA3AF]">{session.user.email}</p>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full mt-2 ${
                  session.user.plan === 'PRO'
                    ? 'bg-[#10B981]/20 text-[#10B981]'
                    : 'bg-[#1F2937] text-[#9CA3AF]'
                }`}>
                  {session.user.plan === 'PRO' ? '⚡ Pro Plan' : '🆓 Free Plan'}
                </span>
              </div>
            </div>

            <div className="border-t border-[#1F2937]" />

            {/* Edit form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-[#9CA3AF] mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-[#1F2937] text-white focus:outline-none focus:border-[#10B981] transition-colors"
                />
                {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-[#9CA3AF] mb-1.5 block">Email Address</label>
                <input
                  type="email"
                  value={session.user.email || ''}
                  disabled
                  className="w-full px-4 py-3 rounded-xl bg-[#111827]/50 border border-[#1F2937] text-[#6B7280] cursor-not-allowed"
                />
                <p className="text-xs text-[#6B7280] mt-1">Email cannot be changed</p>
              </div>

              <button
                type="submit"
                disabled={saving || !isDirty}
                className="btn-brand py-3 px-6 flex items-center gap-2 disabled:opacity-60"
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
