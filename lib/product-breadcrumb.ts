import { Category } from "@/components/Categories";
import { Product } from "@/store";
import {
  getCategories,
  getParentCategories,
  getParentCategoryFromSubcategory,
  getSubcategories,
} from "@/lib/api";
import { flattenCategories, toCategorySlug } from "@/lib/category-slug";

export type ProductBreadcrumbItem = { label: string; href?: string };

type CategoryRef = { id: number; name: string };

function toCategoryRef(cat: Category | undefined | null): CategoryRef | null {
  if (!cat?.id || !cat?.name) return null;
  return { id: cat.id, name: cat.name };
}

function breadcrumbLink(cat: CategoryRef): ProductBreadcrumbItem {
  return {
    label: cat.name,
    href: `/categories/${toCategorySlug(cat.name)}`,
  };
}

/** Read parent/subcategory hints from product.categories when present. */
function categoriesFromProductArray(
  categories: unknown[] | undefined
): { parent: CategoryRef | null; sub: CategoryRef | null } {
  if (!categories?.length) {
    return { parent: null, sub: null };
  }

  const typed = categories.filter(
    (c): c is { id?: number; name?: string; parent_category_id?: number } =>
      typeof c === "object" && c !== null
  );

  const subFromArray = typed.find((c) => c.parent_category_id && c.id && c.name);
  const parentFromArray = typed.find(
    (c) => !c.parent_category_id && c.id && c.name
  );

  let parent: CategoryRef | null = parentFromArray
    ? { id: parentFromArray.id!, name: parentFromArray.name! }
    : null;
  let sub: CategoryRef | null = subFromArray
    ? { id: subFromArray.id!, name: subFromArray.name! }
    : null;

  if (subFromArray?.parent_category_id && !parent) {
    const parentInline = typed.find(
      (c) => c.id === subFromArray.parent_category_id && c.name
    );
    if (parentInline?.id && parentInline.name) {
      parent = { id: parentInline.id, name: parentInline.name };
    }
  }

  return { parent, sub };
}

async function resolveBySubcategoryId(
  subcategoryId: number
): Promise<{ parent: CategoryRef | null; sub: CategoryRef | null }> {
  try {
    const parentCategory = await getParentCategoryFromSubcategory(subcategoryId);
    const allCategories = await getCategories(true, false);
    const subcategory = findCategoryByIdInList(
      subcategoryId,
      flattenCategories(allCategories)
    );

    return {
      parent: toCategoryRef(parentCategory),
      sub: toCategoryRef(subcategory),
    };
  } catch {
    const allCategories = await getCategories(true, false);
    const flat = flattenCategories(allCategories);
    const sub = flat.find((c) => c.id === subcategoryId) ?? null;
    const parent =
      sub?.parent_category_id != null
        ? flat.find((c) => c.id === sub.parent_category_id) ?? null
        : null;
    return {
      parent: toCategoryRef(parent),
      sub: toCategoryRef(sub),
    };
  }
}

function findCategoryByIdInList(
  id: number,
  list: Category[]
): Category | null {
  return list.find((c) => c.id === id) ?? null;
}

async function resolveByParentAndSubIds(
  parentId: number,
  subcategoryId: number
): Promise<{ parent: CategoryRef | null; sub: CategoryRef | null }> {
  const parents: Category[] = await getParentCategories();
  const parent =
    parents.find((c: Category) => c.id === parentId) ??
    findCategoryByIdInList(parentId, flattenCategories(await getCategories(true, false)));

  const subs: Category[] = await getSubcategories(parentId);
  const sub = subs.find((c: Category) => c.id === subcategoryId) ?? null;

  return {
    parent: toCategoryRef(parent),
    sub: toCategoryRef(sub),
  };
}

async function resolveByParentIdOnly(
  parentId: number
): Promise<CategoryRef | null> {
  const parents: Category[] = await getParentCategories();
  const parent =
    parents.find((c: Category) => c.id === parentId) ??
    findCategoryByIdInList(parentId, flattenCategories(await getCategories(true, false)));
  return toCategoryRef(parent);
}

/**
 * Build breadcrumb trail: parent category → subcategory → product name.
 * Home is rendered by the Breadcrumb component.
 */
export async function buildProductBreadcrumbItems(
  product: Product
): Promise<ProductBreadcrumbItem[]> {
  let parent: CategoryRef | null = null;
  let sub: CategoryRef | null = null;

  const fromArray = categoriesFromProductArray(product.categories);
  parent = fromArray.parent;
  sub = fromArray.sub;

  const subcategoryId =
    product.ecommerce_subcategory_id ?? fromArray.sub?.id ?? undefined;
  const parentCategoryId =
    product.ecommerce_category_id ?? fromArray.parent?.id ?? undefined;

  if (subcategoryId && (!parent || !sub)) {
    const resolved = await resolveBySubcategoryId(subcategoryId);
    parent = parent ?? resolved.parent;
    sub = sub ?? resolved.sub;
  }

  if (
    parentCategoryId &&
    subcategoryId &&
    (!parent || !sub)
  ) {
    const resolved = await resolveByParentAndSubIds(
      parentCategoryId,
      subcategoryId
    );
    parent = parent ?? resolved.parent;
    sub = sub ?? resolved.sub;
  }

  if (parentCategoryId && !parent && !subcategoryId) {
    parent = (await resolveByParentIdOnly(parentCategoryId)) ?? parent;
  }

  const items: ProductBreadcrumbItem[] = [];
  if (parent) items.push(breadcrumbLink(parent));
  if (sub) items.push(breadcrumbLink(sub));
  items.push({ label: product.name });
  return items;
}
