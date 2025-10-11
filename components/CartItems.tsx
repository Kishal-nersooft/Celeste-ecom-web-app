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
  onResetCart: () => void;
  selectedLocation?: string;
  previewData?: {
    subtotal?: number;
    delivery_fee?: number;
    service_charge?: number;
    tax?: number;
    total?: number;
  } | null;
  loadingPreview?: boolean;
}

const CartItems: React.FC<CartItemsProps> = ({
  onCheckout,
  loadingCheckout,
  onResetCart,
  selectedLocation,
  previewData,
  loadingPreview
}) => {
  const cartStore = useCartStore();

  const handleDeleteProduct = (productId: number) => {
    cartStore.deleteCartProduct(productId);
    toast.success("Product deleted successfully!");
  };

  const subtotal = cartStore.getSubTotalPrice();
  const total = cartStore.getTotalPrice();
  const itemCount = cartStore.items.length;
  const isAddressSelected = selectedLocation && selectedLocation !== "Location";

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

        {/* Order Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Order Summary</h3>
            {loadingPreview && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Calculating fees...</span>
              </div>
            )}
            {!loadingPreview && previewData && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>Real fees loaded</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>
                <PriceFormatter amount={previewData?.subtotal || subtotal} />
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Discount</span>
              <span className="text-green-600">
                -<PriceFormatter amount={subtotal - (previewData?.subtotal || subtotal)} />
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Delivery Fee</span>
              <span>
                {loadingPreview ? (
                  <span className="text-gray-500">Calculating...</span>
                ) : (
                  <PriceFormatter amount={previewData?.delivery_fee || 0} />
                )}
              </span>
            </div>
            
            {previewData?.service_charge && previewData.service_charge > 0 && (
              <div className="flex justify-between text-sm">
                <span>Service Charge</span>
                <span>
                  <PriceFormatter amount={previewData.service_charge} />
                </span>
              </div>
            )}
            
            {previewData?.tax && previewData.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>
                  <PriceFormatter amount={previewData.tax} />
                </span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>
                {loadingPreview ? (
                  <span className="text-gray-500">Calculating...</span>
                ) : (
                  <PriceFormatter amount={previewData?.total || total} />
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            className="w-full"
            onClick={onCheckout}
            disabled={loadingCheckout || !isAddressSelected}
            size="lg"
          >
            {loadingCheckout ? "Processing..." : !isAddressSelected ? "Please Select Address" : "Proceed to Checkout"}
          </Button>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={onResetCart}
            size="sm"
          >
            Reset Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CartItems;
