/** Routes where shoppers add products — used for the mobile Go to Cart bar. */
const EXACT_SHOPPING_PATHS = new Set([
  "/",
  "/search",
  "/popular-items",
  "/recent-items",
  "/deals",
]);

const SHOPPING_PREFIXES = ["/categories/", "/product/", "/store/"];

export function isShoppingPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (EXACT_SHOPPING_PATHS.has(pathname)) return true;
  return SHOPPING_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
