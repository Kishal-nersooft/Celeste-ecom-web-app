import { normalizeImageUrl } from "@/lib/normalize-image-url";

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function firstFromArray(arr: unknown): string | null {
  if (!Array.isArray(arr)) return null;

  for (const item of arr) {
    if (typeof item === "string" && item.trim()) return item.trim();
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const nested = firstNonEmptyString(
        obj.image_url,
        obj.imageUrl,
        obj.url,
        obj.image
      );
      if (nested) return nested;
    }
  }

  return null;
}

/** First usable product image URL, normalized the same way as ProductCard. */
export function getProductImageUrl(product: unknown): string | null {
  if (!product || typeof product !== "object") return null;

  const record = product as Record<string, unknown>;
  const raw =
    firstFromArray(record.image_urls) ||
    firstFromArray(record.imageUrls) ||
    firstFromArray(record.images) ||
    firstNonEmptyString(
      record.imageUrl,
      record.image_url,
      record.image,
      record.thumbnail,
      record.thumbnail_url
    );

  if (!raw) return null;

  const normalized = normalizeImageUrl(raw).trim();
  if (!normalized) return null;
  if (normalized.startsWith("http") || normalized.startsWith("/")) {
    return normalized;
  }

  return null;
}
