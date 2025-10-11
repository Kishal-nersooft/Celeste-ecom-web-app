"use client";
import useCartStore from "@/store";
import { useEffect, useState } from "react";
import { MdOutlineShoppingCart } from "react-icons/md";

const CartIcon = () => {
  const [isClient, setIsClient] = useState(false);
  const groupedItems = useCartStore((state) => state.getGroupedItems());
  useEffect(() => {
    setIsClient(true);
  }, []);
  if (!isClient) {
    return null;
  }
  const itemCount = groupedItems?.length || 0;

  return (
    <div 
      className="relative flex items-center justify-center w-12 h-12 border border-gray-200 rounded-md shadow-md hover:shadow-none hoverEffect bg-white cursor-pointer"
      onClick={() => console.log("CartIcon clicked!")}
    >
      <MdOutlineShoppingCart className="text-2xl text-darkBlue" />
      
      {/* Item count badge */}
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </div>
  );
};

export default CartIcon;
