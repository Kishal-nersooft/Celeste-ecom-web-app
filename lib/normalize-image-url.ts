const DRIVE_EXPORT_MODES = new Set(["view", "download"]);

/** Extract a Google Drive file id from common (including malformed) URL shapes. */
export function extractGoogleDriveFileId(url: string): string | null {
  const fromPath = url.match(/\/d\/([a-zA-Z0-9_-]+)(?:\/|$|\?)/);
  if (fromPath) return fromPath[1];

  try {
    const u = new URL(url);
    const host = u.hostname;

    if (
      host === "drive.google.com" ||
      host.endsWith(".drive.google.com") ||
      host === "drive.usercontent.google.com"
    ) {
      const id = u.searchParams.get("id");
      if (id && /^[a-zA-Z0-9_-]+$/.test(id)) return id;

      // Backend sometimes sends /uc?export=<fileId> instead of export=view&id=<fileId>
      const exportParam = u.searchParams.get("export");
      if (
        exportParam &&
        !DRIVE_EXPORT_MODES.has(exportParam) &&
        /^[a-zA-Z0-9_-]+$/.test(exportParam)
      ) {
        return exportParam;
      }
    }

    if (host === "lh3.googleusercontent.com") {
      const dMatch = u.pathname.match(/^\/d\/([a-zA-Z0-9_-]+)/);
      if (dMatch) return dMatch[1];
    }
  } catch {
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return idMatch[1];

    const exportMatch = url.match(/[?&]export=([a-zA-Z0-9_-]+)/);
    if (exportMatch && !DRIVE_EXPORT_MODES.has(exportMatch[1])) {
      return exportMatch[1];
    }
  }

  return null;
}

/** Decode percent-encoding repeatedly so `%2520` becomes a real space. */
function decodePathSegment(segment: string): string {
  let current = segment;
  for (let i = 0; i < 4; i++) {
    try {
      const next = decodeURIComponent(current.replace(/\+/g, "%20"));
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current;
}

/**
 * Collapse double-encoded paths and encode spaces so Azure blob URLs
 * stay valid for both Next.js Image and the blob host.
 */
function normalizeRemotePath(url: string): string {
  try {
    const parsed = new URL(url.replace(/ /g, "%20"));
    parsed.pathname = parsed.pathname
      .split("/")
      .map((segment) => decodePathSegment(segment))
      .join("/");
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Normalize image URLs for Next.js Image, especially malformed Google Drive links.
 */
export function normalizeImageUrl(url: string): string {
  const trimmed = url?.trim();
  if (!trimmed) return url;
  if (trimmed.startsWith("/")) return trimmed;

  const fileId = extractGoogleDriveFileId(trimmed);
  if (fileId) {
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
  }

  return normalizeRemotePath(trimmed);
}
