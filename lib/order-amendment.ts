import { readOrderHold } from "@/lib/order-hold";
import { getOrderStatusFromPayload, withProcessingField } from "@/lib/order-status";
import type { DriverInfo, OrderItem, OrderItemChange, OrderReplacement, RiderInfo } from "@/store";

export type OrderApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export interface OrderAmendmentFields {
  approvalStatus?: OrderApprovalStatus;
  /** UTC ISO instant from `approval_deadline_at`. The countdown targets this, not a local 120s. */
  approvalDeadlineAt?: string;
  approvalAmount?: number;
  originalTotalAmount?: number;
  cancelReasonCode?: string;
}

const APPROVAL_STATUSES = new Set<OrderApprovalStatus>([
  "pending",
  "approved",
  "rejected",
  "expired",
]);

export function parseMoney(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function unwrapOrderPayload(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const root = data as Record<string, unknown>;

  const fromObject = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (record.order && typeof record.order === "object" && !Array.isArray(record.order)) {
      return record.order as Record<string, unknown>;
    }
    if ("id" in record || "approval_status" in record || "status" in record) {
      return record;
    }
    return null;
  };

  return fromObject(root.data) ?? fromObject(root.order) ?? fromObject(root);
}

export function readOrderAmendment(raw: Record<string, unknown>): OrderAmendmentFields {
  const statusRaw = raw.approval_status ?? raw.approvalStatus;
  const status = typeof statusRaw === "string" ? statusRaw.trim().toLowerCase() : "";
  const approvalStatus = APPROVAL_STATUSES.has(status as OrderApprovalStatus)
    ? (status as OrderApprovalStatus)
    : undefined;

  const deadlineRaw = raw.approval_deadline_at ?? raw.approvalDeadlineAt;
  const reasonRaw = raw.cancel_reason_code ?? raw.cancelReasonCode;

  return {
    approvalStatus,
    approvalDeadlineAt:
      typeof deadlineRaw === "string" && deadlineRaw.trim() ? deadlineRaw.trim() : undefined,
    approvalAmount: parseMoney(raw.approval_amount ?? raw.approvalAmount),
    originalTotalAmount: parseMoney(raw.original_total_amount ?? raw.originalTotalAmount),
    cancelReasonCode:
      typeof reasonRaw === "string" && reasonRaw.trim() ? reasonRaw.trim() : undefined,
  };
}

const BEFORE_QUANTITY_KEYS = [
  "original_quantity",
  "originalQuantity",
  "previous_quantity",
  "previousQuantity",
  "quantity_before",
  "quantityBefore",
  "old_quantity",
  "oldQuantity",
  "initial_quantity",
  "initialQuantity",
  "requested_quantity",
  "requestedQuantity",
  "customer_quantity",
  "customerQuantity",
];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseQuantity(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function firstQuantity(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const quantity = parseQuantity(record[key]);
    if (quantity !== undefined) return quantity;
  }
  return undefined;
}

