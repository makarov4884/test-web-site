import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
