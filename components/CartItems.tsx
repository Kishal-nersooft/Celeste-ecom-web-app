"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";
import useCartStore from "@/store";
import PriceFormatter from "./PriceFormatter";
import QuantityButtons from "./QuantityButtons";
import toast from "react-hot-toast";

interface CartItemsProps {
  onCheckout: () => void;
  loadingCheckout: boolean;
  selectedLocation?: string;
  // Removed preview data props - cart shows only local subtotal
}

const CartItems: React.FC<CartItemsProps> = ({
  onCheckout,
  loadingCheckout,
  selectedLocation
}) => {
  const cartStore = useCartStore();

  // Removed preview data debug - cart shows only local subtotal

  const handleDeleteProduct = (productId: number) => {
    cartStore.deleteCartProduct(productId);
    toast.success("Product deleted successfully!");
  };

  const subtotal = cartStore.getSubTotalPrice();
  const total = cartStore.getTotalPrice();
  const itemCount = cartStore.items.length;
  const isAddressSelected = selectedLocation && selectedLocation !== "Location";
  // Removed preview data check - cart shows only local subtotal

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Your Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cart Items */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {cartStore.items.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center gap-4 p-3 border rounded-lg hover:shadow-sm transition-shadow"
            >
              <Image
                src={(item.product.image_urls?.[0] || item.product.imageUrl) as string}
                alt={item.product.name || 'Product image'}
                width={80}
                height={80}
                className="rounded-md object-cover flex-shrink-0"
                onError={(e) => {
                  console.error('Image failed to load:', e);
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                  {item.product.name}
                </h3>
                <p className="text-gray-600 text-sm mb-2">
                  <PriceFormatter amount={item.product.pricing?.final_price || item.product.base_price || item.product.price} />
                </p>
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

        <Separator />

        {/* Order Summary - Local Only */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Order Summary</h3>
            <div className="text-sm text-gray-500">
              Delivery fees calculated at checkout
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>
                <PriceFormatter amount={subtotal} />
              </span>
            </div>
            
            {/* Delivery fees, service charges, and tax calculated at checkout */}
            
            <Separator />
            
            <div className="flex justify-between font-semibold text-lg">
              <span>Subtotal</span>
              <span>
                <PriceFormatter amount={total} />
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isAddressSelected && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                Please select a delivery address to see accurate pricing and proceed to checkout.
              </p>
            </div>
          )}
          
          <Button
            className="w-full"
            onClick={onCheckout}
            disabled={loadingCheckout || !isAddressSelected}
            size="lg"
          >
            {loadingCheckout 
              ? "Processing..." 
              : !isAddressSelected 
                ? "Please Select Address" 
                : "Proceed to Checkout"
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CartItems;