function textField(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readLineQuantities(record: Record<string, unknown>): {
  quantity: number;
  originalQuantity?: number;
} {
  const nested =
    asRecord(record.amendment) ??
    asRecord(record.change) ??
    asRecord(record.quantity_change);
  const quantity =
    parseQuantity(
      nested?.new_quantity ??
        nested?.newQuantity ??
        nested?.quantity ??
        record.quantity,
    ) ?? 0;
  const originalQuantity =
    (nested ? firstQuantity(nested, BEFORE_QUANTITY_KEYS) : undefined) ??
    firstQuantity(record, BEFORE_QUANTITY_KEYS);
  return { quantity, originalQuantity };
}

export function describeQuantityChange(previous: number, quantity: number): string {
  if (previous === 0 && quantity > 0) {
    return `Added to the order. Quantity ${quantity}.`;
  }
  if (quantity === 0 && previous > 0) {
    return `Removed from the order. It was ${previous}.`;
  }
  const delta = quantity - previous;
  const how = delta > 0 ? `${delta} more` : `${Math.abs(delta)} fewer`;
  return `Quantity changed from ${previous} to ${quantity} (${how}).`;
}

export function quantityChangeLabel(previous: number, quantity: number): string | null {
  if (previous === quantity) return null;
  if (previous === 0 && quantity > 0) return `Added · qty ${quantity}`;
  if (quantity === 0 && previous > 0) return `Removed · was ${previous}`;
  const delta = quantity - previous;
  const how = delta > 0 ? `${delta} more` : `${Math.abs(delta)} fewer`;
  return `${previous} → ${quantity} · ${how}`;
}

const SUPPLIED_QUANTITY_KEYS = [
  "supplied_quantity",
  "suppliedQuantity",
  "supplying_quantity",
  "supplyingQuantity",
  "fulfilled_quantity",
  "fulfilledQuantity",
  "quantity_fulfilled",
  "quantity_supplied",
];

function productImage(record: Record<string, unknown>): string | undefined {
  return (
    (Array.isArray(record.image_urls) && typeof record.image_urls[0] === "string"
      ? record.image_urls[0]
      : undefined) ??
    textField(record, ["image_url", "imageUrl", "image", "primary_image"])
  );
}

function productName(record: Record<string, unknown>, product: Record<string, unknown>, productId: number): string {
  return (
    textField(product, ["name", "title", "product_name"]) ??
    textField(record, ["name", "product_name", "title"]) ??
    (productId > 0 ? `Product ${productId}` : "Product")
  );
}

function recordKey(record: Record<string, unknown>): string | undefined {
  const id = record.id ?? record.item_id ?? record.order_item_id;
  if (id == null || id === "") return undefined;
  return String(id);
}

function parentKey(record: Record<string, unknown>): string | undefined {
  const parent =
    record.replaces_item_id ??
    record.replaced_item_id ??
    record.replaces_order_item_id ??
    record.original_item_id ??
    record.parent_item_id;
  if (parent == null || parent === "" || parent === 0 || parent === "0") return undefined;
  return String(parent);
}

function isSubstituteRow(record: Record<string, unknown>): boolean {
  if (parentKey(record)) return true;
  const role = String(record.role ?? record.item_role ?? record.line_type ?? record.kind ?? "").toLowerCase();
  if (["substitute", "substitution", "replacement"].includes(role)) return true;
  return record.is_substitute === true || record.is_substitution === true || record.is_replacement === true;
}

function readReplacement(record: Record<string, unknown>): OrderReplacement | undefined {
  const list = record.replacements ?? record.substitutes ?? record.substituted_items;
  const nested =
    asRecord(record.replacement) ??
    asRecord(record.substitute) ??
    asRecord(record.substituted_item) ??
    asRecord(record.substituted_product) ??
    asRecord(record.replacement_item) ??
    asRecord(record.replacement_product) ??
    (Array.isArray(list) ? asRecord(list[0]) : null);
  if (!nested) return undefined;

  const product = asRecord(nested.product) ?? nested;
  const productId = Number(nested.product_id ?? nested.productId ?? product.id ?? 0);
  const name = productName(nested, product, Number.isFinite(productId) ? productId : 0);
  const quantity = parseQuantity(nested.quantity ?? nested.replaced_quantity ?? product.quantity) ?? 1;
  const unitPrice =
    parseMoney(nested.unit_price ?? nested.price ?? product.unit_price ?? product.price ?? product.final_price) ?? 0;

  return {
    name,
    imageUrl: productImage(product) ?? productImage(nested),
    quantity,
    unitPrice,
    totalPrice: parseMoney(nested.total_price ?? nested.totalPrice ?? product.total_price ?? product.totalPrice),
    productId: Number.isFinite(productId) && productId > 0 ? productId : undefined,
  };
}

function isUnavailableLine(record: Record<string, unknown>, quantity: number, supplied: number, hasReplacement: boolean): boolean {
  if (record.is_replaced === true || record.isReplaced === true || isSubstituteRow(record)) return false;
  if (record.is_out_of_stock === true || record.isOutOfStock === true) return true;
  for (const key of ["removed", "is_removed", "unavailable", "is_unavailable", "deleted", "is_deleted"]) {
    if (record[key] === true) return true;
  }
  if (record.is_available === false || record.available === false || record.in_stock === false) return true;
  const status = String(
    record.status ?? record.item_status ?? record.line_status ?? record.fulfillment_status ?? record.availability ?? "",
  )
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (["removed", "unavailable", "deleted", "cancelled", "canceled", "out_of_stock", "void", "refunded"].includes(status)) {
    return true;
  }
  return !hasReplacement && (quantity <= 0 || supplied <= 0);
}

function readAgreementNote(record: Record<string, unknown>): string | undefined {
  const note = textField(record, [
    "agreement_note",
    "substitution_note",
    "replacement_note",
    "agreed_note",
  ]);
  if (note) return note;
  const method = (
    textField(record, ["agreement_method", "agreed_via", "substitution_method", "contact_method"]) ?? ""
  ).toLowerCase();
  if (method.includes("phone") || record.agreed_by_phone === true) {
    return "Agreed with you by phone";
  }
  return undefined;
}

function toReplacement(item: OrderItem): OrderReplacement {
  return {
    name: item.name,
    imageUrl: item.imageUrl,
    quantity: item.quantity || item.orderedQuantity || 1,
    unitPrice: item.price,
    totalPrice: item.totalPrice,
    productId: item.productId > 0 ? item.productId : undefined,
    lineId: item.lineId,
  };
}

function flagTrue(record: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => record[key] === true);
}

