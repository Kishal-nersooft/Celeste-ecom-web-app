"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Check, ArrowLeft } from "lucide-react";
import { getSavedCards } from "@/lib/api";
import toast from "react-hot-toast";
import visaLogo from "@/images/Payment images/Visa_Brandmark_Blue_RGB_2021.png";
import mastercardLogo from "@/images/Payment images/ma_symbol_opt_73_3x.png";
import unionpayLogo from "@/images/Payment images/Unionpay-96.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SavedCard {
  id: number;
  masked_card: string;
  card_type: string;
  expiry_month: string;
  expiry_year: string;
  is_default: boolean;
}

interface PaymentMethodProps {
  selectedCardId?: number | null;
  onCardSelect?: (cardId: number | null) => void;
  previewLoading?: boolean;
  variant?: "card" | "inline";
}

function cardLogo(cardType?: string | null) {
  const type = (cardType || "").toLowerCase();
  if (type.includes("visa")) return { src: visaLogo, alt: "Visa" };
  if (type.includes("master")) return { src: mastercardLogo, alt: "Mastercard" };
  if (type.includes("union")) return { src: unionpayLogo, alt: "UnionPay" };
  return null;
}

function CardBrandIcon({ cardType }: { cardType?: string | null }) {
  const logo = cardLogo(cardType);
  if (!logo) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
        <CreditCard className="h-4 w-4" />
      </span>
    );
  }

  return (
    <span className="flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white px-1">
      <Image
        src={logo.src}
        alt={logo.alt}
        width={40}
        height={16}
        style={{ width: "auto", height: "16px" }}
        className="max-h-4 w-auto object-contain"
      />
    </span>
  );
}

function PaymentMethodSkeleton() {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-sm sm:text-base md:text-lg">
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
            Payment Method
          </span>
          <span className="flex items-center gap-1.5 sm:gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-flex h-8 w-12 items-center justify-center rounded-md border border-gray-100 bg-gray-50"
              >
                <span className="h-4 w-8 rounded bg-gray-200 animate-pulse" />
              </span>
            ))}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-neutral-100 animate-pulse" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-full max-w-44 rounded-md bg-gray-200 animate-pulse" />
            <div className="h-3 w-28 max-w-full rounded-md bg-gray-100 animate-pulse" />
          </div>
          <div className="h-8 w-12 shrink-0 rounded-md bg-gray-100 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

