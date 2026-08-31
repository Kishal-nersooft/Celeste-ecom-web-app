/** Parent category rows fetched client-side for the "All" view. */
export const HOME_PARENT_CATEGORY_LIMIT = 5;
/** Parent categories included in the server-rendered homepage HTML. */
export const HOME_SERVER_CATEGORY_LIMIT = 2;
/** Matches ProductList's default page size for the "All" view. */
export const HOME_PAGE_SIZE = 60;

export function getHomeProductsPerCategory(parentCount: number): number {
  return Math.ceil(HOME_PAGE_SIZE / Math.max(parentCount, 1));
}
