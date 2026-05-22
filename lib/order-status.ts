export type OrderFilterTab = "ongoing" | "completed" | "cancelled";

/** Status values accepted by GET /api/v1/orders/ */
export type OrderApiStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

/** Query `status` values per orders page tab (API filters server-side). */
export const ORDER_TAB_API_STATUSES: Record<
  OrderFilterTab,
  readonly OrderApiStatus[]
> = {
  ongoing: ["pending", "confirmed", "processing", "packed", "shipped"],
  completed: ["delivered"],
  cancelled: ["cancelled", "refunded"],
};

export function getOrderStatusesForTab(tab: OrderFilterTab): OrderApiStatus[] {
  return [...ORDER_TAB_API_STATUSES[tab]];
}

/** Read status from API shapes: string, enum object, or nested field. */
export function extractOrderStatus(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const key of ["code", "value", "status", "name", "label", "state"]) {
      const v = o[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return String(raw).trim();
}

/** Canonical uppercase status for UI labels. */
export function normalizeOrderStatus(raw: unknown): string {
  const s = extractOrderStatus(raw);
  if (!s) return "PENDING";
  return s.toUpperCase().replace(/[\s-]+/g, "_");
}

export function getOrderStatusFromPayload(order: Record<string, unknown>): string {
  const raw =
    order.status ??
    order.order_status ??
    order.orderStatus ??
    order.fulfillment_status ??
    order.fulfillmentStatus;
  return normalizeOrderStatus(raw);
}

export function canCancelOrderAsCustomer(status: unknown): boolean {
  const normalized = normalizeOrderStatus(status).toLowerCase();
  return ["pending", "confirmed", "processing", "packed"].includes(normalized);
}