const PaymentMethod: React.FC<PaymentMethodProps> = ({
  selectedCardId,
  onCardSelect,
  previewLoading = false,
  variant = "card",
}) => {
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChangeOpen, setIsChangeOpen] = useState(false);
  const didAutoSelectRef = useRef(false);
  const [dialogView, setDialogView] = useState<"list" | "add">("list");
  const [newCardForm, setNewCardForm] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    name: "",
  });

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        const response = await getSavedCards();
        const cards = Array.isArray(response) ? response : response?.data || [];
        setSavedCards(cards);
      } catch (error: any) {
        console.error('Failed to fetch saved cards:', error);
        // Don't show error toast - user might not have any cards yet
        setSavedCards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, []);

  // If the user has saved cards, auto-select the default (or first) card.
  // This matches the desired UX: show a saved card selected by default on checkout.
  useEffect(() => {
    if (!onCardSelect) return;
    if (loading) return;
    if (savedCards.length === 0) return;
    if (didAutoSelectRef.current) return;
    if (selectedCardId !== null && selectedCardId !== undefined) {
      didAutoSelectRef.current = true;
      return;
    }

    const defaultCard = savedCards.find((c) => c.is_default) ?? savedCards[0];
    if (defaultCard?.id != null) {
      onCardSelect(defaultCard.id);
    }
    didAutoSelectRef.current = true;
  }, [loading, savedCards, selectedCardId, onCardSelect]);

  const selectedSavedCard =
    selectedCardId != null ? savedCards.find((c) => c.id === selectedCardId) : undefined;

  const handleSelect = (cardId: number | null) => {
    if (onCardSelect) onCardSelect(cardId);
    setIsChangeOpen(false);
    setDialogView("list");
  };

  const openAddNewCard = () => {
    setDialogView("add");
  };

  const backToList = () => {
    setDialogView("list");
  };

  const handleNewCardChange = (field: keyof typeof newCardForm, value: string) => {
    setNewCardForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitNewCard = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCardForm.cardNumber.trim() || !newCardForm.expiry.trim() || !newCardForm.cvv.trim() || !newCardForm.name.trim()) {
      toast.error("Please fill all card details");
      return;
    }

    // We don't save raw card data here; checkout uses the gateway for secure capture.
    handleSelect(null);
  };

  if (previewLoading) {
    if (variant === "inline") {
      return (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-bold text-black sm:text-base">
            <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
            Payment Method
          </h4>
          <div className="h-14 w-full animate-pulse rounded-xl bg-neutral-100" />
        </div>
      );
    }
    return <PaymentMethodSkeleton />;
  }

  const selection = loading ? (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-neutral-100" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-full max-w-44 animate-pulse rounded-md bg-gray-200" />
        <div className="h-3 w-28 max-w-full animate-pulse rounded-md bg-gray-100" />
      </div>
      <div className="h-4 w-8 shrink-0 animate-pulse rounded bg-gray-100" />
    </div>
  ) : savedCards.length > 0 ? (
    <button
      type="button"
      onClick={() => setIsChangeOpen(true)}
      className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
    >
      <CardBrandIcon cardType={selectedSavedCard?.card_type} />
      <div className="min-w-0 flex-1">
        {selectedSavedCard ? (
          <>
            <div className="truncate text-sm font-medium text-neutral-900">
              {selectedSavedCard.masked_card}
              {selectedSavedCard.is_default ? " (Default)" : ""}
            </div>
            <div className="mt-0.5 truncate text-xs text-neutral-500">
              Expires {selectedSavedCard.expiry_month}/{selectedSavedCard.expiry_year}
            </div>
          </>
        ) : (
          <>
            <div className="truncate text-sm font-medium text-neutral-900">Use a new card</div>
            <div className="mt-0.5 truncate text-xs text-neutral-500">
              Enter card details at payment
            </div>
          </>
        )}
      </div>
      <span className="shrink-0 text-sm font-semibold text-neutral-900">Edit</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={() => {
        if (onCardSelect) onCardSelect(null);
        toast.success("You can add your card when you place the order");
      }}
      className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
    >
      <CardBrandIcon />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-neutral-900">Add a card</div>
        <div className="mt-0.5 truncate text-xs text-neutral-500">
          Enter card details at payment
        </div>
      </div>
      <span className="shrink-0 text-sm font-semibold text-neutral-900">Edit</span>
    </button>
  );

  const cardDialog = savedCards.length > 0 ? (
    <Dialog open={isChangeOpen} onOpenChange={setIsChangeOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {dialogView === "add" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-ml-2"
                onClick={backToList}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : null}
            <DialogTitle>{dialogView === "add" ? "Add new card" : "Choose a card"}</DialogTitle>
          </div>
        </DialogHeader>

        {dialogView === "list" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              {savedCards.map((card) => {
                const selected = selectedCardId === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleSelect(card.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-neutral-900 bg-neutral-50"
                        : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <CardBrandIcon cardType={card.card_type} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-neutral-900">
                          {card.masked_card} {card.is_default && "(Default)"}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-neutral-500">
                          Expires {card.expiry_month}/{card.expiry_year}
                        </span>
                      </span>
                    </span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-neutral-900" />}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                selectedCardId === null
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <CardBrandIcon />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-neutral-900">Use a new card</span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    Enter your card details securely during checkout
                  </span>
                </span>
              </span>
              {selectedCardId === null && <Check className="h-4 w-4 shrink-0 text-neutral-900" />}
            </button>

            <button
              type="button"
              onClick={openAddNewCard}
              className="w-full rounded-lg bg-black px-4 py-3 text-left text-sm font-semibold text-white transition-colors hover:bg-black/90"
            >
              + Add new card
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitNewCard} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-card-number">Card number</Label>
                <Input
                  id="new-card-number"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={newCardForm.cardNumber}
                  onChange={(e) => handleNewCardChange("cardNumber", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-card-expiry">Expiry</Label>
                  <Input
                    id="new-card-expiry"
                    placeholder="MM/YY"
                    value={newCardForm.expiry}
                    onChange={(e) => handleNewCardChange("expiry", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-card-cvv">CVV</Label>
                  <Input
                    id="new-card-cvv"
                    inputMode="numeric"
                    placeholder="123"
                    value={newCardForm.cvv}
                    onChange={(e) => handleNewCardChange("cvv", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-card-name">Name on card</Label>
                <Input
                  id="new-card-name"
                  placeholder="John Doe"
                  value={newCardForm.name}
                  onChange={(e) => handleNewCardChange("name", e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full">
              Continue
            </Button>

            <p className="text-xs text-gray-500">
              Card details will be entered securely during checkout.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  ) : null;

  if (variant === "inline") {
    return (
      <div className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-bold text-black sm:text-base">
          <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
          Payment Method
        </h4>
        {selection}
        {cardDialog}
      </div>
    );
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center justify-between gap-2 text-sm sm:gap-3 sm:text-base md:text-lg">
          <span className="flex min-w-0 items-center gap-2">
            <CreditCard className="h-4 w-4 shrink-0 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
            <span className="truncate">Payment Method</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <span className="inline-flex h-7 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white px-1 sm:h-8 sm:w-12 sm:px-2">
              <Image
                src={visaLogo}
                alt="Visa"
                width={44}
                height={16}
                style={{ width: "auto", height: "16px" }}
                className="max-h-4 w-auto object-contain"
              />
            </span>
            <span className="inline-flex h-7 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white px-1 sm:h-8 sm:w-12 sm:px-2">
              <Image
                src={mastercardLogo}
                alt="Mastercard"
                width={44}
                height={16}
                style={{ width: "auto", height: "16px" }}
                className="max-h-4 w-auto object-contain"
              />
            </span>
            <span className="inline-flex h-7 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white px-1 sm:h-8 sm:w-12 sm:px-2">
              <Image
                src={unionpayLogo}
                alt="UnionPay"
                width={44}
                height={16}
                style={{ width: "auto", height: "16px" }}
                className="max-h-4 w-auto object-contain"
              />
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selection}
        {cardDialog}
      </CardContent>
    </Card>
  );
};

export default PaymentMethod;
