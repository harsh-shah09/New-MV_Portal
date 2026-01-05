import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL(`https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/uploads/**`)],
  },
};

export default nextConfig;
