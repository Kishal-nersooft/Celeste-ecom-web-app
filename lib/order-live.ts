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

export interface OrderLiveSnapshot {
  version?: number;
  awaitingCustomerChoice?: boolean;
  heldItemCount?: number;
  status?: string;
  totalAmount?: number;
  settlementStatus?: string;
  /** Ready-state payload. Items and rider for the status after pending live here. */
  processing?: Record<string, unknown>;
}

function readSnapshot(data: Record<string, unknown> | undefined): OrderLiveSnapshot {
  if (!data) return {};
  const version = readVersion(data.version);
  const flag = data.awaiting_customer_choice ?? data.awaitingCustomerChoice;
  const count = readVersion(data.held_item_count ?? data.heldItemCount);
  const status = data.status;
  const total = readMoney(data.total_amount ?? data.totalAmount);
  const settlement = data.settlement_status ?? data.settlementStatus;
  const processing =
    data.processing && typeof data.processing === "object" && !Array.isArray(data.processing)
      ? (data.processing as Record<string, unknown>)
      : undefined;
  return {
    ...(version != null ? { version } : {}),
    ...(typeof flag === "boolean" ? { awaitingCustomerChoice: flag } : {}),
    ...(count != null ? { heldItemCount: count } : {}),
    ...(typeof status === "string" && status.trim() ? { status: status.trim() } : {}),
    ...(total != null ? { totalAmount: total } : {}),
    ...(typeof settlement === "string" && settlement.trim()
      ? { settlementStatus: settlement.trim().toLowerCase() }
      : {}),
    ...(processing ? { processing } : {}),
  };
}

function readVersion(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readMoney(value: unknown): number | undefined {
  return readVersion(value);
}

/**
 * Watch `orders_live/{orderId}`.
 * The first snapshot is the document as it is now, so it does not count as a change.
 * A later write whose `version` is lower than one already seen is ignored.
 * If the security rule rejects the read, fall back to a 10s poll.
 */
export function subscribeOrderLive(
  orderId: string,
  onChange: (snapshot: OrderLiveSnapshot) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  if (firestoreLiveBlocked) return pollOrder(() => onChange({}));

  let lastFingerprint: string | null = null;
  let lastVersion: number | null = null;
  let pollStop: (() => void) | null = null;
  let stopped = false;

  const unsubscribe = onSnapshot(
    doc(db, "orders_live", orderId),
    (snap) => {
      const data = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
      const snapshot = readSnapshot(data);
      const next = JSON.stringify(normalizeLiveValue(data ?? null));
      if (lastFingerprint === null) {
        lastFingerprint = next;
        if (snapshot.version != null) lastVersion = snapshot.version;
        return;
      }
      if (snapshot.version != null && lastVersion != null && snapshot.version < lastVersion) {
        return;
      }
      if (next === lastFingerprint) return;
      lastFingerprint = next;
      if (snapshot.version != null) lastVersion = snapshot.version;
      onChange(snapshot);
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
        if (!stopped && !pollStop) pollStop = pollOrder(() => onChange({}));
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
