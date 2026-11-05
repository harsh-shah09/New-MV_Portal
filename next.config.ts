import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: `${process.env.BUCKET_NAME || process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com`,
        pathname: "/**",
      },
    ],
  },
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'playwright-aws-lambda', 'playwright-core', 'node-qpdf2'],
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/playwright-core/browsers.json"
    ],
  },
};

export default nextConfig;
