import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Required for slim production Docker images (copies .next/standalone).
  output: "standalone",
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
