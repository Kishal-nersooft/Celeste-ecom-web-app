"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import toast from "react-hot-toast";
import useCartStore from "@/store";
import { Product } from "../store";
import { getMaxAvailableQuantity } from "@/lib/stock-utils";
import { twMerge } from "tailwind-merge";

interface Props {
  product: Product;
  className?: string;
  borderStyle?: string;
  onQuantityChange?: () => void;
  /** When true, sync cart changes to backend immediately (no debounce). */
  immediateSync?: boolean;
  size?: "sm" | "md";
  /** Slide the current quantity into view the first time this control appears. */
  rollOnMount?: boolean;
  /** Open the minus and plus controls as soon as this mounts, such as right after add. */
  startExpanded?: boolean;
  /** Keep minus and plus visible. Used in the cart preview and on checkout. */
  alwaysExpanded?: boolean;
}

const rollVariants = {
  enter: (direction: number) => ({
    y: direction >= 0 ? 14 : -14,
    opacity: 0,
  }),
  center: { y: 0, opacity: 1 },
  exit: (direction: number) => ({
    y: direction >= 0 ? -14 : 14,
    opacity: 0,
  }),
};

const sizeStyles = {
  sm: {
    side: 28,
    icon: "h-3.5 w-3.5",
    circle: "h-6 w-6",
    number: "h-4 min-w-4 text-[13px]",
    shell: "h-7",
  },
  md: {
    side: 32,
    icon: "h-4 w-4",
    circle: "h-7 w-7",
    number: "h-[18px] min-w-[18px] text-sm",
    shell: "h-8",
  },
} as const;

