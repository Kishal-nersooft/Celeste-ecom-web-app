/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
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
    ],
  },
};

module.exports = nextConfig;
