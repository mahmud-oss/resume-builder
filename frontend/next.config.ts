import type { NextConfig } from "next";

// The browser talks only to this server; /api/* is passed on to the Java backend.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Playwright drives a real browser and must stay a plain Node dependency, not be bundled.
  serverExternalPackages: ["playwright", "playwright-core", "@sparticuz/chromium"],
  // The Chromium build is a binary the file tracer cannot see; ship it with the PDF route.
  outputFileTracingIncludes: {
    "/export/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
