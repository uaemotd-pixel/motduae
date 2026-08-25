import createNextIntlPlugin from "next-intl/plugin";
import path from "path";
import { fileURLToPath } from "url";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(frontendRoot, "../..");
const apiProxyTarget = process.env.API_PROXY_TARGET || "http://localhost:5000";
const isDev = process.env.NODE_ENV === "development";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isDev
    ? {
        turbopack: {
          root: projectRoot,
        },
      }
    : {}),
  async redirects() {
    return [
      {
        source: "/:locale/sub-admin-dashboard",
        destination: "/:locale/admin",
        permanent: true,
      },
      {
        source: "/:locale/sub-admin-dashboard/dashboard",
        destination: "/:locale/admin",
        permanent: true,
      },
      {
        source: "/:locale/sub-admin-dashboard/:path*",
        destination: "/:locale/admin/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    // In development, proxy /api and /uploads from the Next.js dev server
    // (:3000) to the standalone Express backend (:5000). In production the
    // frontend and backend share the same origin (see vercel.json routes),
    // so no proxy is needed and these rewrites are skipped.
    if (!isDev) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
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
