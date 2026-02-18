import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: '41Blog – Share Your World',
    template: '%s | 41Blog',
  },
  description:
    'A private, mobile-first blog for sharing moments, photos, and stories with your community.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '41Blog',
  },
  openGraph: {
    type: 'website',
    siteName: '41Blog',
    title: '41Blog – Share Your World',
    description: 'A private, mobile-first blog.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0d0f14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <AuthProvider>
          <Navbar />
          <main className="pt-16 pb-20 min-h-dvh">{children}</main>
          <PWAInstallPrompt />
          <ServiceWorkerRegistrar />
        </AuthProvider>
      </body>
    </html>
  );
}
