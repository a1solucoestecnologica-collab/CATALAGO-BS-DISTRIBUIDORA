import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.bling.com.br",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "**.bling.com.br",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "orgbling.s3.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
