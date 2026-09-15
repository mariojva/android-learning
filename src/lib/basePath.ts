/**
 * The path the app is mounted at.
 *
 * Next rewrites `<Link>` hrefs and asset URLs for `basePath` automatically,
 * but anything we construct by hand — an OAuth redirect, a URL we hand to
 * Supabase — has to add it back. That is what this is for.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Absolute URL for an in-app path, correct under a project page or a root domain. */
export function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${BASE_PATH}${clean}`;
}
