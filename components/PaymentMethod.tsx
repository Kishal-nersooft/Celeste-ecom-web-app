"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle, Loader2 } from "lucide-react";
import { getSavedCards } from "@/lib/api";
import toast from "react-hot-toast";

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
  onSaveCardChange?: (save: boolean) => void;
  saveCard?: boolean;
}

const PaymentMethod: React.FC<PaymentMethodProps> = ({
  selectedCardId,
  onCardSelect,
  onSaveCardChange,
  saveCard = false,
}) => {
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
            <CreditCard className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : savedCards.length > 0 ? (
          <div className="space-y-3">
            {savedCards.map((card) => (
              <div
                key={card.id}
                onClick={() => {
                  if (onCardSelect) {
                    onCardSelect(card.id);
                  }
                }}
                className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedCardId === card.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                <div>
                    <div className="font-semibold text-sm text-gray-900">
                      {card.masked_card} {card.is_default && '(Default)'}
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
            
            <div
              onClick={() => {
                if (onCardSelect) {
                  onCardSelect(null);
                }
              }}
              className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                selectedCardId === null
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
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

            {selectedCardId === null && onSaveCardChange && (
              <label className="flex items-center space-x-2 p-3 cursor-pointer hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(e) => onSaveCardChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Save this card for future purchases
                </span>
              </label>
            )}
          </div>
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
            {onSaveCardChange && (
              <label className="flex items-center space-x-2 p-3 cursor-pointer hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(e) => onSaveCardChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Save this card for future purchases
                </span>
              </label>
            )}
          </div>
        )}
        </CardContent>
      </Card>
  );
};

export default PaymentMethod;
