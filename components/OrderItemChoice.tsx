"use client";

import React, { useEffect, useState } from "react";
import { Check, Minus, Plus, Search } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import PriceFormatter from "@/components/PriceFormatter";
import {
  ApiError,
  getItemSubstitutes,
  searchProducts,
  submitItemChoice,
} from "@/lib/api";
import {
  choiceQuantityCap,
  choiceResultCopy,
  estimateChoiceDifference,
  parseChoiceResult,
  parseSubstitutes,
  serverWindowRemaining,
  type ItemSubstitutes,
  type SubstituteSuggestion,
} from "@/lib/order-hold";
import { getProductImageUrl } from "@/lib/product-image";
import { getMaxAvailableQuantity } from "@/lib/stock-utils";
import type { OrderItem, Product } from "@/store";

interface OrderItemChoiceProps {
  orderId: string;
  item: OrderItem;
  /** Bumps when Firestore reports a newer order, which restarts the shared window. */
  liveVersion?: number;
  onApplied: () => void;
}

interface PickedProduct {
  productId: number;
  name: string;
  unitPrice: number;
  imageUrl?: string;
  cap: number;
  /** Suggestion difference at the server's default quantity. Ignored once the customer changes quantity. */
  listedDifference?: number;
  listedQuantity?: number;
}

