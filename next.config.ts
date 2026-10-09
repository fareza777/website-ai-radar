import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Pages read /data/*.json at prerender time; make sure the files are traced into server output.
  outputFileTracingIncludes: { "/**": ["./data/**/*.json", "./summaries/*.json"] },
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
