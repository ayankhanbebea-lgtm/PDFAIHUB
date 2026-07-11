'use client';
// src/components/providers/session-provider.tsx
import { SessionProvider as NextAuthProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const logError = async (message: string, stack: string | undefined) => {
      try {
        await fetch('/api/log-client-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: window.location.href,
            message,
            stack,
            userAgent: navigator.userAgent,
          }),
        });
      } catch (e) {}
    };

    const handleWindowError = (event: ErrorEvent) => {
      logError(event.message, event.error?.stack);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      logError(
        typeof reason === 'string' ? reason : reason?.message || 'Promise Rejection',
        reason?.stack
      );
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <NextAuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--toast-bg, #1a1a24)',
              color: 'var(--toast-color, #e2e8f0)',
              border: '1px solid var(--toast-border, #2d2d3d)',
              borderRadius: '12px',
            },
          }}
        />
      </ThemeProvider>
    </NextAuthProvider>
  );
}
