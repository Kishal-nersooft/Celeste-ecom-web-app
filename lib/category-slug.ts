import { Category } from "@/components/Categories";

/** Flatten parent categories and nested subcategories into one list. */
export function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];
  for (const cat of categories) {
    result.push(cat);
    if (cat.subcategories?.length) {
      result.push(...flattenCategories(cat.subcategories));
    }
  }
  return result;
}

export function findCategoryById(
  categoryId: number,
  categories: Category[]
): Category | null {
  return flattenCategories(categories).find((c) => c.id === categoryId) ?? null;
}

/** Convert a category display name to a URL-safe slug. */
export function toCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findCategoryBySlug(
  slug: string,
  parentCategories: Category[],
  subcategories: Category[] = []
): Category | null {
  const normalized = slug.toLowerCase();
  const all = [...parentCategories, ...subcategories];
  const bySlug = all.find((c) => toCategorySlug(c.name) === normalized);
  if (bySlug) return bySlug;
  if (/^\d+$/.test(slug)) {
    return all.find((c) => c.id === parseInt(slug, 10)) ?? null;
  }
  return null;
}

export function findCategoryIdBySlug(
  slug: string,
  parentCategories: Category[],
  subcategories: Category[] = []
): number | null {
  return findCategoryBySlug(slug, parentCategories, subcategories)?.id ?? null;
}

export function getCategorySlug(
  categoryId: number,
  parentCategories: Category[],
  subcategories: Category[] = []
): string | null {
  const all = [...parentCategories, ...subcategories];
  const cat = all.find((c) => c.id === categoryId);
  return cat ? toCategorySlug(cat.name) : null;
}

/** Resolve a URL segment (numeric id or name slug) to a category id. */
export async function resolveCategorySlugToId(slug: string): Promise<number | null> {
  if (/^\d+$/.test(slug)) {
    return parseInt(slug, 10);
  }

  const { getParentCategories, getSubcategories } = await import("./api");
  const parents = await getParentCategories();
  const parentMatch = findCategoryBySlug(slug, parents);
  if (parentMatch) return parentMatch.id;

  for (const parent of parents) {
    const subs = await getSubcategories(parent.id);
    const subMatch = findCategoryBySlug(slug, [], subs);
    if (subMatch) return subMatch.id;
  }

  return null;
}
