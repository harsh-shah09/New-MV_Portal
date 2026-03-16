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
<<<<<<< HEAD
        pathname: "**",
=======
        pathname: "/**",
>>>>>>> dade4d7be5e710293536495ea4bb0337d36943df
      },
    ],
  },
};

export default nextConfig;
