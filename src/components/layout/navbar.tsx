'use client';
// src/components/layout/navbar.tsx — Hydration-safe
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Zap, Menu, X, Sun, Moon, ChevronDown,
  User, LayoutDashboard, LogOut, Shield, CreditCard, Sparkles
} from 'lucide-react';

const pdfTools = [
  { name: 'PDF Merge', href: '/tools/merge', icon: '🔗', free: true },
  { name: 'PDF Compress', href: '/tools/compress', icon: '🗜️', free: true },
  { name: 'PDF Split', href: '/tools/split', icon: '✂️', free: true },
  { name: 'PDF to Word', href: '/tools/pdf-to-word', icon: '📝', free: true },
  { name: 'Image to PDF', href: '/tools/image-to-pdf', icon: '🖼️', free: true },
  { name: 'PDF Protect', href: '/tools/protect', icon: '🔒', free: true },
];

const aiTools = [
  { name: 'AI Summarizer', href: '/ai/summarize', icon: '🤖' },
  { name: 'AI PDF Chat', href: '/ai/chat', icon: '💬' },
  { name: 'Flashcards', href: '/ai/flashcards', icon: '🃏' },
  { name: 'Quiz Generator', href: '/ai/quiz', icon: '❓' },
];

export function Navbar() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Fix hydration: only render theme-dependent UI after mount
  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass border-b border-white/10' : 'bg-transparent'
      }`}
    >
      <div className="section-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl flex-shrink-0">
            <div className="w-8 h-8 bg-[#10B981] rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="gradient-text">PDFAI Hub</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {/* PDF Tools */}
            <div
              className="relative"
              onMouseEnter={() => setToolsOpen(true)}
              onMouseLeave={() => setToolsOpen(false)}
            >
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                <FileText className="w-4 h-4" />
                PDF Tools
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {toolsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 w-64 glass rounded-2xl p-2 shadow-xl border border-white/10"
                  >
                    {pdfTools.map((tool) => (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <span>{tool.icon}</span>
                        <span className="flex-1">{tool.name}</span>
                        <span className="text-[10px] bg-green-500/15 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full">Free</span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* AI Tools */}
            <div
              className="relative"
              onMouseEnter={() => setAiOpen(true)}
              onMouseLeave={() => setAiOpen(false)}
            >
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                <Zap className="w-4 h-4" />
                AI Features
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {aiOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 w-56 glass rounded-2xl p-2 shadow-xl border border-white/10"
                  >
                    {aiTools.map((tool) => (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <span>{tool.icon}</span>
                        <span className="flex-1">{tool.name}</span>
                        <span className="text-[10px] bg-accent-500/15 text-accent-500 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> AI
                        </span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link href="/pricing" className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              Pricing
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle — only after mount to prevent hydration mismatch */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            {/* User menu */}
            {session ? (
              <div
                className="relative hidden md:block"
                onMouseEnter={() => setUserOpen(true)}
                onMouseLeave={() => setUserOpen(false)}
              >
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-white/10 hover:border-white/20 transition-colors">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-7 h-7 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#10B981] flex items-center justify-center text-white text-xs font-bold">
                      {session.user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-white hidden sm:block max-w-[100px] truncate">
                    {session.user.name?.split(' ')[0]}
                  </span>
                  {session.user.plan === 'PRO' && (
                    <span className="text-[10px] bg-[#10B981] text-white px-1.5 py-0.5 rounded-full font-bold">PRO</span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                <AnimatePresence>
                  {userOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 w-56 glass rounded-2xl p-2 shadow-xl border border-white/10"
                    >
                      <div className="px-3 py-2.5 border-b border-white/10 mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{session.user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session.user.email}</p>
                      </div>
                      {[
                        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                        { href: '/dashboard/profile', icon: User, label: 'Profile' },
                        { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      ))}
                      {session.user.role === 'ADMIN' && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-white/10 mt-1 pt-1">
                        <button
                          onClick={() => signOut({ callbackUrl: '/' })}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Sign in
                </Link>
                <Link href="/auth/register" className="btn-brand text-sm py-2 px-4">
                  Get Started Free
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden glass border-t border-white/10"
          >
            <div className="section-container py-4 space-y-1 max-h-[80vh] overflow-y-auto">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-1 uppercase tracking-wider">
                PDF Tools — Free, No Login
              </p>
              {pdfTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-white/5 transition-colors"
                  onClick={closeMobile}
                >
                  <span>{tool.icon}</span>
                  {tool.name}
                </Link>
              ))}

              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-1 uppercase tracking-wider mt-3">
                AI Features
              </p>
              {aiTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-white/5 transition-colors"
                  onClick={closeMobile}
                >
                  <span>{tool.icon}</span>
                  {tool.name}
                  <span className="text-xs text-accent-400 ml-auto">Login req.</span>
                </Link>
              ))}

              <div className="border-t border-white/10 pt-3 mt-3 space-y-2">
                <Link href="/pricing" className="block px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" onClick={closeMobile}>
                  Pricing
                </Link>
                {session ? (
                  <>
                    <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm" onClick={closeMobile}>
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                    <button
                      onClick={() => { signOut({ callbackUrl: '/' }); closeMobile(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2 px-1">
                    <Link href="/auth/login" className="flex-1 text-center py-2.5 text-sm rounded-xl border border-white/10 text-gray-300" onClick={closeMobile}>
                      Sign in
                    </Link>
                    <Link href="/auth/register" className="flex-1 btn-brand text-sm py-2.5 text-center" onClick={closeMobile}>
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
