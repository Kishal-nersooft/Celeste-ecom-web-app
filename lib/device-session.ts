/** Parse browser + OS from user agent for login activity display. */
export function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = "Browser";
  let os = "Unknown device";

  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  if (/iPhone|iPad|iPod/i.test(ua)) os = /iPad/i.test(ua) ? "iPad" : "Apple iPhone";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Linux/i.test(ua)) os = "Linux";

  return { browser, os };
}

/** UI-only location hint from device timezone — no network or backend. */
export function getApproximateLocationLabel(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const known: Record<string, string> = {
      "Asia/Colombo": "Colombo, Sri Lanka",
      "Asia/Kolkata": "Mumbai, India",
      "Asia/Dubai": "Dubai, UAE",
      "Europe/London": "London, United Kingdom",
      "America/New_York": "New York, United States",
    };
    if (known[tz]) return known[tz];
    const part = tz.split("/").pop()?.replace(/_/g, " ");
    return part ? `${part} (approx.)` : "";
  } catch {
    return "";
  }
}

export interface LoginSessionRecord {
  id: string;
  label: string;
  subtitle: string;
  platform: string;
  isCurrent: boolean;
  lastActive: string;
}

const SESSIONS_STORAGE_KEY = "celeste-login-sessions";
const CURRENT_SESSION_ID_KEY = "celeste-current-session-id";

function getOrCreateCurrentSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = sessionStorage.getItem(CURRENT_SESSION_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `session-${Date.now()}`;
    sessionStorage.setItem(CURRENT_SESSION_ID_KEY, id);
  }
  return id;
}

export function recordCurrentLoginSession(): LoginSessionRecord {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const { browser, os } = parseUserAgent(ua);
  const id = getOrCreateCurrentSessionId();
  const now = new Date().toISOString();

  const current: LoginSessionRecord = {
    id,
    label: `${browser} on ${os}`,
    subtitle: getApproximateLocationLabel(),
    platform: "Celeste Web",
    isCurrent: true,
    lastActive: now,
  };

  if (typeof window === "undefined") return current;

  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    const previous: LoginSessionRecord[] = raw ? JSON.parse(raw) : [];
    const others = previous
      .filter((s) => s.id !== id)
      .map((s) => ({ ...s, isCurrent: false }));
    const updated = [{ ...current, lastActive: now }, ...others].slice(0, 8);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify([current]));
  }

  return current;
}

export function getStoredLoginSessions(): LoginSessionRecord[] {
  if (typeof window === "undefined") return [];
  const currentId = getOrCreateCurrentSessionId();
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const sessions: LoginSessionRecord[] = JSON.parse(raw);
    return sessions.map((s) => ({
      ...s,
      isCurrent: s.id === currentId,
    }));
  } catch {
    return [];
  }
}

/** Static row for login-activity UI until backend provides real session history. */
export const DESIGN_DEMO_LOGIN_SESSION: LoginSessionRecord = {
  id: "design-demo-mobile",
  label: "Apple iPhone",
  subtitle: "Colombo, Sri Lanka",
  platform: "Celeste App",
  isCurrent: false,
  lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
};

export function clearOtherLoginSessions(): void {
  if (typeof window === "undefined") return;
  const currentId = getOrCreateCurrentSessionId();
  const sessions = getStoredLoginSessions();
  const current = sessions.find((s) => s.id === currentId);
  if (current) {
    localStorage.setItem(
      SESSIONS_STORAGE_KEY,
      JSON.stringify([{ ...current, isCurrent: true, lastActive: new Date().toISOString() }])
    );
  }
}
