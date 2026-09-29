import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.mlstatic.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "mlstatic.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;