import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
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
