"use client";
import { Product } from "../store";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { twMerge } from "tailwind-merge";
import PriceFormatter from "./PriceFormatter";
import { Button } from "./ui/button";
import useCartStore from "@/store";
import QuantityButtons from "./QuantityButtons";
import { Plus } from "lucide-react";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";

interface Props {
  product: Product;
  className?: string;
}

const AddToCartButton = ({ product, className }: Props) => {
  const { addItem, getItemCount } = useCartStore();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const itemCount = product?.id ? getItemCount(product.id) : 0;
  const isDiscounted = product?.pricing && product.pricing.discount_applied > 0;

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  // Check inventory status
  const inventory = product?.inventory;
  const canOrder = inventory?.can_order;
  const inStock = inventory?.in_stock;

  // Determine what to show based on new logic
  const getButtonContent = () => {
    // If no inventory data is available, assume product is available
    if (inventory === null || inventory === undefined) {
      if (itemCount > 0) {
        return null; // Show quantity buttons
      } else {
        return "add"; // Show add button
      }
    }

    // If inventory data exists, check stock status
    if (inStock === false) {
      return "Out of Stock";
    } else if (canOrder === false) {
      return "Unavailable";
    } else if (itemCount > 0) {
      return null; // Show quantity buttons
    } else {
      return "add"; // Show add button
    }
  };

  const buttonContent = getButtonContent();

  return (
    <div className="h-8 flex items-center justify-start">
      {buttonContent === null ? (
        // Show quantity buttons when item is in cart
        <div className="text-xs">
          <div className="flex items-center justify-start">
            <QuantityButtons product={product} />
          </div>
        </div>
      ) : buttonContent === "add" ? (
        // Show add button when available
        <Button
          onClick={async () => {
            if (isAdding) return;
            
            // Check if user is logged in
            if (!user && !authLoading) {
              toast.error("Please login to add items to cart");
              router.push("/sign-in");
              return;
            }
            
            setIsAdding(true);
            
            try {
              if (product) {
                await addItem(product);
                toast.success(`${product?.name?.substring(0, 12)}... added!`);
              }
            } catch (error) {
              console.error("Failed to add item to cart:", error);
              toast.error("Failed to add item to cart");
            } finally {
              setTimeout(() => setIsAdding(false), 300);
            }
          }}
          disabled={isAdding || authLoading}
          title="Add to cart"
          className={twMerge(
            "rounded-full p-1 h-7 w-7 flex items-center justify-center border border-gray-300 bg-white shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
        >
          {isAdding ? "..." : <Plus className="h-3 w-3 text-black" />}
        </Button>
      ) : (
        // Show unavailable/out of stock text with new styling
        <div className={twMerge(
          "h-7 px-2 flex items-center justify-center text-xs font-bold text-red-600 bg-white border border-red-200 rounded-sm gap-1",
          className
        )}>
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span>{buttonContent}</span>
        </div>
      )}
    </div>
  );
};

export default AddToCartButton;
