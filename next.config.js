/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: 'standalone', // Required for Docker production builds
  // FastAPI list routes are `/products/`, `/orders/`, etc. Without this, Next.js
  // 308s `/api/backend/products/` → `/api/backend/products` before the proxy runs.
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
      {
        protocol: "https",
        hostname: "tb-static.uber.com",
      },
      {
        protocol: "https",
        hostname: "d1kemjnwqducuu.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "drive.usercontent.google.com",
      },
      {
        protocol: "https",
        hostname: "celesteimagehost.blob.core.windows.net",
      },
    ],
  },
};

module.exports = nextConfig;
