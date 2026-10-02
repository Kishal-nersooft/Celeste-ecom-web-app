"use client";
import { Product } from "../store";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { twMerge } from "tailwind-merge";
import useCartStore from "@/store";
import QuantityButtons from "./QuantityButtons";
import { Plus, ShoppingCart } from "lucide-react";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { getMaxAvailableQuantity } from "@/lib/stock-utils";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  product: Product;
  className?: string;
  variant?: "icon" | "label";
}

const spring = { type: "spring" as const, stiffness: 520, damping: 32 };

const AddToCartButton = ({ product, className, variant = "icon" }: Props) => {
  const { addItem, getItemCount } = useCartStore();
  const { user, loading: authLoading, unresolved, error: authError } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [expandAfterAdd, setExpandAfterAdd] = useState(false);
  const itemCount = product?.id ? getItemCount(product.id) : 0;

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  const inventory = product?.inventory;
  const canOrder = inventory?.can_order;
  const inStock = inventory?.in_stock;
  const maxAvailable = getMaxAvailableQuantity(product);
  const atMax = maxAvailable != null && itemCount >= maxAvailable;

  const getButtonContent = () => {
    if (inventory === null || inventory === undefined) {
      if (itemCount > 0) {
        return null;
      } else {
        return "add";
      }
    }

    if (inStock === false) {
      return "Out of Stock";
    } else if (canOrder === false) {
      return "Unavailable";
    } else if (itemCount > 0) {
      return null;
    } else {
      return "add";
    }
  };

  const buttonContent = getButtonContent();
  const isLabelVariant = variant === "label";

  const handleAdd = async () => {
    if (isAdding || atMax) return;

    if (!user && !authLoading) {
      if (unresolved) {
        toast.error(authError || "Couldn't verify your sign-in. Please retry.");
        return;
      }
      toast.error("Please login to add items to cart");
      router.push("/login?returnUrl=" + encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/"));
      return;
    }

    setIsAdding(true);
    setExpandAfterAdd(true);

    try {
      if (product) {
        await addItem(product);
      }
    } catch (error) {
      console.error("Failed to add item to cart:", error);
      toast.error("Failed to add item to cart");
      setExpandAfterAdd(false);
    } finally {
      setTimeout(() => setIsAdding(false), 300);
    }
  };

  return (
    <div
      className={twMerge(
        isLabelVariant ? "flex items-center justify-start" : "flex h-7 items-center justify-start",
        className
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {buttonContent === null ? (
          <motion.div
            key="quantity"
            initial={
              isLabelVariant
                ? { opacity: 0, y: 8, scale: 0.96 }
                : { opacity: 0, scale: 0.72 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              isLabelVariant
                ? { opacity: 0, y: -6, scale: 0.96 }
                : { opacity: 0, scale: 0.72 }
            }
            transition={spring}
            style={{ transformOrigin: isLabelVariant ? "left center" : "right center" }}
          >
            <QuantityButtons
              product={product}
              size={isLabelVariant ? "md" : "sm"}
              rollOnMount
              startExpanded={expandAfterAdd}
            />
          </motion.div>
        ) : buttonContent === "add" ? (
          <motion.button
            key="add"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void handleAdd();
            }}
            disabled={isAdding || authLoading || atMax}
            title="Add to cart"
            whileTap={{ scale: isLabelVariant ? 0.97 : 0.88 }}
            initial={
              isLabelVariant
                ? { opacity: 0, y: 8, scale: 0.96 }
                : { opacity: 0, scale: 0.6, rotate: -20 }
            }
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={
              isLabelVariant
                ? { opacity: 0, y: -6, scale: 0.96 }
                : { opacity: 0, scale: 0.5, rotate: 70 }
            }
            transition={spring}
            style={{ transformOrigin: isLabelVariant ? "left center" : "center" }}
            className={
              isLabelVariant
                ? "inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black shadow-[0_1px_2px_rgba(16,24,40,0.08),0_1px_4px_rgba(16,24,40,0.12)] transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                : "flex h-7 w-7 items-center justify-center rounded-full bg-white text-black shadow-[0_1px_2px_rgba(16,24,40,0.08),0_1px_4px_rgba(16,24,40,0.12)] transition-colors hover:bg-gray-200 active:bg-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
            }
          >
            {isLabelVariant ? (
              <>
                <ShoppingCart className="h-4 w-4 shrink-0" />
                <span>{isAdding ? "Adding..." : "Add to cart"}</span>
              </>
            ) : (
              <motion.span
                className="flex items-center justify-center"
                animate={isAdding ? { rotate: 90, scale: 0.86 } : { rotate: 0, scale: 1 }}
                transition={spring}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
              </motion.span>
            )}
          </motion.button>
        ) : (
          <motion.div
            key="unavailable"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={spring}
            className="flex h-7 items-center justify-center gap-1 rounded-full border border-red-200 bg-white px-2.5 text-xs font-semibold text-red-600"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            <span>{buttonContent}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddToCartButton;
