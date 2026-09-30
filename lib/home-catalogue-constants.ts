/** Store pages, and the product count for one homepage row. */
export const HOME_PARENT_CATEGORY_LIMIT = 5;
/** Parent rows fetched before the user scrolls the homepage All view. */
export const INITIAL_VISIBLE_PARENT_CATEGORIES = 2;
/** Parent categories included in the server-rendered homepage HTML. */
export const HOME_SERVER_CATEGORY_LIMIT = 2;
/** Subcategory rows shown, with products, before the user scrolls. */
export const INITIAL_VISIBLE_SUBCATEGORIES = 2;
/** Matches ProductList's default page size for the "All" view. */
export const HOME_PAGE_SIZE = 60;

export function getHomeProductsPerCategory(parentCount: number): number {
  return Math.ceil(HOME_PAGE_SIZE / Math.max(parentCount, 1));
}
