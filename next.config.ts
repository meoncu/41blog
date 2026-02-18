import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow images from R2 and common CDNs
  images: {
    remotePatterns: [
      {
        // Your R2 public bucket
        protocol: 'https',
        hostname: 'pub-0ae0b07a370442c6836d4cfc0edfe24a.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google profile photos
      },
      // Add your custom R2 domain here if applicable
      // { protocol: 'https', hostname: 'images.yourdomain.com' },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=self, geolocation=self, microphone=()',
          },
        ],
      },
      {
        // Service worker must be served from root
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