function idField(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (value == null || value === "" || value === 0 || value === "0") continue;
    return String(value);
  }
  return undefined;
}

export function mapOrderItems(rawItems: unknown): OrderItem[] {
  if (!Array.isArray(rawItems)) return [];

  const parsed = rawItems.map((entry) => {
    const record = asRecord(entry) ?? {};
    const product = asRecord(record.product) ?? {};
    const productId = Number(record.product_id ?? record.productId ?? product.id ?? 0);
    const safeProductId = Number.isFinite(productId) ? productId : 0;
    const { quantity, originalQuantity } = readLineQuantities(record);
    const replacement = readReplacement(record);
    const orderedQuantity = originalQuantity ?? quantity;
    const explicitSupplied = firstQuantity(record, SUPPLIED_QUANTITY_KEYS);
    let suppliedQuantity = explicitSupplied;
    if (suppliedQuantity == null && originalQuantity != null && originalQuantity !== quantity) {
      suppliedQuantity = quantity;
    }
    if (suppliedQuantity == null && replacement) {
      suppliedQuantity = replacement.quantity < orderedQuantity ? orderedQuantity - replacement.quantity : 0;
    }
    if (suppliedQuantity == null) suppliedQuantity = orderedQuantity;

    const holdRaw = (textField(record, ["hold_status", "holdStatus"]) ?? "").toLowerCase();
    const holdStatus =
      holdRaw === "awaiting_customer" || holdRaw === "resolved" ? holdRaw : undefined;
    const heldQuantity = parseQuantity(record.held_quantity ?? record.heldQuantity);
    const heldAt = textField(record, ["held_at", "heldAt"]);
    const awaitingChoice = holdStatus === "awaiting_customer";
    const isReplaced = flagTrue(record, ["is_replaced", "isReplaced"]);
    const isReplacement = isSubstituteRow(record);
    const isRepriced = flagTrue(record, ["is_repriced", "isRepriced"]);
    const isOutOfStock = flagTrue(record, ["is_out_of_stock", "isOutOfStock"]);
    const replacedByItemId = idField(record, ["replaced_by_item_id", "replacedByItemId"]);
    const replacesProductRaw = parseQuantity(record.replaces_product_id ?? record.replacesProductId);
    const replacesProductId =
      replacesProductRaw != null && replacesProductRaw > 0 ? replacesProductRaw : undefined;
    if (isReplaced) suppliedQuantity = 0;

    const item: OrderItem = {
      productId: safeProductId,
      name: productName(record, product, safeProductId),
      price: parseMoney(record.unit_price ?? record.price) ?? 0,
      quantity,
      originalQuantity,
      orderedQuantity,
      suppliedQuantity,
      totalPrice: parseMoney(record.total_price ?? record.totalPrice),
      imageUrl: productImage(product) ?? productImage(record),
      replacement,
      agreementNote: readAgreementNote(record),
      isReplaced,
      isReplacement,
      isRepriced,
      isOutOfStock,
      replacedByItemId,
      replacesProductId,
      originalUnitPrice: parseMoney(record.original_unit_price ?? record.originalUnitPrice),
      unitPriceDifference: parseMoney(record.unit_price_difference ?? record.unitPriceDifference),
      unavailable: awaitingChoice
        ? false
        : isUnavailableLine(record, quantity, suppliedQuantity, Boolean(replacement)),
      lineId: recordKey(record),
      holdStatus,
      heldQuantity: heldQuantity != null ? heldQuantity : undefined,
      heldAt,
    };

    return {
      item,
      key: recordKey(record),
      parent: parentKey(record),
      isReplaced,
      isReplacement,
      replacedByItemId,
      replacesProductId,
    };
  });

  const byKey = new Map<string, (typeof parsed)[number]>();
  for (const row of parsed) {
    if (row.key) byKey.set(row.key, row);
  }

  const consumed = new Set<(typeof parsed)[number]>();

  const foldReplacement = (host: (typeof parsed)[number], child: (typeof parsed)[number]) => {
    if (host === child || host.isReplacement) return;
    if (host.item.holdStatus === "awaiting_customer") return;
    if (child.item.holdStatus === "awaiting_customer") return;
    const existingLineId = host.item.replacement?.lineId;
    if (existingLineId && existingLineId !== child.item.lineId) return;
    host.item.replacement = toReplacement(child.item);
    host.item.agreementNote = host.item.agreementNote ?? child.item.agreementNote;
    if (!host.item.isOutOfStock) host.item.unavailable = false;
    consumed.add(child);
  };

  for (const row of parsed) {
    if (!row.replacedByItemId) continue;
    const child = byKey.get(row.replacedByItemId);
    if (!child) continue;
    foldReplacement(row, child);
  }

  for (const row of parsed) {
    if (consumed.has(row) || !row.isReplacement || row.replacesProductId == null) continue;
    const candidates = parsed.filter(
      (host) =>
        host !== row &&
        !consumed.has(host) &&
        !host.isReplacement &&
        host.item.productId === row.replacesProductId &&
        host.item.holdStatus !== "awaiting_customer",
    );
    const open = candidates.filter((host) => !host.item.replacement?.lineId);
    const host =
      candidates.find((candidate) => candidate.replacedByItemId === row.key) ??
      open.find((candidate) => candidate.isReplaced) ??
      (open.length === 1 ? open[0] : undefined);
    if (host) foldReplacement(host, row);
  }

  for (const row of parsed) {
    if (consumed.has(row) || !row.isReplacement || !row.parent) continue;
    const host = byKey.get(row.parent);
    if (!host || host.isReplacement) continue;
    foldReplacement(host, row);
  }

  return parsed.filter((row) => !consumed.has(row)).map((row) => row.item);
}

