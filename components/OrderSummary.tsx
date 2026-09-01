"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ShoppingCart, 
  Truck, 
  Receipt,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ShieldCheck
} from "lucide-react";
import QuantityButtons from "./QuantityButtons";
import useCartStore from "@/store";
import paymentGatewaySolutions from "@/images/Payment Gateway Solutions-03.jpg";
import { PaymentTermsContent } from "@/components/PaymentTermsContent";

interface OrderSummaryProps {
  previewData: any;
  loading?: boolean;
  cartItems: any[];
  localSubtotal: number;
  onCheckout: () => void;
  loadingCheckout: boolean;
  onQuantityChange?: () => void;
  onEditMultiStore?: () => void;
  editMultiStoreDisabled?: boolean;
  canPlaceOrder?: boolean;
  locationRequiredMessage?: string;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  previewData,
  loading = false,
  cartItems = [],
  localSubtotal,
  onCheckout,
  loadingCheckout,
  onQuantityChange,
  onEditMultiStore,
  editMultiStoreDisabled = false,
  canPlaceOrder = true,
  locationRequiredMessage = "Please select a delivery location to place your order.",
}) => {
  const [isCartExpanded, setIsCartExpanded] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  // Subscribe directly so line-item prices update instantly (same as cart preview / order total).
  const liveCartItems = useCartStore((state) => state.items);
  const liveSubtotal = useCartStore((state) =>
    state.items.reduce((total, item) => {
      if (!item?.product) return total;
      const price = item.product.pricing?.final_price ?? item.product.base_price ?? 0;
      return total + price * item.quantity;
    }, 0)
  );

  const TermsDialog = (
    <Dialog open={isTermsOpen} onOpenChange={setIsTermsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Payment Terms &amp; Conditions</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Please review and accept to continue with secure payment processing.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-auto rounded-lg border bg-white p-3 sm:p-4 text-xs sm:text-sm leading-relaxed">
          <p className="font-medium text-gray-900 mb-3">Payment Processing Terms &amp; Conditions</p>
          <PaymentTermsContent />
        </div>

        <label className="mt-3 flex items-start gap-2 cursor-pointer select-none">
          <input
            id="terms-dialog"
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
          />
          <span className="text-[10px] sm:text-xs text-gray-700 leading-snug">
            I agree to the Payment Terms &amp; Conditions and authorize secure payment processing.
          </span>
        </label>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsTermsOpen(false)}>
            Close
          </Button>
          <Button
            type="button"
            onClick={() => setIsTermsOpen(false)}
            disabled={!acceptedTerms}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  if (loading) {
    const itemCount = liveCartItems.length || cartItems.length;
    const skeletonRows = Math.min(Math.max(itemCount, 2), 4);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {/* Fulfilled-by banner */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-2.5 sm:p-3 space-y-2">
            <div className="h-3.5 sm:h-4 w-3/5 rounded-md bg-blue-200/70 animate-pulse" />
            <div className="h-2.5 sm:h-3 w-1/4 rounded-md bg-blue-200/50 animate-pulse" />
          </div>

          {/* Cart items */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3.5 sm:h-4 w-24 rounded-md bg-gray-200 animate-pulse" />
              <div className="h-6 w-6 rounded-md bg-gray-100 animate-pulse" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: skeletonRows }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 sm:gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-2 sm:p-3"
                >
                  <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-lg bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="h-3.5 sm:h-4 w-[85%] rounded-md bg-gray-200 animate-pulse" />
                    <div className="h-2.5 sm:h-3 w-1/3 rounded-md bg-gray-100 animate-pulse" />
                    <div className="h-3.5 w-16 rounded-md bg-gray-200 animate-pulse" />
                  </div>
                  <div className="h-8 w-[72px] shrink-0 rounded-full bg-gray-200 animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Order total */}
          <div className="space-y-2.5 sm:space-y-3">
            <div className="h-4 sm:h-5 w-28 rounded-md bg-gray-300 animate-pulse" />
            <div className="flex items-center justify-between gap-4">
              <div className="h-3 sm:h-3.5 w-20 rounded-md bg-gray-100 animate-pulse" />
              <div className="h-3 sm:h-3.5 w-16 rounded-md bg-gray-200 animate-pulse" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="h-3 sm:h-3.5 w-24 rounded-md bg-gray-100 animate-pulse" />
              <div className="h-3 sm:h-3.5 w-14 rounded-md bg-gray-200 animate-pulse" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="h-3 sm:h-3.5 w-16 rounded-md bg-gray-100 animate-pulse" />
              <div className="h-3 sm:h-3.5 w-20 rounded-md bg-gray-200 animate-pulse" />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4 pt-0.5">
              <div className="h-4 sm:h-5 w-14 rounded-md bg-gray-300 animate-pulse" />
              <div className="h-4 sm:h-5 w-24 rounded-md bg-gray-300 animate-pulse" />
            </div>
          </div>

          {/* Terms + checkout */}
          <div className="rounded-lg border bg-gray-50 p-3 space-y-2.5">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 h-4 w-4 shrink-0 rounded border border-gray-200 bg-gray-100 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-full rounded bg-gray-100 animate-pulse" />
                <div className="h-2.5 w-4/5 rounded bg-gray-100 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="h-10 sm:h-11 w-full rounded-lg bg-gray-200 animate-pulse" />
          <div className="flex justify-center pt-1">
            <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
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
            <div className="rounded-lg border bg-gray-50 p-3">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  id="terms-no-preview"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="text-[10px] sm:text-xs text-gray-700 leading-snug">
                  I agree to the{" "}
                  <button
                    type="button"
                    className="font-medium text-gray-900 underline underline-offset-2 hover:text-black"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTermsOpen(true);
                    }}
                  >
                    Payment Terms &amp; Conditions
                  </button>{" "}
                  and authorize secure payment processing.
                </span>
              </label>
            </div>
            <button
              onClick={onCheckout}
              disabled={loadingCheckout || liveCartItems.length === 0 || !acceptedTerms || !canPlaceOrder}
              className="w-full bg-blue-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
            >
              {loadingCheckout ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : !canPlaceOrder ? (
                "Select Location to Place Order"
              ) : (
                `Place Order - LKR ${localSubtotal.toFixed(2)}`
              )}
            </button>
            
            {!canPlaceOrder && (
              <p className="text-center text-amber-700 text-xs sm:text-sm">
                {locationRequiredMessage}
              </p>
            )}
            
            {liveCartItems.length === 0 && (
              <p className="text-center text-gray-500 text-xs sm:text-sm">
                Your cart is empty. Add some products to continue.
              </p>
            )}
          </div>
        </CardContent>
        {TermsDialog}
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

  const fulfillmentLabel = fulfillment_mode === "delivery" ? "Delivery" : "Pickup";

  const getCartItem = (productId: number) =>
    liveCartItems.find((ci) => ci?.product?.id === productId);

  const getLineFromCart = (cartItem: (typeof liveCartItems)[number]) => {
    const unitPrice =
      cartItem.product.pricing?.final_price ??
      cartItem.product.base_price ??
      cartItem.product.price ??
      0;
    const unitBasePrice =
      cartItem.product.pricing?.base_price ??
      cartItem.product.base_price ??
      cartItem.product.price ??
      0;
    const qty = cartItem.quantity || 0;
    return {
      qty,
      unitPrice,
      unitBasePrice,
      lineTotal: unitPrice * qty,
      lineBaseTotal: unitBasePrice * qty,
    };
  };

  const getOptimisticLine = (backendItem: any) => {
    const cartItem = getCartItem(backendItem.product_id);
    if (cartItem) {
      return getLineFromCart(cartItem);
    }
    const qty = backendItem.quantity || 0;
    const unitPrice = backendItem.final_price ?? backendItem.base_price ?? 0;
    const unitBasePrice = backendItem.base_price ?? unitPrice;
    return {
      qty,
      unitPrice,
      unitBasePrice,
      lineTotal: backendItem.total_price ?? unitPrice * qty,
      lineBaseTotal: unitBasePrice * qty,
    };
  };

  const allPreviewItems = isMultiStore
    ? fulfillable_stores.flatMap((s: any) => s.items || [])
    : backendItems;

  const hasPendingQtyChanges =
    allPreviewItems.some((it: any) => {
      const cartQty = getCartItem(it.product_id)?.quantity;
      return cartQty != null && cartQty !== it.quantity;
    }) ||
    liveCartItems.some((ci) => {
      if (!ci?.product?.id) return false;
      return !allPreviewItems.some((it: any) => it.product_id === ci.product.id);
    });

  const multiStoreDeliveryTotal = fulfillable_stores.reduce(
    (sum: number, s: any) => sum + (s?.delivery_cost || 0),
    0
  );
  const serviceCharge = primaryStore.service_charge || 0;
  const displaySubtotal = hasPendingQtyChanges ? liveSubtotal : subtotal_after_discounts;
  const displayDelivery = isMultiStore ? multiStoreDeliveryTotal : delivery_charge;
  const displayTotal = hasPendingQtyChanges
    ? liveSubtotal + displayDelivery + serviceCharge
    : isMultiStore
      ? overall_total
      : final_total;


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-sm sm:text-base md:text-lg">
          <span className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            Order Summary
          </span>
          {isMultiStore && onEditMultiStore && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEditMultiStore}
              disabled={editMultiStoreDisabled}
              className="text-xs sm:text-sm disabled:opacity-50"
            >
              Edit
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Store Information */}
        {/* For multi-store carts, store name is already shown inside the "Items by store" cards. */}
        {!isMultiStore ? (
          store_name && store_name !== "Store" ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Truck className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                <span className="text-xs sm:text-sm font-medium text-blue-800">
                  Fulfilled by: {store_name}
                </span>
              </div>
              <div className="text-[10px] sm:text-xs text-blue-600 mt-1">{fulfillmentLabel}</div>
            </div>
          ) : null
        ) : null}

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
                    <div className="font-medium text-xs sm:text-sm">Fulfilled by: {store.store_name || "Store"}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500">
                      {(store.items?.length || 0)} items • Subtotal LKR{" "}
                      {(store.items || [])
                        .reduce((sum: number, it: any) => sum + getOptimisticLine(it).lineTotal, 0)
                        .toFixed(2)}
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-2">
                      {(store.items || []).map((it: any, idx: number) => {
                        const beProduct = it.product;
                        const cartProduct = getCartItem(it.product_id)?.product;
                        const productName = beProduct?.name || cartProduct?.name || `Product ${it.product_id}`;
                        const imageUrl =
                          beProduct?.image_urls?.[0] ||
                          beProduct?.imageUrl ||
                          cartProduct?.image_urls?.[0] ||
                          cartProduct?.imageUrl;
                        const hasValidImage = imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== "" && imageUrl.startsWith("http");
                        const { unitPrice, lineTotal } = getOptimisticLine(it);
                        // Find the full product from cart store for QuantityButtons
                        const fullProduct = cartProduct;
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
                      <span>{fulfillmentLabel}</span>
                      <span>LKR {(store.delivery_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="font-semibold flex justify-between text-xs sm:text-sm">
                      <span>Total</span>
                      <span>
                        LKR{" "}
                        {(
                          (store.items || []).reduce(
                            (sum: number, it: any) => sum + getOptimisticLine(it).lineTotal,
                            0
                          ) + (store.delivery_cost || 0)
                        ).toFixed(2)}
                      </span>
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
                  Cart ({liveCartItems.length} {liveCartItems.length === 1 ? "item" : "items"})
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
                    {liveCartItems.map((cartItem, index) => {
                      if (!cartItem?.product) return null;
                      const backendItem = backendItems.find(
                        (b: any) => b.product_id === cartItem.product.id
                      );
                      const product = cartItem.product;
                      const productName = product.name || `Product ${product.id}`;
                      const imageUrl =
                        product.image_urls?.[0] ||
                        product.imageUrl ||
                        backendItem?.product?.image_urls?.[0] ||
                        backendItem?.product?.imageUrl;
                      const hasValidImage =
                        imageUrl && imageUrl.trim() !== "" && imageUrl.startsWith("http");
                      const isDiscounted =
                        (product.pricing?.discount_applied ?? 0) > 0 ||
                        (backendItem?.discount_percentage || 0) > 0;
                      const { unitPrice, lineTotal, lineBaseTotal } = getLineFromCart(cartItem);
                      return (
                        <div
                          key={`${product.id ?? index}`}
                          className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg relative"
                        >
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                            {hasValidImage ? (
                              <Image
                                src={imageUrl}
                                alt={productName}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover sm:w-12 sm:h-12"
                              />
                            ) : (
                              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-xs sm:text-sm truncate">{productName}</h5>
                            <p className="text-[10px] sm:text-xs text-gray-500">
                              Unit: LKR {unitPrice.toFixed(2)}
                            </p>
                            <div className="flex items-center gap-2">
                              {isDiscounted ? (
                                <>
                                  <span className="text-xs sm:text-sm font-bold text-red-600">
                                    LKR {lineTotal.toFixed(2)}
                                  </span>
                                  <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                                    LKR {lineBaseTotal.toFixed(2)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs sm:text-sm font-medium text-gray-900">
                                  LKR {lineTotal.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <QuantityButtons
                              product={product}
                              className="text-[10px] sm:text-xs"
                              onQuantityChange={() => {
                                if (onQuantityChange) {
                                  onQuantityChange();
                                }
                              }}
                            />
                          </div>
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

        {/* Intentionally no "All items available" banner.
            Only show inventory issues when backend reports unavailable items. */}

        <Separator />


        {/* Order total */}
        <div className="space-y-2 sm:space-y-3">
          <h4 className="text-black font-bold text-sm sm:text-base md:text-lg">Order total</h4>
          
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
                LKR {displaySubtotal.toFixed(2)}
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
          {isMultiStore && (
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="flex min-w-0 items-center gap-1">
                <Truck className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                <span className="truncate">
                  {fulfillmentLabel} Fee (
                  {fulfillable_stores
                    .map((s: any) => s?.store_name)
                    .filter(Boolean)
                    .join(" + ") || "Stores"}
                  )
                </span>
              </span>
              <span className="tabular-nums">
                LKR{" "}
                {fulfillable_stores
                  .reduce((sum: number, s: any) => sum + (s?.delivery_cost || 0), 0)
                  .toFixed(2)}
              </span>
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
            <span>LKR {displayTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Checkout Button - Black background with bold text */}
        <div className="rounded-lg border bg-gray-50 p-3">
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              id="terms"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <span className="text-[10px] sm:text-xs text-gray-700 leading-snug">
              I agree to the{" "}
              <button
                type="button"
                className="font-medium text-gray-900 underline underline-offset-2 hover:text-black"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTermsOpen(true);
                }}
              >
                Payment Terms &amp; Conditions
              </button>{" "}
              and authorize secure payment processing.
            </span>
          </label>
        </div>
        <button
          onClick={onCheckout}
          disabled={loadingCheckout || liveCartItems.length === 0 || !acceptedTerms || !canPlaceOrder}
          className="w-full bg-black text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-bold hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
        >
          {loadingCheckout ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
              Processing...
            </div>
          ) : !canPlaceOrder ? (
            "Select Location to Place Order"
          ) : (
            `Place Order - LKR ${displayTotal.toFixed(2)}`
          )}
        </button>

        {!canPlaceOrder && (
          <p className="text-center text-amber-700 text-xs sm:text-sm">
            {locationRequiredMessage}
          </p>
        )}

        {/* Trust / security block */}
        <div className="pt-2">
          <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs font-medium text-gray-700">
            <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-700" />
            Secured By
          </div>
          <div className="mt-2 flex justify-center">
            <Image
              src={paymentGatewaySolutions}
              alt="Payment gateway security"
              className="h-auto w-full max-w-[320px] rounded-md border bg-white"
              priority={false}
            />
          </div>
        </div>
        
        {liveCartItems.length === 0 && (
          <p className="text-center text-gray-500 text-xs sm:text-sm">
            Your cart is empty. Add some products to continue.
          </p>
        )}
      </CardContent>
      {TermsDialog}
    </Card>
  );
};

export default OrderSummary;
