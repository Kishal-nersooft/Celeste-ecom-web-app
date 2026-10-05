export type OrderFilterTab = "ongoing" | "completed" | "cancelled";

/** Status values accepted by GET /api/v1/orders/ */
export type OrderApiStatus =
  | "pending"
  | "confirmed"
  | "approved"
  | "processing"
  | "packed"
  | "dispatched"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "partially_refunded"
  | "delivery_failed";

/** Query `status` values per orders page tab (API filters server-side). */
export const ORDER_TAB_API_STATUSES: Record<
  OrderFilterTab,
  readonly OrderApiStatus[]
> = {
  ongoing: [
    "pending",
    "confirmed",
    "approved",
    "processing",
    "packed",
    "dispatched",
    "shipped",
  ],
  completed: ["delivered"],
  cancelled: ["cancelled"],
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
  return ["pending", "confirmed", "approved", "processing", "packed"].includes(
    normalized,
  );
}

/** Badge color family for a customer-facing order status. */
export type OrderStatusTone =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "on_the_way"
  | "completed"
  | "cancelled"
  | "failed";

/**
 * Collection is the only mode that is not a delivery.
 * `far_delivery` is still a delivery to the customer.
 */
export function isPickupFulfillment(fulfillmentMode: unknown): boolean {
  return String(fulfillmentMode ?? "").trim().toLowerCase() === "pickup";
}

/**
 * Customer label for an order. Warehouse statuses `approved`, `processing`,
 * and `dispatched` collapse to "Preparing..." on a delivery. On a pickup,
 * `processing` means the order is packed and waiting, so it reads "Ready to collect".
 * An unrecognised status falls back to "Preparing..." so the badge is never blank.
 */
export function getCustomerOrderStatus(
  status: unknown,
  fulfillmentMode?: unknown,
): { label: string; tone: OrderStatusTone } {
  const normalized = normalizeOrderStatus(status);
  const isPickup = isPickupFulfillment(fulfillmentMode);

  switch (normalized) {
    case "PENDING":
    case "PAYMENT_PENDING":
      return { label: "Pending", tone: "pending" };
    case "CONFIRMED":
    case "PAID":
      return { label: "Confirmed", tone: "confirmed" };
    case "APPROVED":
    case "DISPATCHED":
      return { label: "Preparing...", tone: "preparing" };
    case "PROCESSING":
    case "PREPARING":
    case "IN_PROGRESS":
    case "PACKED":
      return isPickup
        ? { label: "Ready to collect", tone: "ready" }
        : { label: "Preparing...", tone: "preparing" };
    case "READY":
      return { label: "Ready", tone: "ready" };
    case "SHIPPED":
    case "OUT_FOR_DELIVERY":
      return { label: "On the way", tone: "on_the_way" };
    case "DELIVERED":
    case "COMPLETED":
    case "COMPLETE":
      return isPickup
        ? { label: "Collected", tone: "completed" }
        : { label: "Delivered", tone: "completed" };
    case "CANCELLED":
    case "CANCELED":
    case "VOID":
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return { label: "Cancelled", tone: "cancelled" };
    case "DELIVERY_FAILED":
      return { label: "Delivery failed", tone: "failed" };
    default:
      return { label: "Preparing...", tone: "preparing" };
  }
}