export function readOrderItemChanges(raw: Record<string, unknown>): OrderItemChange[] {
  const changes: OrderItemChange[] = [];
  const seenProductIds = new Set<number>();

  mapOrderItems(raw.items).forEach((item, index) => {
    if (item.replacement || item.isReplaced || item.isReplacement) return;
    if (item.originalQuantity == null || item.originalQuantity === item.quantity) return;
    seenProductIds.add(item.productId);
    changes.push({
      key: `${item.productId}-${index}`,
      name: item.name,
      imageUrl: item.imageUrl,
      previousQuantity: item.originalQuantity,
      quantity: item.quantity,
      summary: describeQuantityChange(item.originalQuantity, item.quantity),
    });
  });

  const pushChange = (item: OrderItem, index: number, previous: number, quantity: number) => {
    if (previous === quantity) return;
    if (item.productId > 0 && seenProductIds.has(item.productId)) return;
    seenProductIds.add(item.productId);
    changes.push({
      key: `extra-${item.productId}-${index}-${changes.length}`,
      name: item.name,
      imageUrl: item.imageUrl,
      previousQuantity: previous,
      quantity,
      summary: describeQuantityChange(previous, quantity),
    });
  };

  for (const list of [raw.removed_items, raw.deleted_items, raw.removedItems]) {
    if (!Array.isArray(list)) continue;
    mapOrderItems(list).forEach((item, index) => {
      const previous = item.originalQuantity ?? item.quantity;
      if (previous <= 0) return;
      pushChange(item, index, previous, 0);
    });
  }

  if (changes.length === 0) {
    for (const list of [raw.amendment_items, raw.item_changes, raw.amended_items, raw.line_changes]) {
      if (!Array.isArray(list)) continue;
      mapOrderItems(list).forEach((item, index) => {
        if (item.originalQuantity == null) return;
        pushChange(item, index, item.originalQuantity, item.quantity);
      });
    }
  }

  return changes;
}

