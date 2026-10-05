"use client";

import React, { useEffect, useRef, useState } from "react";
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
  checkPaymentStatus,
  confirmItemChoice,
  getItemSubstitutes,
  getSavedCards,
  initiateOutstandingPayment,
  searchProducts,
  submitItemChoice,
} from "@/lib/api";
import {
  choiceQuantityCap,
  choiceWindowCopy,
  estimateChoiceDifference,
  isChoiceWindowOver,
  parseChoiceResult,
  parsePaymentSession,
  parseSubstitutes,
  type ItemSubstitutes,
  type SubstituteSuggestion,
} from "@/lib/order-hold";
import { getProductImageUrl } from "@/lib/product-image";
import { getMaxAvailableQuantity } from "@/lib/stock-utils";
import type { OrderItem, Product } from "@/store";

interface OrderItemChoiceProps {
  orderId: string;
  item: OrderItem;
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

const OrderItemChoice = ({ orderId, item, onApplied }: OrderItemChoiceProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [substitutes, setSubstitutes] = useState<ItemSubstitutes | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [picked, setPicked] = useState<PickedProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [outstanding, setOutstanding] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [threeDsHtml, setThreeDsHtml] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PickedProduct[]>([]);
  const paymentStopRef = useRef<(() => void) | null>(null);
  const paymentWindowRef = useRef<Window | null>(null);

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
      setFetchedAt(Date.now());
      setNow(Date.now());
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
    setOutstanding(null);
    setQuery("");
    setResults([]);
    void loadSubstitutes();
    // Reload every time the dialog opens. Suggestions belong to this hold, not the product.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId, lineId]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

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

  useEffect(() => {
    return () => {
      paymentStopRef.current?.();
    };
  }, []);

  const timedOut = substitutes
    ? isChoiceWindowOver({
        timedOut: substitutes.timedOut,
        waitingSeconds: substitutes.waitingSeconds,
        decisionWindowSeconds: substitutes.decisionWindowSeconds,
        fetchedAt,
        now,
      })
    : false;

  const selectProduct = (product: PickedProduct) => {
    setOutstanding(null);
    setPicked(product);
    const preferred = heldQuantity > 0 ? heldQuantity : 1;
    setQuantity(Math.min(Math.max(1, preferred), product.cap));
  };

  const applyLocalSuccess = (result: { amountDifference?: number; paymentAction?: string }) => {
    const refund =
      result.paymentAction === "refund_issued" ||
      (result.amountDifference != null && result.amountDifference < -0.009);
    toast.success(refund ? "Saved. The difference is on its way back." : "Saved. Your order is updated.");
    setOpen(false);
    onApplied();
  };

  const handleChoiceError = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Could not save your choice.";
    toast.error(message);
    if (error instanceof ApiError && (error.status === 422 || error.status === 404)) {
      void loadSubstitutes();
    }
  };

