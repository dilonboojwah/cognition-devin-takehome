import type { NextConfig } from "next";

// Server Actions reject a forwarded host that does not match the request origin.
// Set ALLOWED_FORWARDED_HOSTS to a comma separated list when serving the app
// through a proxy or tunnel, for example a shared preview URL.
const allowedOrigins = (process.env.ALLOWED_FORWARDED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  experimental: {
    serverActions: allowedOrigins.length ? { allowedOrigins } : undefined,
  },
  allowedDevOrigins: allowedOrigins.map((host) => host.split(":")[0]),
};

export default nextConfig;