/** List payloads sometimes omit amendment fields that exist on GET /orders/{id}. */
export function payloadOmitsAmendment(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return true;
  const record = raw as Record<string, unknown>;
  const hasApproval = "approval_status" in record || "approvalStatus" in record;
  const hasReason = "cancel_reason_code" in record || "cancelReasonCode" in record;
  return !hasApproval && !hasReason;
}

function readRiderFromPayload(raw: Record<string, unknown>): RiderInfo | undefined {
  const nested = asRecord(raw.rider);
  const source = nested ?? raw;
  const name = textField(source, nested ? ["name"] : ["rider_name", "name"]);
  const phone = textField(source, nested ? ["phone", "phone_number"] : ["rider_phone", "phone", "phone_number"]);
  const vehicle_type = nested ? textField(nested, ["vehicle_type"]) : undefined;
  const vehicle_registration_number = nested
    ? textField(nested, ["vehicle_registration_number"])
    : undefined;
  if (!name && !phone && !vehicle_type && !vehicle_registration_number) return undefined;
  return { name, phone, vehicle_type, vehicle_registration_number };
}

function readDriverFromPayload(raw: Record<string, unknown>): DriverInfo | undefined {
  const nested =
    asRecord(raw.driver) ??
    asRecord(raw.driver_info) ??
    asRecord(raw.assigned_driver) ??
    asRecord(raw.delivery_driver);
  if (!nested) return undefined;
  const name = textField(nested, ["name", "driver_name", "full_name"]);
  const phone = textField(nested, ["phone", "phone_number", "mobile", "contact_number"]);
  const vehicle = textField(nested, ["vehicle_number", "vehicle", "vehicle_no"]);
  if (!name && !phone && !vehicle) return undefined;
  return { name, phone, vehicle_number: vehicle, vehicle };
}

export function orderPatchFromPayload(raw: Record<string, unknown>) {
  const view = withProcessingField(raw);
  const amendment = readOrderAmendment(view);
  const totalAmount = parseMoney(view.total_amount ?? view.totalAmount);
  const hasStatus =
    view.status != null ||
    view.order_status != null ||
    view.orderStatus != null ||
    view.fulfillment_status != null ||
    view.fulfillmentStatus != null;

  const hasItems = Array.isArray(view.items);
  const items = hasItems ? mapOrderItems(view.items) : undefined;
  const rider = readRiderFromPayload(view);
  const driver = readDriverFromPayload(view);
  const hold = readOrderHold(view, items);
  const liveVersion = parseMoney(view.version);
  const settlementRaw = view.settlement_status ?? view.settlementStatus;
  const settlementStatus =
    typeof settlementRaw === "string" && settlementRaw.trim()
      ? settlementRaw.trim().toLowerCase()
      : undefined;

  return {
    ...amendment,
    ...hold,
    ...(liveVersion != null ? { liveVersion } : {}),
    ...(settlementStatus ? { settlementStatus } : {}),
    ...(hasStatus ? { status: getOrderStatusFromPayload(view) } : {}),
    ...(totalAmount !== undefined ? { totalAmount, total: totalAmount } : {}),
    ...(items ? { items, itemChanges: readOrderItemChanges(raw) } : {}),
    ...(rider ? { rider } : {}),
    ...(driver ? { driver } : {}),
  };
}

export function formatApprovalRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function amendmentResultCopy(order: {
  approvalStatus?: string;
  cancelReasonCode?: string;
}): { title: string; detail: string } | null {
  if (order.approvalStatus === "pending") return null;

  const reason = (order.cancelReasonCode || "").toLowerCase();
  const approval = (order.approvalStatus || "").toLowerCase();

  if (reason === "amendment_rejected" || approval === "rejected") {
    return {
      title: "You declined the change",
      detail: "Your payment has been fully refunded.",
    };
  }

  if (reason === "amendment_not_approved" || approval === "expired") {
    return {
      title: "The change wasn't approved in time",
      detail: "Your payment has been fully refunded.",
    };
  }

  return null;
}
