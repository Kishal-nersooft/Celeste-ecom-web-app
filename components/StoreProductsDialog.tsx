"use client";

import React from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import QuantityButtons from "@/components/QuantityButtons";
import useCartStore from "@/store";

type StoreProductsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: any | null;
  onQuantityChange?: () => void;
};

function resolveLine(item: any, cartItems: { product: any; quantity: number }[]) {
  const cartItem = cartItems.find((ci) => ci?.product?.id === item?.product_id);
  const beProduct = item?.product;
  const cartProduct = cartItem?.product;
  const productName = beProduct?.name || cartProduct?.name || `Product ${item?.product_id}`;
  const imageUrl =
    beProduct?.image_urls?.[0] ||
    beProduct?.imageUrl ||
    cartProduct?.image_urls?.[0] ||
    cartProduct?.imageUrl;
  const hasImage =
    typeof imageUrl === "string" && imageUrl.trim() !== "" && imageUrl.startsWith("http");
  const qty = cartItem?.quantity ?? item?.quantity ?? 0;
  const unitPrice = cartItem
    ? (cartProduct?.pricing?.final_price ?? cartProduct?.base_price ?? cartProduct?.price ?? 0)
    : (item?.final_price ?? item?.base_price ?? 0);
  const lineTotal =
    cartItem || item?.total_price == null ? unitPrice * qty : item.total_price;

  return { cartProduct, productName, imageUrl, hasImage, qty, unitPrice, lineTotal };
}

const StoreProductsDialog: React.FC<StoreProductsDialogProps> = ({
  open,
  onOpenChange,
  store,
  onQuantityChange,
}) => {
  const cartItems = useCartStore((state) => state.items);
  const items = store?.items || [];
  const lines = items.map((item: any) => resolveLine(item, cartItems));
  const itemCount = lines.length;
  const subtotal = lines.reduce((sum: number, line: { lineTotal: number }) => sum + line.lineTotal, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[60] max-h-[85vh] max-w-[92vw] gap-4 overflow-hidden rounded-2xl p-5 sm:max-w-md">
        <DialogHeader className="space-y-1 pr-6 text-left">
          <DialogTitle className="text-base font-semibold leading-snug sm:text-lg">
            {store?.store_name || "Store"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {itemCount} {itemCount === 1 ? "product" : "products"} in this store
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(60vh,420px)] space-y-2 overflow-y-auto pr-0.5">
          {lines.map((line: ReturnType<typeof resolveLine>, idx: number) => {
            const item = items[idx];
            return (
              <div
                key={`${store?.store_id ?? "store"}-${item?.product_id ?? item?.id ?? idx}`}
                className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-2.5"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-100">
                  {line.hasImage ? (
                    <Image
                      src={line.imageUrl as string}
                      alt={line.productName}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-4 w-4 text-neutral-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{line.productName}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Qty {line.qty} · LKR {line.unitPrice.toFixed(2)} each
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-neutral-900">
                    LKR {line.lineTotal.toFixed(2)}
                  </p>
                </div>
                {line.cartProduct ? (
                  <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
                    <QuantityButtons
                      product={line.cartProduct}
                      className="text-[10px] sm:text-xs"
                      onQuantityChange={onQuantityChange}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
          {itemCount === 0 && (
            <p className="py-6 text-center text-sm text-neutral-500">No products in this store.</p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-sm font-semibold">
          <span>Subtotal</span>
          <span className="tabular-nums">LKR {subtotal.toFixed(2)}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoreProductsDialog;
