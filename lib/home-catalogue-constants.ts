/** Matches the homepage client: first N parent category rows. */
export const HOME_PARENT_CATEGORY_LIMIT = 5;
/** Matches ProductList's default page size for the "All" view. */
export const HOME_PAGE_SIZE = 60;

export function getHomeProductsPerCategory(parentCount: number): number {
  return Math.ceil(HOME_PAGE_SIZE / Math.max(parentCount, 1));
}
