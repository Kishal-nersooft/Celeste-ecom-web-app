"use client";

import { ArrowRight } from "lucide-react";
import CartPreviewPanel from "./CartPreviewPanel";
import useCartStore from "@/store";
import { useMobileGoToCartBarVisible } from "@/hooks/useMobileGoToCartBar";

const CartGlyph = () => (
  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h8M17 18a2 2 0 100 4 2 2 0 000-4zM9 18a2 2 0 100 4 2 2 0 000-4z"
    />
  </svg>
);

export function MobileGoToCartBar() {
  const visible = useMobileGoToCartBarVisible();
  const itemCount = useCartStore((state) => state.items.length);

  if (!visible) return null;

  return (
    <>
      <div className="lg:hidden h-20 shrink-0" aria-hidden="true" />
      <div className="lg:hidden pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <CartPreviewPanel>
          <button
            type="button"
            className="pointer-events-auto flex w-full items-center gap-3 rounded-xl bg-black px-4 py-3 text-white shadow-lg"
            aria-label="Go to cart"
          >
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <CartGlyph />
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-between gap-2 text-sm font-semibold">
              Go to Cart
              <ArrowRight className="h-4 w-4 shrink-0" />
            </span>
          </button>
        </CartPreviewPanel>
      </div>
    </>
  );
}
