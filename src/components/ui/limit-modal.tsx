'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface LimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'pdf' | 'ai';
  resetInMs: number;
}

export function LimitModal({ isOpen, onClose, type, resetInMs }: LimitModalProps) {
  if (!isOpen) return null;

  // Format countdown
  const hours = Math.floor(resetInMs / (1000 * 60 * 60));
  const minutes = Math.floor((resetInMs % (1000 * 60 * 60)) / (1000 * 60));
  const countdownText = hours > 0 || minutes > 0 
    ? `${hours}h ${minutes}m` 
    : 'soon';

  const limitText = type === 'pdf' 
    ? "You've reached your free limit of 50 PDF operations. Your limit will reset 24 hours after your first PDF operation, or upgrade to Pro for unlimited usage."
    : "You've used all 10 free AI requests. Upgrade to Pro for unlimited AI features, or wait until your 24-hour limit resets.";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 dark:bg-black/60 bg-black/40 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card p-8 shadow-2xl border border-border transition-colors duration-300"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>
          </div>

          {/* Title & Desc */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Limit Reached
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {limitText}
            </p>
          </div>

          {/* Timer Card */}
          <div className="bg-secondary rounded-2xl p-4 flex items-center justify-center gap-3 mb-6 border border-border">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Resets in: <span className="text-primary font-bold">{countdownText}</span>
            </span>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Link
              href="/pricing"
              onClick={onClose}
              className="w-full btn-brand py-3 text-center rounded-xl font-bold flex items-center justify-center gap-2 shadow-glow-brand cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" /> Upgrade to Pro
            </Link>
            <button
              onClick={onClose}
              className="w-full py-3 text-center rounded-xl border border-border text-foreground font-medium hover:bg-secondary transition-colors cursor-pointer"
            >
              Wait for Reset
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
