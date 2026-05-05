"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
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
}

const PaymentMethod: React.FC<PaymentMethodProps> = ({
  selectedCardId,
  onCardSelect,
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

  return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-sm sm:text-base md:text-lg">
            <span className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
              Payment Method
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2">
              <span className="inline-flex h-8 w-12 items-center justify-center rounded-md border bg-white px-2">
                <Image
                  src={visaLogo}
                  alt="Visa"
                  width={44}
                  height={16}
                  className="h-4 w-auto object-contain"
                />
              </span>
              <span className="inline-flex h-8 w-12 items-center justify-center rounded-md border bg-white px-2">
                <Image
                  src={mastercardLogo}
                  alt="Mastercard"
                  width={44}
                  height={16}
                  className="h-4 w-auto object-contain"
                />
              </span>
              <span className="inline-flex h-8 w-12 items-center justify-center rounded-md border bg-white px-2">
                <Image
                  src={unionpayLogo}
                  alt="UnionPay"
                  width={44}
                  height={16}
                  className="h-4 w-auto object-contain"
                />
              </span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : savedCards.length > 0 ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-between gap-3 p-3 border-2 rounded-lg border-blue-600 bg-blue-50 flex-1">
                <div className="flex items-center gap-3 flex-1">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <div className="min-w-0">
                    {selectedSavedCard ? (
                      <>
                        <div className="font-semibold text-sm text-gray-900 truncate">
                          {selectedSavedCard.masked_card}{" "}
                          {selectedSavedCard.is_default && "(Default)"}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {selectedSavedCard.card_type} • Expires {selectedSavedCard.expiry_month}/
                          {selectedSavedCard.expiry_year}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold text-sm text-gray-900">Use a new card</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          Enter your card details securely during checkout
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsChangeOpen(true)}
                className="whitespace-nowrap"
              >
                Change
              </Button>
            </div>

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
                      {savedCards.map((card) => (
                        <div
                          key={card.id}
                          onClick={() => handleSelect(card.id)}
                          className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedCardId === card.id
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            <div>
                              <div className="font-semibold text-sm text-gray-900">
                                {card.masked_card} {card.is_default && "(Default)"}
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {card.card_type} • Expires {card.expiry_month}/{card.expiry_year}
                              </div>
                            </div>
                          </div>
                          {selectedCardId === card.id && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      ))}
                    </div>

                    <div
                      onClick={() => handleSelect(null)}
                      className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedCardId === null
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-semibold text-sm text-gray-900">Use a new card</div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            Enter your card details securely during checkout
                          </div>
                        </div>
                      </div>
                      {selectedCardId === null && (
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      )}
                    </div>

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
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-2 border-blue-300 rounded-lg bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3 flex-1">
                <CreditCard className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
                <div>
                  <div className="font-semibold text-base sm:text-lg text-gray-900">Add Payment Card</div>
                  <div className="text-xs sm:text-sm text-gray-600 mt-1">
                    Enter your card details securely during payment
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  if (onCardSelect) {
                    onCardSelect(null);
                  }
                  toast.success('You can add your card when you place the order');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto whitespace-nowrap"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Add Card & Continue
              </Button>
            </div>
          </div>
        )}
        </CardContent>
      </Card>
  );
};

export default PaymentMethod;
