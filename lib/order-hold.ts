import type { OrderItem } from "@/store";

export interface SubstituteSuggestion {
  productId: number;
  name: string;
  unitPrice: number;
  lineTotal: number;
  difference: number;
  paymentRequired: boolean;
  availableQuantity: number;
  imageUrl?: string;
}

export interface ItemSubstitutes {
  storeId: number;
  heldQuantity: number;
  availableQuantity: number;
  orderedQuantity: number;
  heldValue: number;
  /** Sanity ceiling from the server. Stock is the cap that actually applies. */
  maxSubstituteQuantity?: number;
  heldAt?: string;
  waitingSeconds?: number;
  decisionWindowSeconds?: number;
  timedOut: boolean;
  suggestions: SubstituteSuggestion[];
}

export interface ItemChoiceResult {
  applied: boolean;
  paymentRequired: boolean;
  amountDifference?: number;
  outstandingAmount?: number;
  totalAmount?: number;
  paymentAction?: string;
}

export interface PaymentSession {
  paymentReference: string;
  sessionId?: string;
  threeDsHtml?: string;
  status?: string;
}

export function readOrderHold(
  raw: Record<string, unknown>,
  items?: OrderItem[],
): { awaitingCustomerChoice: boolean; heldItemCount: number } {
  const derived = (items ?? []).filter((item) => item.holdStatus === "awaiting_customer").length;
  const flag = raw.awaiting_customer_choice ?? raw.awaitingCustomerChoice;
  const countRaw = raw.held_item_count ?? raw.heldItemCount;
  const reported = parseApiNumber(countRaw);
  const heldItemCount = Math.max(reported ?? 0, derived);
  const awaitingCustomerChoice = flag === true || heldItemCount > 0;
  return { awaitingCustomerChoice, heldItemCount };
}

export function heldLineCopy(quantity: number, heldQuantity: number): string {
  const held = Math.max(0, Math.floor(heldQuantity));
  if (held <= 0) return "Needs your choice";
  const coming = Math.max(0, Math.floor(quantity) - held);
  const choice =
    held === 1 ? "1 needs your choice" : `${held} need your choice`;
  if (coming <= 0) return choice;
  const arriving = coming === 1 ? "1 is coming" : `${coming} are coming`;
  return `${arriving} · ${choice}`;
}

export function choiceWindowCopy(timedOut: boolean, windowSeconds?: number): string {
  if (timedOut) return "The shop may call you about this. You can still choose.";
  const label = formatDecisionWindow(windowSeconds);
  return `The shop is waiting — please choose within ${label}, or they'll call you.`;
}

export function formatDecisionWindow(windowSeconds?: number): string {
  if (windowSeconds == null || !Number.isFinite(windowSeconds) || windowSeconds <= 0) {
    return "a few minutes";
  }
  const seconds = Math.round(windowSeconds);
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  if (seconds < 60) return seconds === 1 ? "1 second" : `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes} min ${rest} sec`;
}

/** Lower of sellable stock and the server sanity ceiling. */
export function choiceQuantityCap(stock: number, sanity?: number): number {
  const stockCap = Math.max(0, Math.floor(stock));
  if (sanity != null && Number.isFinite(sanity) && sanity > 0) {
    return Math.min(stockCap, Math.floor(sanity));
  }
  return stockCap;
}

/**
 * Price gap for the quantity the customer picked.
 * The held units are fully replaced, so their value does not scale with the new quantity.
 */
export function estimateChoiceDifference(
  unitPrice: number,
  quantity: number,
  heldValue: number,
): number {
  return unitPrice * quantity - heldValue;
}

export function isChoiceWindowOver(input: {
  timedOut: boolean;
  waitingSeconds?: number;
  decisionWindowSeconds?: number;
  fetchedAt: number;
  now: number;
}): boolean {
  if (input.timedOut) return true;
  if (input.waitingSeconds == null || input.decisionWindowSeconds == null) return false;
  const elapsed = Math.max(0, (input.now - input.fetchedAt) / 1000);
  return input.waitingSeconds + elapsed >= input.decisionWindowSeconds;
}

