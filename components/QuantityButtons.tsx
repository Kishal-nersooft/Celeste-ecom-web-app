import React, { useState } from "react";
import { Button } from "./ui/button";
import { HiMinus, HiPlus } from "react-icons/hi2";
import toast from "react-hot-toast";
import useCartStore from "@/store";
import { Product } from "../store";
import { twMerge } from "tailwind-merge";
// Removed stock validation imports - validation now happens only at checkout

interface Props {
  product: Product;
  className?: string;
  borderStyle?: string;
  onQuantityChange?: () => void;
}

const QuantityButtons = ({ product, className, borderStyle, onQuantityChange }: Props) => {
  const { addItem, removeItem, updateItemQuantity, getItemCount } = useCartStore();
  const itemCount = getItemCount(product?.id);
  const isDiscounted = product?.pricing && product.pricing.discount_applied > 0;
  const [isProcessing, setIsProcessing] = useState(false);
  const [localItemCount, setLocalItemCount] = useState(0);
  
  // Update local count when cart count changes
  React.useEffect(() => {
    setLocalItemCount(itemCount);
  }, [itemCount]);
  
  // Removed stock validation - users can add any quantity, validation happens at checkout

  const handleRemoveProduct = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    const newQuantity = Math.max(0, itemCount - 1);
    setLocalItemCount(newQuantity);
    
    try {
      if (newQuantity === 0) {
        // Use removeItem for complete removal
        await removeItem(product?.id);
        toast.success(`${product?.name?.substring(0, 12)} removed successfully!`);
      } else {
        // Use updateItemQuantity for quantity changes
        await updateItemQuantity(product?.id, newQuantity);
        toast.success("Quantity Decreased successfully!");
      }
      // Call the quantity change callback
      if (onQuantityChange) {
        onQuantityChange();
      }
    } catch (error) {
      console.error('Failed to remove item from cart:', error);
      toast.error('Failed to update cart');
      // Revert local count on error
      setLocalItemCount(itemCount);
    } finally {
      setTimeout(() => setIsProcessing(false), 200);
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
        disabled={itemCount === 0 || isProcessing}
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
          isDiscounted 
            ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        } ${(itemCount === 0 || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          // Prevent multiple rapid clicks
          if (isProcessing) {
            return;
          }
          
          setIsProcessing(true);
          const newQuantity = itemCount + 1;
          
          // Update local count immediately for instant UI feedback
          setLocalItemCount(newQuantity);
          
          try {
            if (itemCount === 0) {
              // Use addItem for adding new items
              await addItem(product);
            } else {
              // Use updateItemQuantity for existing items
              await updateItemQuantity(product?.id, newQuantity);
            }
            toast.success("Quantity increased successfully!");
            // Call the quantity change callback
            if (onQuantityChange) {
              onQuantityChange();
            }
          } catch (error) {
            console.error('Failed to add item to cart:', error);
            toast.error('Failed to update cart');
            // Revert local count on error
            setLocalItemCount(itemCount);
          } finally {
            setTimeout(() => setIsProcessing(false), 200);
          }
        }}
        disabled={isProcessing}
        title="Increase quantity"
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
          isDiscounted 
            ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <HiPlus className="w-3 h-3" />
      </button>
    </div>
  );
};

export default QuantityButtons;