function RollingQuantity({
  value,
  rollOnMount,
  className,
}: {
  value: number;
  rollOnMount?: boolean;
  className?: string;
}) {
  const previous = useRef(value);
  const directionRef = useRef(rollOnMount ? 1 : 0);

  if (value !== previous.current) {
    directionRef.current = value > previous.current ? 1 : -1;
    previous.current = value;
  }

  return (
    <span
      className={twMerge(
        "relative inline-grid place-items-center overflow-hidden",
        className
      )}
    >
      <AnimatePresence
        mode="popLayout"
        initial={Boolean(rollOnMount)}
        custom={directionRef.current}
      >
        <motion.span
          key={value}
          custom={directionRef.current}
          variants={rollVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="col-start-1 row-start-1 flex items-center justify-center font-semibold tabular-nums leading-none text-black"
          aria-live="polite"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const capRequested = new Map<number, number>();

const QuantityButtons = ({
  product,
  className,
  onQuantityChange,
  immediateSync,
  size = "md",
  rollOnMount = false,
  startExpanded = false,
  alwaysExpanded = false,
}: Props) => {
  const { addItem, removeItem, updateItemQuantity, getItemCount, mergeProductInventory } = useCartStore();
  const liveCartProduct = useCartStore((state) =>
    product?.id
      ? state.items.find((item) => item?.product?.id === product.id)?.product
      : undefined
  );
  const stockProduct =
    getMaxAvailableQuantity(product) != null ? product : liveCartProduct ?? product;
  const itemCount = getItemCount(product?.id);
  const maxAvailable = getMaxAvailableQuantity(stockProduct);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localItemCount, setLocalItemCount] = useState(itemCount);
  const [expanded, setExpanded] = useState(alwaysExpanded);
  const rootRef = useRef<HTMLDivElement>(null);
  const styles = sizeStyles[size];
  const atMax = maxAvailable != null && localItemCount >= maxAvailable;

  const notifyStockLimit = () => {
    if (maxAvailable == null || !product?.id) return;
    toast.error(`Stock limit reached. Only ${maxAvailable} available.`, {
      id: `stock-limit-${product.id}`,
    });
  };

  useEffect(() => {
    setLocalItemCount(itemCount);
  }, [itemCount]);

  useEffect(() => {
    if (!product?.id || maxAvailable == null) return;
    mergeProductInventory(stockProduct);
    if (itemCount <= maxAvailable) {
      if (capRequested.get(product.id) === maxAvailable) {
        capRequested.delete(product.id);
      }
      return;
    }
    if (capRequested.get(product.id) === maxAvailable) return;
    capRequested.set(product.id, maxAvailable);
    void updateItemQuantity(product.id, maxAvailable, { immediateSync }).then(() => {
      onQuantityChange?.();
    });
    // Cap from the inventory on this product. Callback identity must not retrigger the sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, maxAvailable, itemCount, immediateSync]);

  useEffect(() => {
    if (!startExpanded || alwaysExpanded) return;
    const frame = requestAnimationFrame(() => setExpanded(true));
    return () => cancelAnimationFrame(frame);
  }, [startExpanded, alwaysExpanded]);

  useEffect(() => {
    if (!expanded || alwaysExpanded) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setExpanded(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [expanded, alwaysExpanded]);

  const finish = () => {
    setTimeout(() => setIsProcessing(false), 200);
  };

  const openEditor = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setExpanded(true);
  };

  const handleRemoveProduct = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isProcessing || itemCount === 0) return;

    setIsProcessing(true);
    const newQuantity = Math.max(0, itemCount - 1);
    setLocalItemCount(newQuantity);

    try {
      if (newQuantity === 0) {
        await removeItem(product?.id, { immediateSync });
      } else {
        await updateItemQuantity(product?.id, newQuantity, { immediateSync });
      }
      onQuantityChange?.();
    } catch (error) {
      console.error("Failed to remove item from cart:", error);
      toast.error("Failed to update cart");
      setLocalItemCount(itemCount);
    } finally {
      finish();
    }
  };

  const handleAddProduct = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (maxAvailable != null && (localItemCount >= maxAvailable || itemCount >= maxAvailable)) {
      notifyStockLimit();
      return;
    }
    if (isProcessing) return;

    setIsProcessing(true);
    const newQuantity = itemCount + 1;
    setLocalItemCount(newQuantity);
    if (maxAvailable != null && newQuantity >= maxAvailable) {
      notifyStockLimit();
    }

    try {
      if (itemCount === 0) {
        await addItem(product, { immediateSync });
      } else {
        await updateItemQuantity(product?.id, newQuantity, { immediateSync });
      }
      onQuantityChange?.();
    } catch (error) {
      console.error("Failed to add item to cart:", error);
      toast.error("Failed to update cart");
      setLocalItemCount(itemCount);
    } finally {
      finish();
    }
  };

  return (
    <div
      ref={rootRef}
      className={twMerge("inline-flex", className)}
      onPointerLeave={(event) => {
        if (alwaysExpanded || !expanded || event.pointerType === "touch") return;
        setExpanded(false);
      }}
    >
      <div
        className={twMerge(
          "inline-flex items-center overflow-hidden rounded-full bg-white shadow-[0_1px_2px_rgba(16,24,40,0.08),0_1px_4px_rgba(16,24,40,0.12)]",
          styles.shell
        )}
      >
        <div
          className="overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            width: expanded ? styles.side : 0,
            pointerEvents: expanded ? "auto" : "none",
          }}
        >
          <button
            type="button"
            onClick={handleRemoveProduct}
            disabled={!expanded || itemCount === 0 || isProcessing}
            aria-hidden={!expanded}
            tabIndex={expanded ? 0 : -1}
            aria-label="Decrease quantity"
            className="group/step flex h-full items-center justify-center text-black focus-visible:outline-none disabled:pointer-events-none disabled:text-gray-300"
            style={{ width: styles.side }}
          >
            <span
              className={twMerge(
                "flex items-center justify-center rounded-full bg-transparent transition-colors group-hover/step:bg-gray-200 group-active/step:bg-gray-300",
                styles.circle
              )}
            >
              <Minus className={styles.icon} strokeWidth={2.5} />
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={expanded ? (event) => {
            event.preventDefault();
            event.stopPropagation();
          } : openEditor}
          aria-label={expanded ? `Quantity ${localItemCount}` : `Quantity ${localItemCount}. Change quantity`}
          title={expanded ? undefined : "Change quantity"}
          className="flex h-full min-w-7 items-center justify-center px-1.5 text-black focus-visible:outline-none"
        >
          <RollingQuantity
            value={localItemCount}
            rollOnMount={rollOnMount}
            className={styles.number}
          />
        </button>

        <div
          className="overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            width: expanded ? styles.side : 0,
            pointerEvents: expanded ? "auto" : "none",
          }}
        >
          <button
            type="button"
            onClick={handleAddProduct}
            disabled={!expanded || (isProcessing && !atMax)}
            aria-disabled={atMax || undefined}
            aria-hidden={!expanded}
            tabIndex={expanded ? 0 : -1}
            aria-label="Increase quantity"
            title={atMax ? "Stock limit reached" : "Increase quantity"}
            className={twMerge(
              "group/step flex h-full items-center justify-center text-black focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:text-gray-300",
              atMax && "cursor-not-allowed text-gray-300"
            )}
            style={{ width: styles.side }}
          >
            <span
              className={twMerge(
                "flex items-center justify-center rounded-full bg-transparent transition-colors",
                !atMax && "group-hover/step:bg-gray-200 group-active/step:bg-gray-300",
                styles.circle
              )}
            >
              <Plus className={styles.icon} strokeWidth={2.5} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuantityButtons;
