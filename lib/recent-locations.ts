const STORAGE_KEY = "recentLocations";
export const MAX_RECENT_LOCATIONS = 5;
export const VISIBLE_RECENT_LOCATIONS = 2;

export function loadRecentLocations(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function addRecentLocation(location: string, description?: string): string[] {
  if (!location || /^Lat:\s*[\d.-]+,\s*Lng:\s*[\d.-]+/.test(location)) {
    return loadRecentLocations();
  }

  const item = description ? `${location}|${description}` : location;
  const next = [
    item,
    ...loadRecentLocations().filter((loc) => loc.split("|")[0] !== location),
  ].slice(0, MAX_RECENT_LOCATIONS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Failed to save recent locations to localStorage:", error);
  }

  return next;
}
