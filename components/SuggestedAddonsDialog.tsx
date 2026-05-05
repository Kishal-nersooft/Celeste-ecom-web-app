"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPopularProducts } from "@/lib/api";
import { useLocation } from "@/contexts/LocationContext";
import { Product } from "@/store";
import ProductCard from "@/components/ProductCard";

type SuggestedAddonsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue?: () => void;
  title?: string;
  description?: string;
  limit?: number;
};

export default function SuggestedAddonsDialog({
  open,
  onOpenChange,
  onContinue,
  title = "Popular items you may like",
  description = "Add a few extras before checkout.",
  limit = 15,
}: SuggestedAddonsDialogProps) {
  const { deliveryType, defaultAddress, selectedStore } = useLocation();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const locationParams = useMemo(() => {
    let storeIds: number[] | undefined;
    let latitude: number | undefined;
    let longitude: number | undefined;

    if (deliveryType === "pickup") {
      if (selectedStore?.id) {
        storeIds = [parseInt(selectedStore.id.toString())];
      } else {
        storeIds = [1, 2, 3, 4];
      }
    } else {
      if (defaultAddress?.latitude && defaultAddress?.longitude) {
        latitude = parseFloat(defaultAddress.latitude);
        longitude = parseFloat(defaultAddress.longitude);
      }
    }

    return { storeIds, latitude, longitude };
  }, [deliveryType, defaultAddress?.latitude, defaultAddress?.longitude, selectedStore?.id]);

  useEffect(() => {
    if (!open) return;

    const fetch = async () => {
      try {
        setLoading(true);
        const result = await getPopularProducts(
          "trending",
          limit,
          undefined,
          undefined,
          1,
          true,
          true,
          false,
          true,
          true,
          locationParams.storeIds,
          locationParams.latitude,
          locationParams.longitude
        );
        setProducts(Array.isArray(result) ? result : []);
      } catch (e) {
        console.error("Failed to load popular items for suggestions:", e);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    void fetch();
  }, [open, limit, locationParams.latitude, locationParams.longitude, locationParams.storeIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base md:text-lg">{title}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">{description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading popular items...</div>
          ) : products.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">No popular items found.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {products.map((p) => (
                <div key={p?.id} className="w-full flex justify-center">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {onContinue && (
            <Button
              onClick={() => {
                onContinue();
              }}
              className="text-xs sm:text-sm"
            >
              Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

