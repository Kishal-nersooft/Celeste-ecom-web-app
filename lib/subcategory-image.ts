import { normalizeImageUrl } from "@/lib/normalize-image-url";

/** Resolve the best display image URL from a category/subcategory record. */
export function getSubcategoryImageUrl(subcategory: unknown): string | null {
  if (!subcategory || typeof subcategory !== "object") return null;

  const record = subcategory as Record<string, unknown>;

  const candidates: unknown[] = [
    record.image_url,
    record.imageUrl,
    record.image,
    record.image_url_web,
    record.image_url_mobile,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) {
      return normalizeImageUrl(c);
    }
  }

  const arrayKeys = [
    "image_urls",
    "imageUrls",
    "image_urls_web",
    "image_urls_mobile",
  ];

  for (const key of arrayKeys) {
    const arr = record[key];
    if (!Array.isArray(arr) || arr.length === 0) continue;

    const first = arr[0];
    if (typeof first === "string" && first.trim().length > 0) {
      return normalizeImageUrl(first);
    }
    if (first && typeof first === "object") {
      const obj = first as Record<string, unknown>;
      for (const field of ["image_url", "imageUrl", "url", "image"]) {
        const value = obj[field];
        if (typeof value === "string" && value.trim().length > 0) {
          return normalizeImageUrl(value);
        }
      }
    }
  }

  return null;
}