const OrderItemChoice = ({ orderId, item, liveVersion, onApplied }: OrderItemChoiceProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [substitutes, setSubstitutes] = useState<ItemSubstitutes | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [picked, setPicked] = useState<PickedProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PickedProduct[]>([]);
  const [anchor, setAnchor] = useState<{ remaining: number; at: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const lineId = item.lineId;
  const heldQuantity = Math.max(0, item.heldQuantity ?? substitutes?.heldQuantity ?? 0);

  const loadSubstitutes = async () => {
    if (!lineId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const payload = await getItemSubstitutes(orderId, lineId);
      const parsed = parseSubstitutes(payload);
      if (!parsed) throw new Error("Replacement options were incomplete.");
      setSubstitutes(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load replacement options.";
      setLoadError(message);
      if (error instanceof ApiError && (error.status === 422 || error.status === 404)) {
        onApplied();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setPicked(null);
    setQuery("");
    setResults([]);
  }, [open, lineId]);

  useEffect(() => {
    void loadSubstitutes();
    // A newer hold restarts the window. Re-read the server clock instead of keeping our own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId, lineId, liveVersion]);

  useEffect(() => {
    if (!substitutes) return;
    const remaining = substitutes.timedOut
      ? 0
      : serverWindowRemaining(substitutes.waitingSeconds, substitutes.decisionWindowSeconds);
    if (remaining == null) {
      setAnchor(null);
      return;
    }
    setAnchor({ remaining, at: Date.now() });
    setNow(Date.now());
  }, [substitutes]);

  useEffect(() => {
    if (!anchor || anchor.remaining <= 0) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [anchor]);

  useEffect(() => {
    if (!open || !substitutes) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchProducts(trimmed, "full", {
        limit: 20,
        includeInventory: true,
        includePricing: true,
        hasInventory: true,
        storeIds: [substitutes.storeId],
        signal: controller.signal,
      })
        .then((response) => {
          const next: PickedProduct[] = [];
          for (const product of response.products as Product[]) {
            if (product.id === item.productId) continue;
            const stock = getMaxAvailableQuantity(product, substitutes.storeId);
            if (stock == null || stock < 1) continue;
            const cap = choiceQuantityCap(stock, substitutes.maxSubstituteQuantity);
            if (cap < 1) continue;
            const unitPrice =
              product.pricing?.final_price ?? product.base_price ?? product.price ?? 0;
            next.push({
              productId: product.id,
              name: product.name,
              unitPrice,
              imageUrl: getProductImageUrl(product) ?? undefined,
              cap,
            });
          }
          setResults(next);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, substitutes, item.productId]);

  const secondsLeft =
    anchor == null ? null : Math.max(0, anchor.remaining - Math.floor((now - anchor.at) / 1000));
  const timedOut = secondsLeft === 0;

  useEffect(() => {
    if (timedOut && open) setOpen(false);
  }, [timedOut, open]);

  const selectProduct = (product: PickedProduct) => {
    if (timedOut) return;
    setPicked(product);
    const preferred = heldQuantity > 0 ? heldQuantity : 1;
    setQuantity(Math.min(Math.max(1, preferred), product.cap));
  };

  const applyLocalSuccess = (
    kind: "replace" | "remove",
    result: { paymentAction?: string; amountDifference?: number },
  ) => {
    toast.success(choiceResultCopy(kind, result));
    setOpen(false);
    onApplied();
  };

  const handleChoiceError = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Could not save your choice.";
    toast.error(message);
    if (error instanceof ApiError && (error.status === 422 || error.status === 404)) {
      setOpen(false);
      onApplied();
    }
  };

  const submitRemove = async () => {
    if (!lineId || submitting || timedOut) return;
    setSubmitting(true);
    try {
      const result = parseChoiceResult(await submitItemChoice(orderId, lineId, { action: "remove" }));
      if (!result) throw new Error("The shop did not confirm that change.");
      if (!result.applied) {
        toast.error("That change was not applied. Please try again.");
        return;
      }
      applyLocalSuccess("remove", result);
    } catch (error) {
      handleChoiceError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const submitReplace = async () => {
    if (!lineId || !picked || submitting || timedOut) return;
    setSubmitting(true);
    try {
      const result = parseChoiceResult(
        await submitItemChoice(orderId, lineId, {
          action: "replace",
          product_id: picked.productId,
          quantity,
        }),
      );
      if (!result) throw new Error("The shop did not confirm that change.");
      if (result.applied) {
        applyLocalSuccess("replace", result);
        return;
      }
      toast.error("That change was not applied. Please try again.");
    } catch (error) {
      handleChoiceError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const differenceFor = (product: PickedProduct, qty: number) => {
    if (
      product.listedDifference != null &&
      product.listedQuantity != null &&
      qty === product.listedQuantity
    ) {
      return product.listedDifference;
    }
    return estimateChoiceDifference(product.unitPrice, qty, substitutes?.heldValue ?? 0);
  };

  const closeChoice = (next: boolean) => {
    setOpen(next);
  };

  const pickedDifference = picked ? differenceFor(picked, quantity) : 0;

  return (
    <>
      <div className="mt-2 flex items-center justify-start gap-2">
        <Button
          type="button"
          size="sm"
          disabled={timedOut}
          className="h-9 w-fit rounded-full bg-black px-4 text-xs font-bold text-white hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500"
          onClick={() => {
            if (!timedOut) setOpen(true);
          }}
        >
          Choose replacement
        </Button>
        {secondsLeft != null && (
          <span
            className={`inline-flex h-9 items-center rounded-full px-3 text-xs font-bold tabular-nums ${
              timedOut ? "bg-neutral-200 text-neutral-500" : "bg-neutral-950 text-white"
            }`}
          >
            {formatClock(secondsLeft)}
          </span>
        )}
      </div>

      <Dialog open={open && !timedOut} onOpenChange={closeChoice}>
        <DialogContent
          mobileAsSheet
          sheetAutoHeight
          className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 font-[family-name:var(--font-poppins)] sm:max-w-md sm:rounded-2xl"
        >
          <DialogHeader className="sticky top-0 z-10 space-y-3 border-b border-neutral-100 bg-white px-0 pb-3 pt-1 text-left sm:px-5 sm:pt-4">
            <div className="flex items-center justify-start gap-3 pr-8">
              <DialogTitle className="text-lg font-bold tracking-tight text-neutral-950">
                Replace
              </DialogTitle>
            </div>
            {secondsLeft != null && (
              <p className="text-3xl font-bold tabular-nums tracking-tight text-neutral-950">
                {formatClock(secondsLeft)}
              </p>
            )}
            <DialogDescription className="line-clamp-1 text-sm font-bold text-neutral-800">
              {heldQuantity > 1 ? `${heldQuantity} × ` : ""}
              {item.name}
            </DialogDescription>
            {substitutes && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search this shop"
                  className="h-11 rounded-full border-neutral-200 bg-neutral-50 pl-10 text-sm font-semibold placeholder:font-medium"
                />
              </div>
            )}
          </DialogHeader>

          <div className="space-y-2 px-0 py-3 sm:px-5">
            {loading && <p className="text-sm font-semibold text-neutral-500">Loading…</p>}
            {loadError && <p className="text-sm font-semibold text-red-600">{loadError}</p>}

            {searching && <p className="text-sm font-semibold text-neutral-500">Searching…</p>}
            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <p className="text-sm font-semibold text-neutral-500">No match</p>
            )}
            {results.map((product) => (
              <ProductChoice
                key={product.productId}
                name={product.name}
                imageUrl={product.imageUrl}
                unitPrice={product.unitPrice}
                cap={product.cap}
                selected={picked?.productId === product.productId}
                onSelect={() => selectProduct(product)}
              />
            ))}

            {query.trim().length < 2 && substitutes && substitutes.suggestions.length > 0 && (
              substitutes.suggestions.map((suggestion) => (
                <SuggestionRow
                  key={suggestion.productId}
                  suggestion={suggestion}
                  sanity={substitutes.maxSubstituteQuantity}
                  selected={picked?.productId === suggestion.productId}
                  onSelect={() => {
                    const cap = choiceQuantityCap(
                      suggestion.availableQuantity,
                      substitutes.maxSubstituteQuantity,
                    );
                    if (cap < 1) return;
                    selectProduct({
                      productId: suggestion.productId,
                      name: suggestion.name,
                      unitPrice: suggestion.unitPrice,
                      imageUrl: suggestion.imageUrl,
                      cap,
                      listedDifference: suggestion.difference,
                      listedQuantity: substitutes.heldQuantity || heldQuantity,
                    });
                  }}
                />
              ))
            )}
          </div>

          <div className="sticky bottom-0 z-10 space-y-2 border-t border-neutral-100 bg-white px-0 py-3 sm:px-5">
            {picked && (
              <div className="flex items-center justify-between gap-3">
                <QuantityStepper quantity={quantity} cap={picked.cap} onChange={setQuantity} />
                <DifferenceText amount={pickedDifference} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full border-neutral-200 text-sm font-bold text-neutral-950"
                disabled={submitting || !lineId}
                onClick={() => void submitRemove()}
              >
                Remove
              </Button>
              <Button
                type="button"
                className="h-11 rounded-full bg-black text-sm font-bold text-white hover:bg-neutral-800"
                disabled={submitting || !picked}
                onClick={() => void submitReplace()}
              >
                {submitting ? "Saving…" : "Use this"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function SuggestionRow({
  suggestion,
  sanity,
  selected,
  disabled,
  onSelect,
}: {
  suggestion: SubstituteSuggestion;
  sanity?: number;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const cap = choiceQuantityCap(suggestion.availableQuantity, sanity);
  return (
    <ProductChoice
      name={suggestion.name}
      imageUrl={suggestion.imageUrl}
      unitPrice={suggestion.unitPrice}
      cap={cap}
      difference={suggestion.difference}
      selected={selected}
      disabled={disabled || cap < 1}
      onSelect={onSelect}
    />
  );
}

function ProductChoice({
  name,
  imageUrl,
  unitPrice,
  cap,
  difference,
  selected,
  disabled,
  onSelect,
}: {
  name: string;
  imageUrl?: string;
  unitPrice: number;
  cap: number;
  difference?: number;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors active:bg-neutral-50 ${
        selected
          ? "border-black bg-neutral-50 shadow-sm"
          : "border-neutral-200 bg-white"
      } disabled:opacity-50`}
    >
      <Thumb imageUrl={imageUrl} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-bold leading-snug text-neutral-950">{name}</span>
        <span className="mt-1 block text-xs font-semibold text-neutral-500">
          <PriceFormatter amount={unitPrice} className="text-xs font-bold text-neutral-800" />
          {cap > 0 ? <span className="font-medium text-neutral-400"> · up to {cap}</span> : null}
        </span>
        {difference != null && (
          <span className="mt-1.5 block">
            <DifferenceText amount={difference} />
          </span>
        )}
      </span>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-black bg-black text-white" : "border-neutral-300 bg-white"
        }`}
        aria-hidden
      >
        {selected && <Check className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

function DifferenceText({ amount }: { amount: number }) {
  if (Math.abs(amount) < 0.009) {
    return (
      <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-600">
        Same price
      </span>
    );
  }
  const more = amount > 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
        more ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"
      }`}
    >
      <PriceFormatter
        amount={Math.abs(amount)}
        className={`text-xs font-bold ${more ? "text-amber-900" : "text-emerald-800"}`}
      />
      <span className="ml-1">{more ? "more" : "back"}</span>
    </span>
  );
}

function Thumb({ imageUrl }: { imageUrl?: string }) {
  if (imageUrl) {
    return (
      <img src={imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-neutral-100 object-cover" />
    );
  }
  return (
    <div className="h-14 w-14 shrink-0 rounded-xl bg-neutral-100" />
  );
}

function QuantityStepper({
  quantity,
  cap,
  onChange,
}: {
  quantity: number;
  cap: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white p-1">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-950 disabled:opacity-30"
        disabled={quantity <= 1}
        onClick={() => onChange(Math.max(1, quantity - 1))}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-6 text-center text-sm font-bold text-neutral-950">{quantity}</span>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-950 disabled:opacity-30"
        disabled={quantity >= cap}
        onClick={() => onChange(Math.min(cap, quantity + 1))}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export default OrderItemChoice;
