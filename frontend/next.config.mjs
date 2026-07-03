import createNextIntlPlugin from "next-intl/plugin";
import path from "path";
import { fileURLToPath } from "url";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: Turbopack must use frontend/ (not repo root lockfile).
  turbopack: {
    root: frontendRoot,
  },
  // Required when accessing `next dev` through ngrok (iPhone testing).
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok.io"],
  async rewrites() {
    // Dev-only: proxy /api to local backend when testing via ngrok on one URL.
    if (process.env.NODE_ENV !== "development") {
      return [];
    }

    const apiTarget = process.env.API_PROXY_TARGET || "http://localhost:5000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${apiTarget}/uploads/:path*`,
      },
    ];
  },
  webpack: (config, { dev }) => {
    // Avoid stale chunk references on Windows when dev/build overlap.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