export function parseSubstitutes(payload: unknown): ItemSubstitutes | null {
  const record = asRecord(unwrapData(payload));
  if (!record) return null;
  const storeId = parseApiNumber(record.store_id ?? record.storeId);
  if (storeId == null) return null;

  const suggestionsRaw = Array.isArray(record.suggestions) ? record.suggestions : [];
  const suggestions: SubstituteSuggestion[] = [];
  for (const entry of suggestionsRaw) {
    const suggestion = asRecord(entry);
    if (!suggestion) continue;
    const productId = parseApiNumber(suggestion.product_id ?? suggestion.productId);
    if (productId == null) continue;
    const images = Array.isArray(suggestion.image_urls) ? suggestion.image_urls : [];
    const imageUrl = images.find((url) => typeof url === "string" && url.trim());
    suggestions.push({
      productId,
      name:
        typeof suggestion.name === "string" && suggestion.name.trim()
          ? suggestion.name.trim()
          : `Product ${productId}`,
      unitPrice: parseApiNumber(suggestion.unit_price ?? suggestion.unitPrice) ?? 0,
      lineTotal: parseApiNumber(suggestion.line_total ?? suggestion.lineTotal) ?? 0,
      difference: parseApiNumber(suggestion.difference) ?? 0,
      paymentRequired: suggestion.payment_required === true || suggestion.paymentRequired === true,
      availableQuantity: Math.max(
        0,
        Math.floor(parseApiNumber(suggestion.available_quantity ?? suggestion.availableQuantity) ?? 0),
      ),
      imageUrl: typeof imageUrl === "string" ? imageUrl : undefined,
    });
  }

  return {
    storeId,
    heldQuantity: Math.max(0, parseApiNumber(record.held_quantity ?? record.heldQuantity) ?? 0),
    availableQuantity: Math.max(
      0,
      parseApiNumber(record.available_quantity ?? record.availableQuantity) ?? 0,
    ),
    orderedQuantity: Math.max(0, parseApiNumber(record.ordered_quantity ?? record.orderedQuantity) ?? 0),
    heldValue: parseApiNumber(record.held_value ?? record.heldValue) ?? 0,
    maxSubstituteQuantity: parseApiNumber(
      record.max_substitute_quantity ?? record.maxSubstituteQuantity,
    ),
    heldAt: typeof record.held_at === "string" ? record.held_at : undefined,
    waitingSeconds: parseApiNumber(record.waiting_seconds ?? record.waitingSeconds),
    decisionWindowSeconds: parseApiNumber(
      record.decision_window_seconds ?? record.decisionWindowSeconds,
    ),
    timedOut: record.timed_out === true || record.timedOut === true,
    suggestions,
  };
}

export function parseChoiceResult(payload: unknown): ItemChoiceResult | null {
  const record = asRecord(unwrapData(payload));
  if (!record || typeof record.applied !== "boolean") return null;
  return {
    applied: record.applied,
    paymentRequired: record.payment_required === true || record.paymentRequired === true,
    amountDifference: parseApiNumber(record.amount_difference ?? record.amountDifference),
    outstandingAmount: parseApiNumber(record.outstanding_amount ?? record.outstandingAmount),
    totalAmount: parseApiNumber(record.total_amount ?? record.totalAmount),
    paymentAction:
      typeof record.payment_action === "string"
        ? record.payment_action
        : typeof record.paymentAction === "string"
          ? record.paymentAction
          : undefined,
  };
}

export function parsePaymentSession(payload: unknown): PaymentSession | null {
  const record = asRecord(unwrapData(payload));
  if (!record) return null;
  const nested = asRecord(record.payment_info) ?? record;
  const paymentReference = nested.payment_reference ?? nested.paymentReference ?? nested.reference;
  if (typeof paymentReference !== "string" || !paymentReference.trim()) return null;
  const sessionId = nested.session_id ?? nested.sessionId;
  const threeDs = nested.three_ds_html ?? nested.threeDsHtml;
  const status = nested.status;
  return {
    paymentReference: paymentReference.trim(),
    sessionId: typeof sessionId === "string" && sessionId.trim() ? sessionId.trim() : undefined,
    threeDsHtml: typeof threeDs === "string" && threeDs.trim() ? threeDs : undefined,
    status: typeof status === "string" ? status : undefined,
  };
}

function unwrapData(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const record = payload as Record<string, unknown>;
  if ("data" in record) return record.data;
  return payload;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseApiNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}
