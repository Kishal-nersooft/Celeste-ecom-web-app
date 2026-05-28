import { Product } from "@/store";

export type ProductSlugInput = Pick<Product, "id" | "name"> & { ref?: string };

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Readable product URL segment. Always uses name + numeric id so refs like "5777"
 * are never confused with database product IDs.
 */
export function toProductSlug(product: ProductSlugInput): string {
  const nameSlug = toSlug(product.name);
  return nameSlug ? `${nameSlug}-${product.id}` : String(product.id);
}

export function getProductPath(product: ProductSlugInput): string {
  return `/product/${toProductSlug(product)}`;
}

/** Parse slug → product id when URL uses our name-id or legacy numeric format. */
export function resolveProductSlug(slug: string): number | null {
  if (/^\d+$/.test(slug)) {
    return parseInt(slug, 10);
  }

  const trailingId = slug.match(/-(\d+)$/);
  if (trailingId) {
    return parseInt(trailingId[1], 10);
  }

  return null;
}

type ResolveOptions = {
  latitude?: number;
  longitude?: number;
  storeIds?: number[];
};

async function fetchProductByApiKey(
  apiKey: string,
  options?: ResolveOptions
): Promise<Product | null> {
  const { getProductById, apiLog } = await import("./api");
  const { latitude, longitude, storeIds } = options ?? {};

  const attempts: Array<() => Promise<Product | null>> = [];

  if (latitude !== undefined || longitude !== undefined) {
    attempts.push(async () => {
      try {
        return await getProductById(apiKey, storeIds, latitude, longitude, true);
      } catch {
        return null;
      }
    });
  }

  attempts.push(async () => {
    try {
      return await getProductById(apiKey, storeIds, undefined, undefined, true);
    } catch {
      return null;
    }
  });

  if (storeIds?.length) {
    attempts.push(async () => {
      try {
        return await getProductById(apiKey, undefined, undefined, undefined, true);
      } catch {
        return null;
      }
    });
  }

  for (const attempt of attempts) {
    const product = await attempt();
    if (product?.id) {
      apiLog(
        `GET /products/${product.id}`,
        `200 · product detail`,
        {
          slug: apiKey,
          product,
          pricing: product.pricing,
          image_urls: product.image_urls,
          inventory: product.inventory,
        },
        { dedupeKey: `product-detail|${product.id}` }
      );
      return product;
    }
  }

  return null;
}

async function findProductIdByRefOrQuery(
  refOrQuery: string,
  options?: ResolveOptions
): Promise<number | null> {
  try {
    const { searchProducts } = await import("./api");
    const searchOpts = {
      includePricing: false,
      includeInventory: false,
      includeCategories: false,
      latitude: options?.latitude,
      longitude: options?.longitude,
      storeIds: options?.storeIds,
    };

    for (const mode of ["dropdown", "full"] as const) {
      const results = await searchProducts(refOrQuery, mode, searchOpts);
      const match = results.products?.find(
        (p: { ref?: string; id: number }) =>
          String(p.ref ?? "") === refOrQuery || String(p.id) === refOrQuery
      );
      if (match?.id) return match.id;
    }
  } catch {
    // search unavailable or query rejected
  }

  return null;
}

/** Resolve a URL segment to a product (supports legacy numeric/ref URLs). */
export async function resolveProductSlugToProduct(
  slug: string,
  options?: ResolveOptions
): Promise<Product | null> {
  const parsedId = resolveProductSlug(slug);

  if (parsedId !== null) {
    const byId = await fetchProductByApiKey(String(parsedId), options);
    if (byId) return byId;

    const refId = await findProductIdByRefOrQuery(slug, options);
    if (refId !== null) {
      const byRef = await fetchProductByApiKey(String(refId), options);
      if (byRef) return byRef;
    }
  }

  if (parsedId === null || slug !== String(parsedId)) {
    const byKey = await fetchProductByApiKey(slug, options);
    if (byKey) return byKey;
  }

  const searchQuery = slug.replace(/-/g, " ").replace(/\s+\d+$/, "").trim();
  if (searchQuery.length >= 2) {
    try {
      const { searchProducts } = await import("./api");
      const results = await searchProducts(searchQuery, "full", {
        includePricing: false,
        includeInventory: false,
        includeCategories: false,
        latitude: options?.latitude,
        longitude: options?.longitude,
        storeIds: options?.storeIds,
      });
      const normalized = slug.toLowerCase();
      const match = results.products?.find(
        (p: { name: string; id: number }) => toProductSlug(p) === normalized
      );
      if (match?.id) {
        return fetchProductByApiKey(String(match.id), options);
      }
    } catch {
      // fall through
    }
  }

  if (/^\d+$/.test(slug)) {
    const refId = await findProductIdByRefOrQuery(slug, options);
    if (refId !== null) {
      return fetchProductByApiKey(String(refId), options);
    }
  }

  return null;
}

/** Resolve a URL segment to a product id (supports legacy numeric/ref URLs). */
export async function resolveProductSlugToId(
  slug: string,
  options?: ResolveOptions
): Promise<number | null> {
  const product = await resolveProductSlugToProduct(slug, options);
  return product?.id ?? null;
}
