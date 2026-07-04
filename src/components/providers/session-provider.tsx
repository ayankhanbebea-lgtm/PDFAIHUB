'use client';
// src/components/providers/session-provider.tsx
import { SessionProvider as NextAuthProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
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
