"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPopularProducts } from "@/lib/api";
import { useLocation } from "@/contexts/LocationContext";
import { catalogueStockQuery } from "@/lib/catalogue-location";
import { excludeUnavailableProducts } from "@/lib/stock-utils";
import { Product } from "@/store";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

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
  const { deliveryType, defaultAddress, selectedStore, isLocationLoading } = useLocation();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const stockQuery = catalogueStockQuery({
    deliveryType,
    isLocationLoading,
    defaultAddress,
    selectedStore,
  });

  useEffect(() => {
    if (!open || !stockQuery.ready) return;

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
          stockQuery.storeIds,
          stockQuery.latitude,
          stockQuery.longitude
        );
        setProducts(excludeUnavailableProducts(Array.isArray(result) ? result : []));
      } catch (e) {
        console.error("Failed to load popular items for suggestions:", e);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    void fetch();
  }, [open, limit, stockQuery.ready, stockQuery.latitude, stockQuery.longitude, stockQuery.storeIds?.[0]]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base md:text-lg">{title}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">{description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pt-1.5 pl-1.5 pr-1">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: limit }).map((_, idx) => (
                <div key={idx} className="w-full flex justify-center">
                  <ProductCardSkeleton />
                </div>
              ))}
            </div>
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

