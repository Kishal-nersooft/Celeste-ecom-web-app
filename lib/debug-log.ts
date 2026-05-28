/**
 * Development logging — collapsed API groups in DevTools; expand to see arrays/objects.
 * Set NEXT_PUBLIC_DEBUG=true for deeper flow logs (cart, location, cache).
 * Each unique endpoint+summary is logged once per page session (no repeat spam).
 */

const isDev = process.env.NODE_ENV === 'development';
const isDeepDebug =
  isDev && process.env.NEXT_PUBLIC_DEBUG === 'true';

/** Keys already logged this session — prevents Strict Mode / remount duplicates */
const loggedApiKeys = new Set<string>();

export function isDebugEnabled(): boolean {
  return isDeepDebug;
}

export type ApiLogDetails = Record<string, unknown>;

export type ApiLogOptions = {
  /** Log again even if the same label+summary was already printed */
  force?: boolean;
  /** Custom dedupe key (default: label + summary) */
  dedupeKey?: string;
};

/** One collapsed line per API call; click ▶ in console to see url, params, arrays. */
export function apiLog(
  label: string,
  summary: string,
  details?: ApiLogDetails,
  options?: ApiLogOptions
): void {
  if (!isDev) return;

  const dedupeKey = options?.dedupeKey ?? `${label}|${summary}`;
  if (!options?.force && loggedApiKeys.has(dedupeKey)) {
    return;
  }
  loggedApiKeys.add(dedupeKey);

  const header = `[API] ${label} · ${summary}`;
  if (!details || Object.keys(details).length === 0) {
    console.log(header);
    return;
  }

  try {
    console.groupCollapsed(header);
    for (const [key, value] of Object.entries(details)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        console.log(`${key} (${value.length})`, value);
      } else {
        console.log(key, value);
      }
    }
    console.groupEnd();
  } catch {
    console.log(header);
  }
}

/** Reset dedupe state (e.g. after full page navigation in tests) */
export function resetApiLogDedupe(): void {
  loggedApiKeys.clear();
}

export function apiError(
  label: string,
  summary: string,
  details?: ApiLogDetails
): void {
  const header = `[API] ${label} · ${summary}`;
  if (!details || Object.keys(details).length === 0) {
    console.error(header);
    return;
  }

  console.group(header);
  for (const [key, value] of Object.entries(details)) {
    if (value !== undefined) {
      console.log(key, value);
    }
  }
  console.groupEnd();
}

/** Optional deep traces: cart sync, location, cache (NEXT_PUBLIC_DEBUG=true). */
export function devLog(message: string, ...args: unknown[]): void {
  if (!isDeepDebug) return;
  console.log(`[dev] ${message}`, ...args);
}

export function devGroup(
  label: string,
  fn: () => void
): void {
  if (!isDeepDebug) return;
  console.groupCollapsed(`[dev] ${label}`);
  try {
    fn();
  } finally {
    console.groupEnd();
  }
}
