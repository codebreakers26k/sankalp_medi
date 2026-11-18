import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep generated AI-agent instructions out of the application repository.
  agentRules: false,
};

export default nextConfig;
