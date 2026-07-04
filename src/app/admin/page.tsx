'use client';
// src/app/admin/page.tsx
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  Users, FileText, DollarSign, Activity, Shield,
  Search, Ban, CheckCircle, Crown, Trash2, BarChart3
} from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [tab, setTab] = useState<'overview' | 'users'>('overview');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && session?.user?.role !== 'ADMIN')) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchStats();
      fetchUsers();
    }
  }, [session]);

  const fetchStats = async () => {
    const { data } = await axios.get('/api/admin/stats');
    setStats(data);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (planFilter) params.set('plan', planFilter);
    const { data } = await axios.get(`/api/admin/users?${params}`);
    setUsers(data.users || []);
  };

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') fetchUsers();
  }, [search, planFilter]);

  const userAction = async (userId: string, action: string, extra?: any) => {
    setActionLoading(userId);
    try {
      await axios.patch('/api/admin/users', { userId, action, ...extra });
      toast.success('Updated!');
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading('');
    }
  };

  if (status === 'loading' || !session || session.user.role !== 'ADMIN') return null;

  const statCards = stats ? [
    { label: 'Total Users', value: stats.stats.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Pro Users', value: stats.stats.proUsers, icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Total Files', value: stats.stats.totalFiles, icon: FileText, color: 'text-brand-500', bg: 'bg-brand-500/10' },
    { label: 'Monthly Revenue', value: `₹${stats.stats.monthlyRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'New Users Today', value: stats.stats.newUsersToday, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Usage Today', value: stats.stats.usageToday, icon: BarChart3, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-surface-dark">
      <Navbar />
      <main className="pt-20">
        <div className="section-container py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
              <p className="text-sm text-gray-500">Manage users, subscriptions, and monitor the platform</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(['overview', 'users'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                  tab === t
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {loading
                  ? [...Array(6)].map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)
                  : statCards.map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <motion.div
                          key={stat.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass rounded-2xl p-5 border border-white/5"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-500">{stat.label}</p>
                            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                              <Icon className={`w-4 h-4 ${stat.color}`} />
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                        </motion.div>
                      );
                    })}
              </div>

              {/* Tool usage chart */}
              {stats?.toolUsage?.length > 0 && (
                <div className="glass rounded-2xl p-6 border border-white/5 mb-8">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Tool Usage</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.toolUsage}>
                      <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip
                        contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        labelStyle={{ color: '#e2e8f0' }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {stats.toolUsage.map((_: any, i: number) => (
                          <Cell key={i} fill={i % 2 === 0 ? '#4f6bff' : '#ff30a8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recent users */}
              <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-5 border-b border-white/5">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Recent Signups</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {stats?.recentUsers?.map((user: any) => (
                    <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-white/2">
                      <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center text-sm font-bold text-brand-400">
                        {user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${user.plan === 'PRO' ? 'bg-brand-500/20 text-brand-400' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                        {user.plan}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(user.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'users' && (
            <>
              {/* Filters */}
              <div className="flex gap-3 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-400"
                  />
                </div>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none"
                >
                  <option value="">All Plans</option>
                  <option value="FREE">Free</option>
                  <option value="PRO">Pro</option>
                </select>
              </div>

              {/* Users table */}
              <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-left">
                        <th className="px-5 py-3.5 font-medium text-gray-500">User</th>
                        <th className="px-5 py-3.5 font-medium text-gray-500">Plan</th>
                        <th className="px-5 py-3.5 font-medium text-gray-500">Files</th>
                        <th className="px-5 py-3.5 font-medium text-gray-500">Status</th>
                        <th className="px-5 py-3.5 font-medium text-gray-500">Joined</th>
                        <th className="px-5 py-3.5 font-medium text-gray-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-white/2 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400">
                                {user.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{user.name || '—'}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.plan === 'PRO' ? 'bg-brand-500/20 text-brand-400' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                              {user.plan}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500">{user._count?.files || 0}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-1 rounded-full text-xs ${user.banned ? 'bg-red-100 dark:bg-red-950/30 text-red-500' : 'bg-green-100 dark:bg-green-950/30 text-green-500'}`}>
                              {user.banned ? 'Banned' : 'Active'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1 justify-end">
                              {user.banned ? (
                                <button
                                  onClick={() => userAction(user.id, 'unban')}
                                  disabled={actionLoading === user.id}
                                  className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/30 text-green-500 transition-colors"
                                  title="Unban"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => userAction(user.id, 'ban')}
                                  disabled={actionLoading === user.id}
                                  className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-red-500 transition-colors"
                                  title="Ban"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                              {user.plan !== 'PRO' ? (
                                <button
                                  onClick={() => userAction(user.id, 'setPlan', { plan: 'PRO' })}
                                  disabled={actionLoading === user.id}
                                  className="p-1.5 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-950/30 text-brand-500 transition-colors"
                                  title="Grant Pro"
                                >
                                  <Crown className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => userAction(user.id, 'setPlan', { plan: 'FREE' })}
                                  disabled={actionLoading === user.id}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 transition-colors"
                                  title="Revoke Pro"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
