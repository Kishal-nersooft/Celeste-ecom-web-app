"use client";
import { Product } from "../store";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { twMerge } from "tailwind-merge";
import PriceFormatter from "./PriceFormatter";
import { Button } from "./ui/button";
import useCartStore from "@/store";
import { useOptimizedCart } from "@/hooks/useOptimizedCart";
import QuantityButtons from "./QuantityButtons";
import { Plus } from "lucide-react";

interface Props {
  product: Product;
  className?: string;
}

const AddToCartButton = ({ product, className }: Props) => {
  const { addItem, getItemCount } = useOptimizedCart();
  const [isClient, setIsClient] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const itemCount = getItemCount(product?.id);
  const isDiscounted = product?.pricing && product.pricing.discount_applied > 0;

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <div className="h-8">
      {itemCount ? (
        <div className="text-xs">
          <div className="flex items-center justify-center">
            <QuantityButtons product={product} />
          </div>
        </div>
      ) : (
        <Button
          onClick={async () => {
            setIsAdding(true);
            try {
              await addItem(product);
              toast.success(
                `${product?.name?.substring(0, 12)}... added successfully!`
              );
            } catch (error) {
              console.error("Failed to add item to cart:", error);
              toast.error("Failed to add item to cart");
            } finally {
              setTimeout(() => setIsAdding(false), 1000);
            }
          }}
          disabled={isAdding}
          className={twMerge(
            "rounded-full p-1 h-7 w-7 flex items-center justify-center border border-gray-300 bg-white shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
        >
          {isAdding ? "..." : <Plus className="h-3 w-3 text-black" />}
        </Button>
      )}
    </div>
  );
};

export default AddToCartButton;
