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

/**
 * Ready-state payload. After `pending`, the backend puts the packed order on `processing`:
 * items, rider, and driver live there, and that state is what the customer should see as Ready.
 */
export function readProcessingRecord(
  raw: Record<string, unknown>,
): Record<string, unknown> | null {
  const value = raw.processing;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function processingHasReadyPayload(processing: Record<string, unknown>): boolean {
  if (Array.isArray(processing.items) && processing.items.length > 0) return true;
  if (processing.rider != null || processing.driver != null) return true;
  if (processing.driver_info != null || processing.assigned_driver != null) return true;
  const nested = processing.status ?? processing.order_status ?? processing.orderStatus;
  if (nested == null) return false;
  const normalized = normalizeOrderStatus(nested);
  return normalized !== "" && normalized !== "PENDING" && normalized !== "PAYMENT_PENDING";
}

const BEFORE_READY = new Set([
  "",
  "PENDING",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "PAID",
  "APPROVED",
  "PREPARING",
  "IN_PROGRESS",
  "PACKED",
  "DISPATCHED",
  "PROCESSING",
]);

/**
 * Copy the ready-state details off `processing` onto the order the UI reads.
 * Items, rider, and driver on that field replace the top-level copies.
 * A pending order stays pending. After pending, a filled `processing` field is the Ready status.
 */
export function withProcessingField(raw: Record<string, unknown>): Record<string, unknown> {
  const processing = readProcessingRecord(raw);
  if (!processing || !processingHasReadyPayload(processing)) return raw;

  const items = Array.isArray(processing.items) ? processing.items : raw.items;
  const rider = raw.rider ?? processing.rider;
  const driver =
    raw.driver ??
    processing.driver ??
    processing.driver_info ??
    processing.assigned_driver ??
    raw.driver_info ??
    raw.assigned_driver;

  const rawTop =
    raw.status ??
    raw.order_status ??
    raw.orderStatus ??
    raw.fulfillment_status ??
    raw.fulfillmentStatus;
  const top = rawTop == null || rawTop === "" ? "" : normalizeOrderStatus(rawTop);
  const nested = processing.status ?? processing.order_status ?? processing.orderStatus;
  const nestedNorm = nested == null ? "" : normalizeOrderStatus(nested);
  const nestedIsReady =
    nestedNorm !== "" && nestedNorm !== "PENDING" && nestedNorm !== "PAYMENT_PENDING";

  let status = raw.status;
  if (top === "PENDING" || top === "PAYMENT_PENDING") {
    if (nestedIsReady) status = nested;
  } else if (top === "") {
    status = nestedIsReady ? nested : "processing";
  } else if (BEFORE_READY.has(top)) {
    status = nestedIsReady ? nested : "processing";
  }

  return {
    ...raw,
    ...(items !== undefined ? { items } : {}),
    ...(rider ? { rider } : {}),
    ...(driver ? { driver } : {}),
    ...(status != null ? { status } : {}),
  };
}

export function getOrderStatusFromPayload(order: Record<string, unknown>): string {
  const view = withProcessingField(order);
  const raw =
    view.status ??
    view.order_status ??
    view.orderStatus ??
    view.fulfillment_status ??
    view.fulfillmentStatus;
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
 * Customer label for an order. After pending, `processing` is the ready state:
 * "Ready" on a delivery and "Ready to collect" on a pickup. `approved` and
 * `dispatched` stay "Preparing..." until that field is set. An unrecognised
 * status falls back to "Preparing..." so the badge is never blank.
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
      return isPickup
        ? { label: "Ready to collect", tone: "ready" }
        : { label: "Ready", tone: "ready" };
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
