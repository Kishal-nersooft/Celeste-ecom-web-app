/**
 * Category labels belong in the backend. This helper only prepares them
 * for the narrow nav: prefer display_name when the API sends it, strip
 * emoji, and allow wrapping after a slash.
 */
export function stripCategoryEmojis(name: string): string {
  return name
    .replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}/gu, "")
    .replace(/[\uFE0F\u200D\u20E3]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getCategoryDisplayName(
  name: string,
  displayName?: string | null
): string {
  const source = displayName?.trim() || name;
  const cleaned = stripCategoryEmojis(source);
  if (!cleaned) return source;
  return cleaned.replace(/\//g, "/\u200b");
}
