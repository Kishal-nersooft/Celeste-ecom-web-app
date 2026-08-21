"use client";

import React, { useEffect, useMemo, useState } from "react";
import Container from "@/components/Container";
import Title from "@/components/Title";
import { useAuth } from "@/components/FirebaseAuthProvider";
import AuthRetryScreen from "@/components/AuthRetryScreen";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCardIcon, PlusIcon, TrashIcon } from "lucide-react";
import toast from "react-hot-toast";
import { deleteSavedCard, getSavedCards, setDefaultSavedCard } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SavedCard = {
  id?: number;
  masked_card?: string | null;
  card_type?: string | null;
  expiry_month?: string | null;
  expiry_year?: string | null;
  is_default?: boolean | null;
  last_used?: string | null;
};

function normalizeSavedCards(payload: unknown): SavedCard[] {
  if (Array.isArray(payload)) return payload as SavedCard[];
  if (payload && typeof payload === "object") {
    const maybe = payload as any;
    if (Array.isArray(maybe.data)) return maybe.data as SavedCard[];
    if (Array.isArray(maybe.cards)) return maybe.cards as SavedCard[];
    if (Array.isArray(maybe.saved_cards)) return maybe.saved_cards as SavedCard[];
  }
  return [];
}

function formatExpiry(card: SavedCard) {
  const mm = card.expiry_month != null ? String(card.expiry_month).padStart(2, "0") : null;
  const yyRaw = card.expiry_year != null ? String(card.expiry_year) : null;
  const yy = yyRaw ? yyRaw.slice(-2) : null;
  return mm && yy ? `${mm}/${yy}` : null;
}

function formatLastUsed(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

const SavedCardsPage = () => {
  const { user, loading, unresolved, isGuest } = useAuth();
  const router = useRouter();
  const [loadingCards, setLoadingCards] = useState(false);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [busyCardId, setBusyCardId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    cardId: number | null;
    masked: string | null;
  }>({ open: false, cardId: null, masked: null });

  const SavedCardsSkeleton = ({ count = 6 }: { count?: number }) => {
    return (
      <Container className="py-10">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <div className="h-9 w-52 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: count }).map((_, idx) => (
            <Card key={idx} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="h-5 w-5 rounded bg-gray-200 animate-pulse flex-shrink-0" />
                    <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    );
  };

  useEffect(() => {
    if (isGuest) {
      router.push("/login?returnUrl=" + encodeURIComponent("/saved-cards"));
    }
  }, [isGuest, router]);

  const loadCards = async () => {
    if (!user) return;
    setLoadingCards(true);
    try {
      const data = await getSavedCards();
      setCards(normalizeSavedCards(data));
    } catch (e) {
      console.error("Error loading saved cards:", e);
      setCards([]);
      toast.error("Failed to load saved cards");
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSetDefault = async (cardId?: number) => {
    if (!cardId) return;
    setBusyCardId(cardId);
    try {
      await setDefaultSavedCard(cardId);
      toast.success("Default card updated");
      await loadCards();
    } catch (e) {
      console.error("Error setting default card:", e);
      toast.error("Failed to set default card");
    } finally {
      setBusyCardId(null);
    }
  };

  const openDeleteConfirm = (card: SavedCard) => {
    if (!card.id) return;
    setDeleteConfirm({
      open: true,
      cardId: card.id,
      masked: card.masked_card ?? null,
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ open: false, cardId: null, masked: null });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.cardId) return;
    const cardId = deleteConfirm.cardId;

    setBusyCardId(cardId);
    try {
      await deleteSavedCard(cardId);
      toast.success("Card removed");
      closeDeleteConfirm();
      await loadCards();
    } catch (e) {
      console.error("Error deleting saved card:", e);
      toast.error("Failed to remove card");
    } finally {
      setBusyCardId(null);
    }
  };

  const cardCountLabel = useMemo(() => {
    const n = cards.length;
    if (n === 0) return null;
    return `${n} saved ${n === 1 ? "card" : "cards"}`;
  }, [cards.length]);

  if (unresolved) {
    return <AuthRetryScreen />;
  }

  if (loading || loadingCards) {
    return <SavedCardsSkeleton />;
  }

  if (!user) return null;

  return (
    <Container className="py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Title className="!text-3xl">Saved Cards</Title>
          {cardCountLabel && <p className="text-sm text-gray-500 mt-1">{cardCountLabel}</p>}
        </div>
        <Button className="flex items-center gap-2" type="button">
          <PlusIcon className="h-4 w-4" />
          Add New Card
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-12">
          <CreditCardIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No saved cards</h3>
          <p className="text-gray-500 mb-6">Add a card to make checkout faster</p>
          <Button className="flex items-center gap-2" type="button">
            <PlusIcon className="h-4 w-4" />
            Add Card
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => {
            const expiry = formatExpiry(card);
            const lastUsed = formatLastUsed(card.last_used);
            const isDefault = Boolean(card.is_default);
            const key = card.id ?? index;

            return (
              <Card key={String(key)} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CreditCardIcon className="h-5 w-5 text-gray-700" />
                      <CardTitle className="text-lg">
                        {card.masked_card ? card.masked_card : "Saved card"}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDefault && (
                        <Badge variant="default" className="w-fit">
                          Default
                        </Badge>
                      )}
                      {!isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => handleSetDefault(card.id)}
                          disabled={busyCardId === card.id}
                          className="h-8 px-3"
                        >
                          Make Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => openDeleteConfirm(card)}
                        disabled={busyCardId === card.id}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        aria-label="Delete card"
                        title="Delete card"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    {card.card_type ? (
                      <span className="capitalize">{card.card_type}</span>
                    ) : (
                      <span>Card</span>
                    )}
                    {expiry ? <span> • Expires {expiry}</span> : null}
                  </p>
                  {lastUsed ? <p className="text-sm text-gray-500 mt-1">Last used {lastUsed}</p> : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={deleteConfirm.open}
        onOpenChange={(open) => {
          if (!open) closeDeleteConfirm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove saved card?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium text-foreground">
                {deleteConfirm.masked || "this card"}
              </span>
              ? This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDeleteConfirm} disabled={busyCardId != null}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmDelete}
              disabled={busyCardId != null}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default SavedCardsPage;

