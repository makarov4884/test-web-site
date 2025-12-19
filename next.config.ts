import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 메모리 부족 방지 (무료 서버 배포용)
  eslint: {
    ignoreDuringBuilds: true,
  },
  /* config options here */

  output: "standalone",
  serverExternalPackages: ["playwright", "playwright-core"],
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
