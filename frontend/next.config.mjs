import createNextIntlPlugin from "next-intl/plugin";
import path from "path";
import { fileURLToPath } from "url";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const apiProxyTarget =
  process.env.API_PROXY_TARGET || "http://localhost:5000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: frontendRoot,
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${apiProxyTarget}/uploads/:path*`,
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
