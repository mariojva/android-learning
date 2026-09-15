import type { NextConfig } from "next";

/**
 * Static export.
 *
 * GitHub Pages serves files, not a Node process, so the whole application is
 * pre-rendered to HTML at build time. Three consequences worth knowing:
 *
 *   1. No route handlers. Kotlin "execution" runs in the browser
 *      (src/lib/kotlin-runner.ts) and talks to a remote runner directly if
 *      one is configured.
 *   2. Every dynamic route declares `dynamicParams = false` and generates
 *      its params, so each question and lesson becomes a real HTML file and
 *      deep links work without a rewrite rule.
 *   3. `NEXT_PUBLIC_*` values are inlined at build time, not read at run
 *      time — changing Supabase credentials means rebuilding.
 *
 * A project page is served from https://<user>.github.io/<repo>/, so assets
 * need a base path. The deploy workflow derives it from the repository name;
 * a user site (<user>.github.io) or a custom domain leaves it empty.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  // Emits /practice/debounced-search/index.html rather than a bare .html,
  // which is what lets a static host resolve nested paths.
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
