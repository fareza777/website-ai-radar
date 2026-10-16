import type { NextConfig } from "next";

/** Machine data files: useful to the app, but never worth indexing as pages. */
const DATA_FILES = ["/firehose.json", "/feed-older.json", "/search-index.json"];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Pages read /data/*.json at prerender time; make sure the files are traced into server output.
  outputFileTracingIncludes: { "/**": ["./data/**/*.json", "./summaries/*.json"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      ...DATA_FILES.map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex" }] })),
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
