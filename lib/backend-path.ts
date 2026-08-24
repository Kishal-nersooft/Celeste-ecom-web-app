/**
 * FastAPI (`redirect_slashes=True`) treats `/orders` and `/orders/` as different
 * routes. Top-level list routers are registered as `/` on the prefix, so the
 * canonical URL has a trailing slash. Every other endpoint 307s the other way.
 *
 * Next.js also 308-redirects `/api/backend/products/` → `/api/backend/products`,
 * so the proxy must restore the FastAPI slash when forwarding.
 */
export const TRAILING_SLASH_COLLECTION_ROOTS = new Set([
  "categories",
  "products",
  "stores",
  "orders",
]);

export type BackendQuery = URLSearchParams | string | null | undefined;

function queryString(query: BackendQuery): string {
  if (!query) return "";
  const qs = typeof query === "string" ? query.replace(/^\?/, "") : query.toString();
  return qs;
}

/**
 * Normalize a backend path (+ optional query) to FastAPI's canonical form.
 * `/products` → `/products/`; `/users/me/carts/` → `/users/me/carts`.
 */
export function canonicalBackendPath(path: string, query?: BackendQuery): string {
  const trimmed = path.trim();
  const qIndex = trimmed.indexOf("?");
  const pathname = qIndex === -1 ? trimmed : trimmed.slice(0, qIndex);
  const fromPath = qIndex === -1 ? "" : trimmed.slice(qIndex + 1);

  const segments = pathname.split("/").filter(Boolean);
  let canonical = `/${segments.join("/")}`;
  if (segments.length === 1 && TRAILING_SLASH_COLLECTION_ROOTS.has(segments[0])) {
    canonical += "/";
  }

  const extra = queryString(query);
  const search = [fromPath, extra].filter(Boolean).join("&");
  return search ? `${canonical}?${search}` : canonical;
}
