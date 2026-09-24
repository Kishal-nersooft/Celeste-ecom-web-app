import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** How often to re-read an order when Firestore denies the live document. */
export const ORDER_LIVE_POLL_MS = 10_000;

let firestoreLiveBlocked = false;

function normalizeLiveValue(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (Array.isArray(value)) return value.map(normalizeLiveValue);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = normalizeLiveValue(record[key]);
    }
    return sorted;
  }
  return String(value);
}

function pollOrder(onChange: () => void): () => void {
  const id = window.setInterval(onChange, ORDER_LIVE_POLL_MS);
  return () => window.clearInterval(id);
}

/**
 * Watch `orders_live/{orderId}`. The first snapshot is the current document and
 * does not count as a change. Later writes call `onChange`.
 * If the security rule rejects the read, fall back to a 10s poll.
 */
export function subscribeOrderLive(orderId: string, onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (firestoreLiveBlocked) return pollOrder(onChange);

  let lastFingerprint: string | null = null;
  let pollStop: (() => void) | null = null;
  let stopped = false;

  const unsubscribe = onSnapshot(
    doc(db, "orders_live", orderId),
    (snap) => {
      const next = JSON.stringify(normalizeLiveValue(snap.exists() ? snap.data() : null));
      if (lastFingerprint === null) {
        lastFingerprint = next;
        return;
      }
      if (next === lastFingerprint) return;
      lastFingerprint = next;
      onChange();
    },
    (error) => {
      const code = "code" in error ? String(error.code) : "";
      if (code === "permission-denied" || code === "unauthenticated") {
        if (!firestoreLiveBlocked) {
          console.warn(
            "orders_live is not readable from the site. Refreshing active orders every 10s instead.",
          );
        }
        firestoreLiveBlocked = true;
        if (!stopped && !pollStop) pollStop = pollOrder(onChange);
        return;
      }
      console.error(`orders_live listener failed for ${orderId}`, error);
    },
  );

  return () => {
    stopped = true;
    unsubscribe();
    pollStop?.();
  };
}