  const submitRemove = async () => {
    if (!lineId || submitting) return;
    setSubmitting(true);
    try {
      const result = parseChoiceResult(await submitItemChoice(orderId, lineId, { action: "remove" }));
      if (!result) throw new Error("The shop did not confirm that change.");
      if (!result.applied) {
        toast.error("That change was not applied. Please try again.");
        return;
      }
      applyLocalSuccess(result);
    } catch (error) {
      handleChoiceError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const submitReplace = async () => {
    if (!lineId || !picked || submitting) return;
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
        applyLocalSuccess(result);
        return;
      }
      if (result.paymentRequired) {
        setOutstanding(result.outstandingAmount ?? 0);
        return;
      }
      toast.error("That change was not applied. Please try again.");
    } catch (error) {
      handleChoiceError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const stopPayment = () => {
    paymentStopRef.current?.();
    paymentStopRef.current = null;
    setPaying(false);
  };

  const finishPayment = async (paymentReference: string) => {
    if (!lineId) return;
    try {
      const result = parseChoiceResult(
        await confirmItemChoice(orderId, lineId, paymentReference),
      );
      if (!result?.applied) {
        toast.error("Payment was received, but the change was not applied. Please try again.");
        return;
      }
      setThreeDsHtml(null);
      setOutstanding(null);
      applyLocalSuccess(result);
    } catch (error) {
      handleChoiceError(error);
    }
  };

  const watchPayment = (paymentReference: string) => {
    let stopped = false;
    let attempts = 0;
    const timer = window.setInterval(() => {
      void (async () => {
        if (stopped) return;
        const win = paymentWindowRef.current;
        if (win && win.closed) {
          stopped = true;
          window.clearInterval(timer);
          paymentWindowRef.current = null;
          setPaying(false);
          setThreeDsHtml(null);
          toast("Payment wasn't finished. You can still choose.");
          return;
        }
        attempts += 1;
        if (attempts > 300) {
          stopped = true;
          window.clearInterval(timer);
          setPaying(false);
          toast.error("Payment is taking too long. You can try again.");
          return;
        }
        try {
          const statusResponse = await checkPaymentStatus(paymentReference);
          const status =
            statusResponse?.data?.status ??
            statusResponse?.status ??
            "";
          const normalized = String(status).toLowerCase().trim();
          if (normalized === "success") {
            stopped = true;
            window.clearInterval(timer);
            const winOpen = paymentWindowRef.current;
            if (winOpen && !winOpen.closed) winOpen.close();
            paymentWindowRef.current = null;
            try {
              await finishPayment(paymentReference);
            } finally {
              setPaying(false);
              setThreeDsHtml(null);
            }
          } else if (normalized === "failed" || normalized === "declined") {
            stopped = true;
            window.clearInterval(timer);
            setPaying(false);
            setThreeDsHtml(null);
            toast.error("Payment was declined. Please try again.");
          }
        } catch {
          // Keep polling. A single status miss should not abandon the payment.
        }
      })();
    }, 2000);

    paymentStopRef.current = () => {
      stopped = true;
      window.clearInterval(timer);
    };
  };

  const startPayment = async () => {
    if (outstanding == null || outstanding <= 0 || paying) return;
    setPaying(true);
    try {
      let sourceTokenId: number | undefined;
      try {
        const cardsResponse = await getSavedCards();
        const cards = Array.isArray(cardsResponse) ? cardsResponse : cardsResponse?.data || [];
        const saved = (cards as { id?: number; is_default?: boolean }[]).filter(
          (card) => card?.id != null,
        );
        const preferred = saved.find((card) => card.is_default) ?? saved[0];
        if (preferred?.id != null) sourceTokenId = preferred.id;
      } catch {
        sourceTokenId = undefined;
      }

      const session = parsePaymentSession(
        await initiateOutstandingPayment({
          amount: outstanding,
          orderId,
          sourceTokenId,
        }),
      );
      if (!session) throw new Error("Payment session was not started.");

      const status = (session.status ?? "").toLowerCase();
      if (status === "success") {
        try {
          await finishPayment(session.paymentReference);
        } finally {
          setPaying(false);
        }
        return;
      }
      if (session.threeDsHtml) {
        setThreeDsHtml(session.threeDsHtml);
        watchPayment(session.paymentReference);
        return;
      }

      if (!session.sessionId) throw new Error("Payment session was not started.");
      const url = `${window.location.origin}/checkout/payment?${new URLSearchParams({
        sessionId: session.sessionId,
        paymentRef: session.paymentReference,
        embedded: "1",
      }).toString()}`;
      const paymentWindow = window.open(url, "_blank", "width=800,height=700");
      if (!paymentWindow) {
        setPaying(false);
        toast.error("Please allow popups to complete payment.");
        return;
      }
      paymentWindowRef.current = paymentWindow;
      watchPayment(session.paymentReference);
    } catch (error) {
      setPaying(false);
      toast.error(error instanceof Error ? error.message : "Could not start payment.");
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
    if (!next) {
      paymentStopRef.current?.();
      paymentStopRef.current = null;
      if (paymentWindowRef.current && !paymentWindowRef.current.closed) {
        paymentWindowRef.current.close();
      }
      paymentWindowRef.current = null;
      setPaying(false);
      setThreeDsHtml(null);
    }
    setOpen(next);
  };

  const pickedDifference = picked ? differenceFor(picked, quantity) : 0;

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="mt-2 h-9 rounded-full bg-black px-4 text-xs font-bold text-white hover:bg-neutral-800"
        onClick={() => setOpen(true)}
      >
        Choose replacement
      </Button>

      <Dialog open={open} onOpenChange={closeChoice}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 font-[family-name:var(--font-poppins)] sm:max-w-md sm:rounded-2xl">
          <DialogHeader className="space-y-2 border-b border-neutral-100 px-5 pb-4 pt-5 text-left">
            <DialogTitle className="pr-8 text-xl font-bold tracking-tight text-neutral-950">
              Choose a replacement
            </DialogTitle>
            <DialogDescription className="text-sm font-medium leading-snug text-neutral-500">
              {heldQuantity === 1 ? "1 of" : `${heldQuantity} of`}{" "}
              <span className="font-bold text-neutral-800">{item.name}</span>{" "}
              {heldQuantity === 1 ? "needs a replacement, or you can remove it." : "need a replacement, or you can remove them."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {substitutes && (
              <p
                className={`rounded-2xl px-4 py-3 text-sm font-semibold leading-snug ${
                  timedOut ? "bg-amber-50 text-amber-950" : "bg-neutral-100 text-neutral-800"
                }`}
              >
                {choiceWindowCopy(timedOut, substitutes.decisionWindowSeconds)}
              </p>
            )}

            {loading && <p className="text-sm font-semibold text-neutral-500">Loading options…</p>}
            {loadError && <p className="text-sm font-semibold text-red-600">{loadError}</p>}

            {outstanding != null && (
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-base font-bold text-amber-950">
                  <PriceFormatter amount={outstanding} className="text-base font-bold text-amber-950" /> more to pay
                </p>
                <p className="mt-1 text-sm font-medium text-amber-900">
                  Nothing changes until this payment succeeds. You can still pick something else.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    type="button"
                    className="h-11 rounded-full bg-black text-sm font-bold text-white hover:bg-neutral-800"
                    disabled={paying}
                    onClick={() => void startPayment()}
                  >
                    {paying ? "Waiting for payment…" : "Pay the difference"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-full border-neutral-200 text-sm font-bold"
                    disabled={paying}
                    onClick={() => setOutstanding(null)}
                  >
                    Choose something else
                  </Button>
                </div>
              </div>
            )}

            {substitutes && substitutes.suggestions.length > 0 && (
              <section className="space-y-2.5">
                <h3 className="text-sm font-bold text-neutral-950">Suggested</h3>
                {substitutes.suggestions.map((suggestion) => (
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
                ))}
              </section>
            )}

            {substitutes && (
              <section className="space-y-2.5">
                <h3 className="text-sm font-bold text-neutral-950">Or search this shop</h3>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search products"
                    className="h-11 rounded-full border-neutral-200 bg-neutral-50 pl-10 text-sm font-semibold placeholder:font-medium"
                    disabled={paying}
                  />
                </div>
                {searching && <p className="text-sm font-semibold text-neutral-500">Searching…</p>}
                {!searching && query.trim().length >= 2 && results.length === 0 && (
                  <p className="text-sm font-semibold text-neutral-500">Nothing in stock matched.</p>
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
              </section>
            )}
          </div>

          <div className="space-y-2 border-t border-neutral-100 bg-white px-5 py-4">
            {picked && outstanding == null && (
              <div className="mb-3 rounded-2xl bg-neutral-50 p-3">
                <p className="line-clamp-2 text-sm font-bold text-neutral-950">{picked.name}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <QuantityStepper quantity={quantity} cap={picked.cap} onChange={setQuantity} />
                  <DifferenceText amount={pickedDifference} />
                </div>
              </div>
            )}
            {picked && outstanding == null && (
              <Button
                type="button"
                className="h-11 w-full rounded-full bg-black text-sm font-bold text-white hover:bg-neutral-800"
                disabled={submitting || paying}
                onClick={() => void submitReplace()}
              >
                {submitting ? "Saving…" : "Use this"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-full border-neutral-200 text-sm font-bold text-neutral-950 hover:bg-neutral-50"
              disabled={submitting || paying || !lineId}
              onClick={() => void submitRemove()}
            >
              {heldQuantity === 1 ? "Remove this item" : `Remove these ${heldQuantity}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!threeDsHtml}
        onOpenChange={(next) => {
          if (!next) {
            stopPayment();
            setThreeDsHtml(null);
            toast("Payment wasn't finished. You can still choose.");
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col gap-2 font-[family-name:var(--font-poppins)] sm:max-w-2xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">Verify your payment</DialogTitle>
            <DialogDescription className="text-sm font-medium text-neutral-500">
              Complete the verification below. The order updates when the payment finishes.
            </DialogDescription>
          </DialogHeader>
          {threeDsHtml && (
            <iframe
              title="Payment verification"
              className="min-h-[70vh] w-full flex-1 rounded-md border border-gray-200 bg-white"
              srcDoc={threeDsHtml}
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

function SuggestionRow({
  suggestion,
  sanity,
  selected,
  onSelect,
}: {
  suggestion: SubstituteSuggestion;
  sanity?: number;
  selected: boolean;
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
      disabled={cap < 1}
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
      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
        selected
          ? "border-black bg-neutral-50 shadow-sm"
          : "border-neutral-200 bg-white hover:border-neutral-300"
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
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-[10px] font-bold text-neutral-400">
      No image
    </div>
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
        className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-950 disabled:opacity-30"
        disabled={quantity <= 1}
        onClick={() => onChange(Math.max(1, quantity - 1))}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-6 text-center text-sm font-bold text-neutral-950">{quantity}</span>
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-950 disabled:opacity-30"
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
