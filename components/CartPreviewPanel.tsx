"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import useCartStore from "@/store";
import PriceFormatter from "./PriceFormatter";
import QuantityButtons from "./QuantityButtons";
import toast from "react-hot-toast";
import EmptyCart from "./EmptyCart";

interface CartPreviewPanelProps {
  children: React.ReactNode;
}

const CartPreviewPanel = ({ children }: CartPreviewPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const cartStore = useCartStore();

  const handleDeleteProduct = (productId: string) => {
    cartStore.deleteCartProduct(productId);
    toast.success("Product removed from cart!");
  };

  const totalPrice = cartStore.getTotalPrice();
  const itemCount = cartStore.items.length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[450px] flex flex-col">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <ShoppingCart className="h-6 w-6" />
            Cart({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </SheetTitle>
        </SheetHeader>

        {cartStore.items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyCart />
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {cartStore.items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <Image
                    src={item.product.image_urls?.[0] || item.product.imageUrl || '/images/placeholder.png'}
                    alt={item.product.name}
                    width={80}
                    height={80}
                    className="rounded-md object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                      {item.product.name}
                    </h3>
                    <div className="text-gray-600 text-sm mb-2">
                      {item.product.pricing?.discount_applied > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                            {Math.round(item.product.pricing.discount_percentage)}% OFF
                          </span>
                          <PriceFormatter 
                            amount={item.product.pricing.final_price} 
                            className="text-red-600 font-semibold"
                          />
                          <PriceFormatter 
                            amount={item.product.pricing.base_price} 
                            className="line-through text-gray-400 text-xs"
                          />
                        </div>
                      ) : (
                        <PriceFormatter 
                          amount={item.product.pricing?.final_price || item.product.base_price || item.product.price} 
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <QuantityButtons
                        product={item.product}
                        className="text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProduct(item.product.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="mt-6 space-y-4">
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>
                    <PriceFormatter amount={cartStore.getSubTotalPrice()} />
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Discount</span>
                  <span>
                    <PriceFormatter 
                      amount={cartStore.items.reduce((total, item) => {
                        if (item.product.pricing?.discount_applied > 0) {
                          return total + (item.product.pricing.discount_applied * item.quantity);
                        }
                        return total;
                      }, 0)} 
                    />
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>
                    <PriceFormatter amount={totalPrice} />
                  </span>
                </div>
              </div>

              {/* Go to Cart Button */}
              <Link href="/cart" onClick={() => setIsOpen(false)}>
                <Button className="w-full mt-4 flex items-center justify-center gap-2">
                  Go to Checkout
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartPreviewPanel;
