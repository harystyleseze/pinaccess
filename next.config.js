/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable experimental features as needed
  },
  env: {
    // Make environment variables available to the client (only non-sensitive ones)
    PINATA_GATEWAY_URL: process.env.PINATA_GATEWAY_URL,
    USDC_TOKEN_ADDRESS: process.env.USDC_TOKEN_ADDRESS,
    NETWORK: process.env.NETWORK,
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking attacks (allow same-origin framing for content display)
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Enable XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline and unsafe-eval
              "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "frame-src 'self' blob: data: https:", // Allow blob URLs and HTTPS for content display
              "connect-src 'self' https://api.pinata.cloud https://gateway.mypinata.cloud https://*.mypinata.cloud https://metamask-sdk.api.cx.metamask.io https://mm-sdk-analytics.api.cx.metamask.io https://pulse.walletconnect.org https://api.web3modal.org https://sepolia.base.org https://base-sepolia.g.alchemy.com https://base-sepolia.infura.io https://rpc.ankr.com https://base-sepolia-rpc.publicnode.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          // Strict Transport Security (HTTPS only)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Permissions Policy (formerly Feature Policy)
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'payment=()',
              'usb=()',
            ].join(', '),
          },
        ],
      },
      // API routes specific headers
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig