'use client';
// src/components/layout/navbar.tsx — Theme-aware
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
  { name: 'JPG to PDF', href: '/tools/jpg-to-pdf', icon: '🖼️', free: true },
  { name: 'Word to PDF', href: '/tools/word-to-pdf', icon: '📝', free: true },
  { name: 'PowerPoint to PDF', href: '/tools/powerpoint-to-pdf', icon: '📊', free: true },
  { name: 'Excel to PDF', href: '/tools/excel-to-pdf', icon: '📈', free: true },
  { name: 'HTML to PDF', href: '/tools/html-to-pdf', icon: '🌐', free: true },
  { name: 'PDF to JPG', href: '/tools/pdf-to-jpg', icon: '🖼️', free: true },
  { name: 'PDF to PowerPoint', href: '/tools/pdf-to-powerpoint', icon: '📊', free: true },
  { name: 'PDF to Excel', href: '/tools/pdf-to-excel', icon: '📈', free: true },
  { name: 'PDF to PDF/A', href: '/tools/pdf-to-pdfa', icon: '🏛️', free: true },
];

const proPdfTools = [
  { name: 'Unlock PDF', href: '/tools/unlock', icon: '🔓', isPro: true },
  { name: 'Watermark PDF', href: '/tools/watermark', icon: '📝', isPro: true },
  { name: 'Rotate PDF', href: '/tools/rotate', icon: '🔄', isPro: true },
  { name: 'Organize PDF', href: '/tools/organize', icon: '📊', isPro: true },
  { name: 'OCR Extract', href: '/tools/ocr', icon: '🔍', isPro: true },
];

const aiTools = [
  { name: 'AI Summarizer', href: '/ai/summarize', icon: '🤖' },
  { name: 'AI PDF Chat', href: '/ai/chat', icon: '💬' },
  { name: 'Flashcards', href: '/ai/flashcards', icon: '🃏' },
  { name: 'Quiz Generator', href: '/ai/quiz', icon: '❓' },
  { name: 'AI Exam Mode', href: '/ai/exam', icon: '🎓', isPro: true },
];

export function Navbar() {
  const { data: session } = useSession();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [proToolsOpen, setProToolsOpen] = useState(false);
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
        scrolled ? 'glass border-b border-border' : 'bg-transparent'
      }`}
    >
      <div className="section-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl flex-shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
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
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
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
                    className="absolute top-full left-0 mt-1 w-[520px] grid grid-cols-2 gap-1 glass rounded-2xl p-3 shadow-xl border border-border z-50"
                  >
                    {pdfTools.map((tool) => (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      >
                        <span>{tool.icon}</span>
                        <span className="flex-1">{tool.name}</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">Free</span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Pro PDF Tools */}
            <div
              className="relative"
              onMouseEnter={() => setProToolsOpen(true)}
              onMouseLeave={() => setProToolsOpen(false)}
            >
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Pro PDF Tools
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${proToolsOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {proToolsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 w-64 glass rounded-2xl p-2 shadow-xl border border-border"
                  >
                    {proPdfTools.map((tool) => (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      >
                        <span>{tool.icon}</span>
                        <span className="flex-1">{tool.name}</span>
                        <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">Pro</span>
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
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
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
                    className="absolute top-full left-0 mt-1 w-56 glass rounded-2xl p-2 shadow-xl border border-border"
                  >
                    {aiTools.map((tool) => (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      >
                        <span>{tool.icon}</span>
                        <span className="flex-1">{tool.name}</span>
                        {tool.isPro ? (
                          <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
                            Pro
                          </span>
                        ) : (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-semibold">
                            <Sparkles className="w-2.5 h-2.5" /> AI
                          </span>
                        )}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link href="/pricing" className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
              Pricing
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle — only after mount to prevent hydration mismatch */}
            {mounted && (
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                aria-label="Toggle theme"
              >
                {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            {/* User menu */}
            {session ? (
              <div
                className="relative hidden md:block"
                onMouseEnter={() => setUserOpen(true)}
                onMouseLeave={() => setUserOpen(false)}
              >
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-border hover:border-border/85 transition-colors">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-7 h-7 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                      {session.user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground hidden sm:block max-w-[100px] truncate">
                    {session.user.name?.split(' ')[0]}
                  </span>
                  {session.user.plan === 'PRO' && (
                    <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">PRO</span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>

                <AnimatePresence>
                  {userOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 w-56 glass rounded-2xl p-2 shadow-xl border border-border"
                    >
                      <div className="px-3 py-2.5 border-b border-border mb-1">
                        <p className="text-sm font-medium text-foreground truncate">{session.user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                      </div>
                      {[
                        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                        { href: '/dashboard/profile', icon: User, label: 'Profile' },
                        { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      ))}
                      {session.user.role === 'ADMIN' && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-primary hover:bg-secondary transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-border mt-1 pt-1">
                        <button
                          onClick={() => signOut({ callbackUrl: '/' })}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-destructive/10 transition-colors"
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
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
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
            className="md:hidden overflow-hidden glass border-t border-border"
          >
            <div className="section-container py-4 space-y-1 max-h-[80vh] overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground px-3 py-1 uppercase tracking-wider">
                PDF Tools — Free, No Login
              </p>
              {pdfTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  onClick={closeMobile}
                >
                  <span>{tool.icon}</span>
                  <span className="flex-1">{tool.name}</span>
                </Link>
              ))}

              <p className="text-xs font-semibold text-muted-foreground px-3 py-1 uppercase tracking-wider mt-3">
                ⭐ Pro PDF Tools
              </p>
              {proPdfTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors font-medium text-amber-600 dark:text-amber-500"
                  onClick={closeMobile}
                >
                  <span>{tool.icon}</span>
                  <span className="flex-1">{tool.name}</span>
                  <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold">Pro</span>
                </Link>
              ))}

              <p className="text-xs font-semibold text-muted-foreground px-3 py-1 uppercase tracking-wider mt-3">
                AI Features
              </p>
              {aiTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  onClick={closeMobile}
                >
                  <span>{tool.icon}</span>
                  <span className="flex-1">{tool.name}</span>
                  {tool.isPro ? (
                    <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">Pro</span>
                  ) : (
                    <span className="text-xs text-primary ml-auto font-semibold">Login req.</span>
                  )}
                </Link>
              ))}

              <div className="border-t border-border pt-3 mt-3 space-y-2">
                <Link href="/pricing" className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground" onClick={closeMobile}>
                  Pricing
                </Link>
                {session ? (
                  <>
                    <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground" onClick={closeMobile}>
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                    <button
                      onClick={() => { signOut({ callbackUrl: '/' }); closeMobile(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-destructive/10"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2 px-1">
                    <Link href="/auth/login" className="flex-1 text-center py-2.5 text-sm rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary" onClick={closeMobile}>
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
