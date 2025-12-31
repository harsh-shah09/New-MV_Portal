import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL('https://qftestv.s3.us-east-1.amazonaws.com/uploads/**')],
  },
};

export default nextConfig;
