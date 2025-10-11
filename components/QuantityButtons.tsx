import React from "react";
import { Button } from "./ui/button";
import { HiMinus, HiPlus } from "react-icons/hi2";
import toast from "react-hot-toast";
import useCartStore from "@/store";
import { Product } from "../store";
import { twMerge } from "tailwind-merge";

interface Props {
  product: Product;
  className?: string;
  borderStyle?: string;
}

const QuantityButtons = ({ product, className, borderStyle }: Props) => {
  const { addItem, removeItem, getItemCount } = useCartStore();
  const itemCount = getItemCount(product?.id);
  const isDiscounted = product?.pricing && product.pricing.discount_applied > 0;

  const handleRemoveProduct = async () => {
    try {
      await removeItem(product?.id);
      if (itemCount > 1) {
        toast.success("Quantity Decreased successfully!");
      } else {
        toast.success(`${product?.name?.substring(0, 12)} removed successfully!`);
      }
    } catch (error) {
      console.error('Failed to remove item from cart:', error);
      toast.error('Failed to update cart');
    }
  };
  return (
    <div
      className={twMerge(
        "flex items-center bg-gray-200 rounded-full border-2 border-dashed border-white shadow-lg relative",
        className
      )}
      style={{
        boxShadow: "0 0 10px rgba(0, 0, 0, 0.3)"
      }}
    >
      {/* Minus Button */}
      <button
        onClick={handleRemoveProduct}
        disabled={itemCount === 0}
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
          isDiscounted 
            ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        } ${itemCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <HiMinus className="w-3 h-3" />
      </button>
      
      {/* Quantity Display */}
      <span className={`font-bold text-sm px-2 ${
        isDiscounted ? 'text-gray-700' : 'text-gray-700'
      }`}>
        {itemCount}
      </span>
      
      {/* Plus Button */}
      <button
        onClick={async () => {
          try {
            await addItem(product);
            toast.success("Quantity increased successfully!");
          } catch (error) {
            console.error('Failed to add item to cart:', error);
            toast.error('Failed to update cart');
          }
        }}
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
          isDiscounted 
            ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }`}
      >
        <HiPlus className="w-3 h-3" />
      </button>
    </div>
  );
};

export default QuantityButtons;
