"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  ShoppingCart, 
  Truck, 
  Receipt,
  ChevronDown,
  ChevronUp,
  CheckCircle
} from "lucide-react";
import QuantityButtons from "./QuantityButtons";
import useCartStore from "@/store";

interface OrderSummaryProps {
  previewData: any;
  loading?: boolean;
  cartItems: any[];
  localSubtotal: number;
  onCheckout: () => void;
  loadingCheckout: boolean;
  onQuantityChange?: () => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  previewData,
  loading = false,
  cartItems = [],
  localSubtotal,
  onCheckout,
  loadingCheckout,
  onQuantityChange
}) => {
  const [isCartExpanded, setIsCartExpanded] = useState(true);
  const cartStore = useCartStore();
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
            <div className="text-center text-xs sm:text-sm text-gray-500">
              Calculating pricing...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!previewData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">LKR {localSubtotal.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Checkout Button */}
            <button
              onClick={onCheckout}
              disabled={loadingCheckout || cartItems.length === 0}
              className="w-full bg-blue-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
            >
              {loadingCheckout ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                `Place Order - LKR ${localSubtotal.toFixed(2)}`
              )}
            </button>
            
            {cartItems.length === 0 && (
              <p className="text-center text-gray-500 text-xs sm:text-sm">
                Your cart is empty. Add some products to continue.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract data from the new backend structure
  const backendData = previewData?.data || previewData;
  const {
    fulfillment_mode = 'delivery',
    fulfillable_stores = [],
    overall_total = 0,
    unavailable_items = []
  } = backendData;

  // Get the first fulfillable store (primary store)
  const primaryStore = fulfillable_stores[0] || {};
  const {
    store_name = 'Store',
    store_id = null,
    subtotal = 0,
    delivery_cost = 0,
    total = 0,
    items = []
  } = primaryStore;

  // Calculate totals from the new structure
  const subtotal_before_discounts = subtotal;
  const subtotal_after_discounts = subtotal;
  const total_discounts_applied = 0; // Will be calculated from items if needed
  const final_total = total || overall_total;
  const delivery_charge = delivery_cost;

  // Get items from backend data for display
  const backendItems = items || [];

  const isMultiStore = (fulfillable_stores?.length || 0) > 1;


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
          <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Store Information */}
        {store_name && store_name !== 'Store' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Truck className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
              <span className="text-xs sm:text-sm font-medium text-blue-800">
                Fulfilled by: {store_name}
              </span>
            </div>
            <div className="text-[10px] sm:text-xs text-blue-600 mt-1">
              {fulfillment_mode === 'delivery' ? 'Delivery' : 'Pickup'} • Store ID: {store_id}
            </div>
          </div>
        )}

        {/* Unavailable Items - Detailed list */}
        {unavailable_items && unavailable_items.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 sm:h-5 sm:w-5 text-red-600">⚠️</div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-red-800">Some items unavailable</p>
                <p className="text-[10px] sm:text-xs text-red-600">
                  {unavailable_items.length} item{unavailable_items.length !== 1 ? 's' : ''} not available for order
                </p>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {unavailable_items.map((ui: any, idx: number) => (
                <div key={`unavail-${ui.product_id ?? idx}`} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded border flex items-center justify-center overflow-hidden">
                    {ui.image_url ? (
                      <Image src={ui.image_url} alt={ui.name || `#${ui.product_id}`} width={32} height={32} className="object-cover w-full h-full sm:w-10 sm:h-10" />
                    ) : (
                      <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{ui.name || `Product ${ui.product_id}`}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500">Requested: {ui.requested_quantity || ui.quantity || 0}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items Section - Multi-store grid or single list */}
        <div className="space-y-2 sm:space-y-3">
          {isMultiStore ? (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 text-xs sm:text-sm">Items by store</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                {fulfillable_stores.map((store: any, sIdx: number) => (
                  <div key={store.store_id ?? `store-${sIdx}`} className="border rounded-lg p-2 sm:p-3 space-y-2">
                    <div className="font-medium text-xs sm:text-sm">{store.store_name}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500">{(store.items?.length || 0)} items • Subtotal LKR {(store.subtotal || 0).toFixed(2)}</div>
                    <div className="max-h-56 overflow-y-auto space-y-2">
                      {(store.items || []).map((it: any, idx: number) => {
                        const beProduct = it.product;
                        const cartProduct = cartItems.find((ci: any) => ci.product.id === it.product_id)?.product;
                        const productName = beProduct?.name || cartProduct?.name || `Product ${it.product_id}`;
                        const imageUrl = beProduct?.image_urls?.[0] || beProduct?.imageUrl || cartProduct?.image_urls?.[0] || cartProduct?.imageUrl || cartProduct?.image;
                        const hasValidImage = imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== "" && imageUrl.startsWith("http");
                        const unitPrice = (it.final_price ?? it.base_price ?? 0);
                        const lineTotal = (it.total_price ?? (unitPrice * (it.quantity || 0)));
                        // Find the full product from cart store for QuantityButtons
                        const fullProduct = cartStore.items.find((ci: any) => ci.product.id === it.product_id)?.product || cartProduct;
                        return (
                          <div key={`${store.store_id ?? `store-${sIdx}`}-${it.product_id ?? it.id ?? idx}`} className="flex items-center gap-2 sm:gap-3 p-2 border rounded-lg text-xs sm:text-sm relative">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                              {hasValidImage ? (
                                <Image src={imageUrl as string} alt={productName} width={32} height={32} className="object-cover w-full h-full sm:w-10 sm:h-10" />
                              ) : (
                                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="truncate font-medium">{productName}</div>
                              <div className="text-[10px] sm:text-xs text-gray-500">Unit: LKR {unitPrice.toFixed(2)}</div>
                              <div className="text-xs sm:text-sm font-medium mt-1">LKR {lineTotal.toFixed(2)}</div>
                            </div>
                            {fullProduct && (
                              <div className="flex-shrink-0">
                                <QuantityButtons
                                  product={fullProduct}
                                  className="text-[10px] sm:text-xs"
                                  onQuantityChange={() => {
                                    if (onQuantityChange) {
                                      onQuantityChange();
                                    }
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-xs sm:text-sm flex justify-between pt-2 border-t">
                      <span>Delivery</span>
                      <span>LKR {(store.delivery_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="font-semibold flex justify-between text-xs sm:text-sm">
                      <span>Total</span>
                      <span>LKR {(store.total || (store.subtotal || 0) + (store.delivery_cost || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsCartExpanded(!isCartExpanded)}
              >
                <h4 className="font-medium text-gray-900 text-xs sm:text-sm">
                  Cart ({backendItems.length} {backendItems.length === 1 ? 'item' : 'items'})
                </h4>
                <Button variant="ghost" size="sm" className="p-1 h-auto">
                  {isCartExpanded ? (
                    <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </Button>
              </div>
              {isCartExpanded && (
                <div className="space-y-2 sm:space-y-3">
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {backendItems.map((backendItem: any, index: number) => {
                      const product = backendItem.product;
                      const productName = product?.name || `Product ${backendItem.product_id}`;
                      const imageUrl = product?.image_urls?.[0] || product?.imageUrl || product?.image;
                      const hasValidImage = imageUrl && imageUrl.trim() !== "" && imageUrl.startsWith("http");
                      const isDiscounted = (backendItem?.discount_percentage || 0) > 0;
                      const basePrice = backendItem?.base_price || 0;
                      const finalPrice = backendItem?.final_price || 0;
                      const totalPrice = backendItem?.total_price || (finalPrice * backendItem.quantity);
                      const totalBasePrice = basePrice * backendItem.quantity;
                      // Find the full product from cart store for QuantityButtons
                      const fullProduct = cartStore.items.find((ci: any) => ci.product.id === backendItem.product_id)?.product || product;
                      return (
                        <div key={`${backendItem.product_id ?? index}`} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg relative">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                            {hasValidImage ? (
                              <Image src={imageUrl} alt={productName} width={40} height={40} className="w-full h-full object-cover sm:w-12 sm:h-12" />
                            ) : (
                              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-xs sm:text-sm truncate">{productName}</h5>
                            <p className="text-[9px] sm:text-[11px] text-gray-500">ID: {backendItem.product_id}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500">Unit: LKR {finalPrice.toFixed(2)}</p>
                            <div className="flex items-center gap-2">
                              {isDiscounted ? (
                                <>
                                  <span className="text-xs sm:text-sm font-bold text-red-600">LKR {totalPrice.toFixed(2)}</span>
                                  <span className="text-[10px] sm:text-xs text-gray-400 line-through">LKR {totalBasePrice.toFixed(2)}</span>
                                </>
                              ) : (
                                <span className="text-xs sm:text-sm font-medium text-gray-900">LKR {totalPrice.toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                          {fullProduct && (
                            <div className="flex-shrink-0">
                              <QuantityButtons
                                product={fullProduct}
                                className="text-[10px] sm:text-xs"
                                onQuantityChange={() => {
                                  if (onQuantityChange) {
                                    onQuantityChange();
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <Separator />

        {/* Inventory Status - Only show if all items are available */}
        {unavailable_items && unavailable_items.length === 0 && backendItems.length > 0 && (
          <div className="flex items-center gap-2 p-2 sm:p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium text-green-800">All items available</p>
              <p className="text-[10px] sm:text-xs text-green-600">
                {backendItems.length} item{backendItems.length !== 1 ? 's' : ''} ready for {fulfillment_mode}
              </p>
            </div>
          </div>
        )}

        <Separator />


        {/* Pricing Breakdown */}
        <div className="space-y-2 sm:space-y-3">
          <h4 className="font-medium text-gray-900 text-xs sm:text-sm">Pricing Breakdown</h4>
          
          {/* Subtotal with strikethrough before discount */}
          <div className="flex justify-between text-xs sm:text-sm">
            <span>Subtotal</span>
            <div className="flex items-center gap-2">
              {total_discounts_applied > 0 && (
                <span className="text-gray-400 line-through text-[10px] sm:text-xs">
                  LKR {subtotal_before_discounts.toFixed(2)}
                </span>
              )}
              <span className="font-medium">
                LKR {subtotal_after_discounts.toFixed(2)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Delivery Charge */}
          {!isMultiStore && (
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="flex items-center gap-1">
                <Truck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                Delivery Fee
              </span>
              <span>LKR {delivery_charge.toFixed(2)}</span>
            </div>
          )}

          {/* Service Fee - Only show if there's a service charge */}
          {primaryStore.service_charge && primaryStore.service_charge > 0 && (
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="flex items-center gap-1">
                <Receipt className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                Service Fee
              </span>
              <span>LKR {primaryStore.service_charge.toFixed(2)}</span>
            </div>
          )}

          <Separator />

          {/* Total */}
          <div className="flex justify-between text-sm sm:text-base md:text-lg font-bold">
            <span>Total</span>
            <span>LKR {(isMultiStore ? overall_total : final_total).toFixed(2)}</span>
          </div>
        </div>

        {/* Checkout Button - Black background with bold text */}
        <button
          onClick={onCheckout}
          disabled={loadingCheckout || cartItems.length === 0}
          className="w-full bg-black text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-bold hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
        >
          {loadingCheckout ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
              Processing...
            </div>
          ) : (
            `Place Order - LKR ${(isMultiStore ? overall_total : final_total).toFixed(2)}`
          )}
        </button>
        
        {cartItems.length === 0 && (
          <p className="text-center text-gray-500 text-xs sm:text-sm">
            Your cart is empty. Add some products to continue.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderSummary;
