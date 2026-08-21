import { getParentCategories, getProductsWithPricing } from "@/lib/api";
import type { Category } from "@/components/Categories";
import type { Product } from "@/store";
import {
  HOME_PARENT_CATEGORY_LIMIT,
  getHomeProductsPerCategory,
} from "@/lib/home-catalogue-constants";

export interface HomeCatalogue {
  categories: Category[];
  products: Product[];
  parentCategoryNames: { [key: number]: string };
  parentProducts: { [key: number]: Product[] };
}

const EMPTY_CATALOGUE: HomeCatalogue = {
  categories: [],
  products: [],
  parentCategoryNames: {},
  parentProducts: {},
};

/**
 * Fetch parent categories and the first product rows in one server round trip
 * so the homepage HTML includes catalogue data instead of a client waterfall.
 */
export async function getHomeCatalogue(): Promise<HomeCatalogue> {
  try {
    const categoriesResponse = await getParentCategories();
    const categories: Category[] = Array.isArray(categoriesResponse)
      ? categoriesResponse
      : [];

    const parentCategories = categories
      .filter((cat) => !cat.parent_category_id)
      .slice(0, HOME_PARENT_CATEGORY_LIMIT);

    if (parentCategories.length === 0) {
      return { ...EMPTY_CATALOGUE, categories };
    }

    const perCategorySize = getHomeProductsPerCategory(parentCategories.length);

    const rows = await Promise.all(
      parentCategories.map(async (parentCat) => {
        try {
          const products = await getProductsWithPricing(
            [parentCat.id],
            1,
            perCategorySize,
            false,
            true,
            true
          );
          return {
            parentId: parentCat.id,
            parentName: parentCat.name,
            products: Array.isArray(products) ? products : [],
          };
        } catch (error) {
          console.error(
            `getHomeCatalogue - Error fetching products for category ${parentCat.id}:`,
            error
          );
          return {
            parentId: parentCat.id,
            parentName: parentCat.name,
            products: [] as Product[],
          };
        }
      })
    );

    const parentCategoryNames: { [key: number]: string } = {};
    const parentProducts: { [key: number]: Product[] } = {};
    const products: Product[] = [];

    for (const row of rows) {
      parentCategoryNames[row.parentId] = row.parentName;
      parentProducts[row.parentId] = row.products;
      products.push(...row.products);
    }

    return {
      categories,
      products,
      parentCategoryNames,
      parentProducts,
    };
  } catch (error) {
    console.error("getHomeCatalogue - Error fetching homepage catalogue:", error);
    return EMPTY_CATALOGUE;
  }
}
