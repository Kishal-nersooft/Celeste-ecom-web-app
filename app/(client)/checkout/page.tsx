"use client";
import Container from "@/components/Container";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import EmptyCart from "@/components/EmptyCart";
import NoAccessToCart from "@/components/NoAccessToCart";
import Loader from "@/components/Loader";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import useCartStore from "@/store";
import DeliveryDetails from "@/components/DeliveryDetails";
import { useLocation } from "@/contexts/LocationContext";
import { previewOrder, createOrder, getAuthHeaders, removeFromCart } from "@/lib/api";
import { clearStaleAddressData, validateAddressOwnership, handleAddressValidationError } from "@/lib/address-utils";
import QuantityMismatchAlert from "@/components/QuantityMismatchAlert";
import OrderSummary from "@/components/OrderSummary";
import PaymentMethod from "@/components/PaymentMethod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CheckoutPage = () => {
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  // Use LocationContext for order type instead of local state
  const { deliveryType: selectedOrderType, setDeliveryType: setSelectedOrderType } = useLocation();
  const [selectedDeliveryService, setSelectedDeliveryService] = useState<'standard' | 'premium' | 'priority'>('standard');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showQuantityMismatchAlert, setShowQuantityMismatchAlert] = useState(false);
  const [mismatchedItems, setMismatchedItems] = useState<any[]>([]);
  const [processingQuantityMismatch, setProcessingQuantityMismatch] = useState(false);
  const [showMultiStoreDialog, setShowMultiStoreDialog] = useState(false);
  const [splitDecisionMade, setSplitDecisionMade] = useState(false);
  const [splitOrderSelected, setSplitOrderSelected] = useState<boolean>(false);
  const [editorMode, setEditorMode] = useState(false);
  const [markedStores, setMarkedStores] = useState<Set<number>>(new Set());
  const [confirmStoreId, setConfirmStoreId] = useState<number | null>(null);
  const { selectedLocation, setSelectedLocation, addressId: contextAddressId, defaultAddress, deliveryType, setDeliveryType, selectedStore } = useLocation();
  
  const cartStore = useCartStore();
  
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign-in");
    }
  }, [user, loading, router]);

  // Ensure cart items have complete product data when page loads
  useEffect(() => {
    const ensureCartItemsData = async () => {
      if (!user || cartStore.items.length === 0 || !cartStore.cartId) {
        return;
      }

      // Check if any items are missing complete data
      const itemsNeedingData = cartStore.items.filter(item => {
        if (!item || !item.product) return true;
        const hasName = item.product.name && item.product.name !== 'Unknown Product';
        const hasImages = item.product.image_urls && item.product.image_urls.length > 0;
        const hasPricing = item.product.pricing && item.product.pricing.final_price;
        return !hasName || !hasImages || !hasPricing;
      });

      if (itemsNeedingData.length > 0) {
        console.log('🔍 Cart items need complete data, syncing cart...');
        try {
          await cartStore.switchCart(cartStore.cartId);
          console.log('✅ Cart synced, items should now have complete data');
        } catch (error) {
          console.error('❌ Failed to sync cart:', error);
        }
      }
    };

    ensureCartItemsData();
  }, [user, cartStore.cartId, cartStore.items.length]);

  // Fetch preview data when address is available
  useEffect(() => {
  const fetchPreviewData = async () => {
      // Don't fetch if user is not authenticated
      if (!user || loading) {
      return;
    }

      if (!contextAddressId || !cartStore.cartId || cartStore.items.length === 0) {
      return;
    }

      try {
        setLoadingPreview(true);
        console.log('🔍 Fetching preview data for cart:', cartStore.cartId);
        
        // Prepare location data based on order type
        const locationData = selectedOrderType === 'pickup' 
          ? {
              address_id: null, // No address needed for pickup
              mode: selectedOrderType,
              store_id: selectedStore?.id ? parseInt(selectedStore.id) : null, // Use selected store for pickup
              delivery_service_level: undefined // No delivery service for pickup
            }
          : {
              address_id: contextAddressId, // Address required for delivery
              mode: selectedOrderType,
              store_id: null, // No store for delivery
              delivery_service_level: selectedDeliveryService // Delivery service for delivery
            };

        const response = await previewOrder({
          cart_ids: [cartStore.cartId],
          location: locationData,
          split_order: true // Enable split orders by default
        });

        setPreviewData(response);
        console.log('✅ Preview data received:', response);
      } catch (error: any) {
        console.error('❌ Failed to fetch preview data:', error);
        
        // Handle authentication errors specifically
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          console.log('🔄 Authentication required, redirecting to sign-in');
          router.push('/sign-in');
          return;
        }
        
        // Handle address validation errors
        if (error.message?.includes('422') && error.message?.includes('Address') && error.message?.includes('not found')) {
          console.log('🔄 Address validation error detected, clearing stale data');
          handleAddressValidationError();
          toast.error('Address data has been cleared. Please select your address again.');
          return;
        }
        
        toast.error('Failed to load order details');
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchPreviewData();
  }, [user, loading, contextAddressId, cartStore.cartId, cartStore.items.length, selectedOrderType, selectedDeliveryService, router]);

  // Show multi-store confirmation when preview indicates multiple stores
  useEffect(() => {
    const backendData = previewData?.data || previewData;
    const fulfillableStores = backendData?.fulfillable_stores || [];
    if (fulfillableStores.length > 1 && !splitDecisionMade) {
      setShowMultiStoreDialog(true);
    }
  }, [previewData, splitDecisionMade]);

  const handleLocationChange = (location: any) => {
    // If location is "Location", it means user clicked "Change" button
    // We need to reset the addressId to trigger the address selector
    if (location === "Location") {
      setSelectedLocation(location);
      // Don't reset addressId here - let the CartLocationSelector handle it
      return;
    }
    
    // If it's a new address selection, update both location and addressId
    setSelectedLocation(location);
    
    // If the location contains address data, extract and update addressId
    if (typeof location === 'object' && location.addressId) {
      // This would be called from CartLocationSelector when a new address is selected
      // The CartLocationSelector should handle updating the context
    }
  };

  const handleOrderTypeChange = (orderType: 'delivery' | 'pickup') => {
    setDeliveryType(orderType);
  };

  const handleSetToAvailable = async () => {
    setProcessingQuantityMismatch(true);
    try {
      // Update quantities to available amounts
      for (const item of mismatchedItems) {
        await cartStore.updateItemQuantity(item.product.id, item.availableQuantity);
      }
      setShowQuantityMismatchAlert(false);
      toast.success('Quantities updated to available amounts');
    } catch (error) {
      console.error('Failed to update quantities:', error);
      toast.error('Failed to update quantities');
    } finally {
      setProcessingQuantityMismatch(false);
    }
  };

  const handleRemoveAll = async () => {
    setProcessingQuantityMismatch(true);
    try {
      // Remove all mismatched items
      for (const item of mismatchedItems) {
        await cartStore.removeItem(item.product.id);
      }
      setShowQuantityMismatchAlert(false);
      toast.success('Mismatched items removed');
    } catch (error) {
      console.error('Failed to remove items:', error);
      toast.error('Failed to remove items');
    } finally {
      setProcessingQuantityMismatch(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please sign in to continue');
      return;
    }

    // Validate location based on order type
    if (selectedOrderType === 'delivery' && !contextAddressId) {
      toast.error('Please select a delivery location');
      return;
    }
    
    if (selectedOrderType === 'pickup' && !selectedStore) {
      toast.error('Please select a store for pickup');
      return;
    }

    if (!previewData) {
      toast.error('Please wait for order details to load');
      return;
    }

    try {
      setLoadingCheckout(true);

      // Extract pricing data from preview
      const backendData = previewData?.data || previewData;
      const fulfillableStores = backendData?.fulfillable_stores || [];
      const primaryStore = fulfillableStores?.[0] || {};
      
      // Check for quantity mismatches using new structure
      const mismatched = [];
      const backendItems = primaryStore.items || [];
      
      for (const item of backendItems) {
        const localItem = cartStore.items.find((ci: any) => ci.product.id === item.product_id);
        if (localItem && localItem.quantity !== item.quantity) {
          mismatched.push({
            product: localItem.product,
            requestedQuantity: localItem.quantity,
            availableQuantity: item.quantity
          });
        }
      }

      if (mismatched.length > 0) {
        setMismatchedItems(mismatched);
        setShowQuantityMismatchAlert(true);
        return;
      }

      // Create order
      if (!cartStore.cartId) {
        throw new Error('Cart ID is required');
      }
      
      // Prepare location data for order creation based on order type
      const orderLocationData = selectedOrderType === 'pickup' 
        ? {
            address_id: null, // No address needed for pickup
            mode: selectedOrderType,
            store_id: selectedStore?.id ? parseInt(selectedStore.id) : null, // Use selected store for pickup
            delivery_service_level: undefined // No delivery service for pickup
          }
        : {
            address_id: contextAddressId, // Address required for delivery
            mode: selectedOrderType,
            store_id: null, // No store for delivery
            delivery_service_level: selectedDeliveryService // Delivery service for delivery
          };

      const orderData = {
        cart_ids: [cartStore.cartId],
        location: orderLocationData,
        split_order: fulfillableStores.length > 1 ? true : false,
        // Pricing
        subtotal: fulfillableStores.length > 1 ? undefined : (primaryStore.subtotal || 0),
        delivery_charge: fulfillableStores.length > 1 ? undefined : (primaryStore.delivery_cost || 0),
        total_amount: fulfillableStores.length > 1 ? (backendData.overall_total || 0) : (primaryStore.total || backendData.overall_total || 0),
        // Platform identifier for backend analytics
        platform: "web"
      };

      const order = await createOrder(orderData);
      console.log('✅ Order created:', order);

      // Clear cart
      await cartStore.clearCart();

      // Redirect to success page
      router.push(`/orders?success=true&orderId=${order.id}`);
      toast.success('Order placed successfully!');

    } catch (error) {
      console.error('❌ Checkout failed:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleConfirmSplitYes = () => {
    setSplitOrderSelected(true);
    setSplitDecisionMade(true);
    setEditorMode(false);
    setShowMultiStoreDialog(false);
  };

  const handleConfirmSplitNo = () => {
    setSplitOrderSelected(false);
    setSplitDecisionMade(true);
    setEditorMode(true);
    setShowMultiStoreDialog(false);
  };

  const backendData = previewData?.data || previewData;
  const fulfillableStores = backendData?.fulfillable_stores || [];

  const handlePromptDeleteStore = (storeId: number) => {
    setConfirmStoreId(storeId);
  };

  const handleConfirmDeleteStore = () => {
    if (confirmStoreId == null) return;
    setMarkedStores(prev => new Set(prev).add(confirmStoreId));
    setConfirmStoreId(null);
  };

  const handleCancelDeleteStore = () => {
    setConfirmStoreId(null);
  };

  const handleSaveEditor = async () => {
    try {
      setLoadingPreview(true);
      // If any stores are marked, remove their items from cart
      if (markedStores.size > 0) {
        const deletions: Promise<any>[] = [];
        for (const storeId of markedStores) {
          const store = fulfillableStores.find((s: any) => s.store_id === storeId);
          if (!store) continue;
          for (const item of (store.items || [])) {
            const productId = item.product_id ?? item.product?.id;
            if (!productId) {
              console.warn('⚠️ Skipping delete for item with missing product id:', item);
              continue;
            }
            // Call backend delete immediately (no debounce)
            deletions.push(removeFromCart(cartStore.cartId!, productId));
          }
        }
        await Promise.allSettled(deletions);
        // Clear marks after deletion
        setMarkedStores(new Set());
      }

      // Prepare location data for refresh based on order type
      const refreshLocationData = selectedOrderType === 'pickup' 
        ? {
            address_id: null, // No address needed for pickup
            mode: selectedOrderType,
            store_id: selectedStore?.id ? parseInt(selectedStore.id) : null, // Use selected store for pickup
            delivery_service_level: undefined // No delivery service for pickup
          }
        : {
            address_id: contextAddressId!, // Address required for delivery
            mode: selectedOrderType,
            store_id: null, // No store for delivery
            delivery_service_level: selectedDeliveryService // Delivery service for delivery
          };

      // Refresh preview with split_order: false (single-store intent)
      const refreshed = await previewOrder({
        cart_ids: [cartStore.cartId!],
        location: refreshLocationData,
        split_order: false
      });
      setPreviewData(refreshed);
      const stores = (refreshed?.data || refreshed)?.fulfillable_stores || [];
      if (stores.length === 1) {
        setEditorMode(false);
        toast.success('Ready to place single-store order');
      } else if (stores.length > 1) {
        // If still multiple stores and nothing marked this round, prompt split decision again
        setShowMultiStoreDialog(true);
        setSplitDecisionMade(false);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to refresh order details');
    } finally {
      setLoadingPreview(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return <NoAccessToCart />;
  }

  if (cartStore.items.length === 0) {
    return <EmptyCart />;
  }

  // Show loading state while waiting for location (address for delivery, store for pickup)
  const needsLocation = (selectedOrderType === 'delivery' && !contextAddressId) || 
                       (selectedOrderType === 'pickup' && !selectedStore);
  
  if (needsLocation && !loadingPreview) {
    return (
      <Container className="py-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">
            {selectedOrderType === 'delivery' ? 'Please select a delivery address' : 'Please select a store for pickup'}
          </h2>
          <p className="text-gray-600">
            {selectedOrderType === 'delivery' 
              ? 'Choose your delivery location to see order details and pricing.'
              : 'Choose a store location to see order details and pricing.'
            }
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4 sm:py-6 md:py-8 lg:py-10">
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* Left Side - Delivery Details and Payment Method */}
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          <DeliveryDetails
            onLocationChange={handleLocationChange}
            selectedLocation={selectedLocation}
            selectedDeliveryService={selectedDeliveryService}
            onDeliveryServiceChange={setSelectedDeliveryService}
          />
          
          <PaymentMethod />
        </div>

        {/* Right Side - Order Summary */}
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          {editorMode && fulfillableStores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base md:text-lg">Edit Items by Store</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {fulfillableStores.map((store: any) => {
                    const isMarked = markedStores.has(store.store_id);
                    return (
                    <div key={store.store_id} className={`border rounded-lg p-2 sm:p-3 space-y-1.5 sm:space-y-2 ${isMarked ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                          {store.store_name}
                          {isMarked && (<span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded bg-gray-200 text-gray-700">Removed</span>)}
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => handlePromptDeleteStore(store.store_id)} disabled={isMarked} className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5">Delete All</Button>
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500">{store.items?.length || 0} items • Subtotal LKR {(store.subtotal || 0).toFixed(2)}</div>
                      <div className="max-h-56 overflow-y-auto space-y-2">
                        {(store.items || []).map((it: any, idx: number) => {
                          const beProduct = it.product;
                          const cartProduct = cartStore.items.find((ci: any) => ci.product.id === it.product_id)?.product;
                          const productName = beProduct?.name || cartProduct?.name || `Product ${it.product_id}`;
                          const imageUrl = beProduct?.image_urls?.[0] || beProduct?.imageUrl || cartProduct?.image_urls?.[0] || cartProduct?.imageUrl;
                          const hasValidImage = imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '' && imageUrl.startsWith('http');
                          const unitPrice = (it.final_price ?? it.base_price ?? 0);
                          return (
                            <div key={`${store.store_id}-${it.product_id ?? it.id ?? idx}`} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                                {hasValidImage ? (
                                  <img src={imageUrl as string} alt={productName} className="object-cover w-full h-full" />
                                ) : (
                                  <span className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-300 rounded" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="truncate">{productName}</div>
                                <div className="text-[10px] sm:text-xs text-gray-500">Qty: {it.quantity}</div>
                              </div>
                              <div className="text-xs sm:text-sm font-medium">LKR {unitPrice.toFixed(2)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );})}
                </div>
                <div className="mt-3 sm:mt-4 flex justify-end">
                  <Button onClick={handleSaveEditor} disabled={loadingPreview} className="text-xs sm:text-sm">Save</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <OrderSummary
            previewData={previewData}
            loading={loadingPreview}
            cartItems={cartStore.items}
            localSubtotal={cartStore.getSubTotalPrice()}
            onCheckout={handleCheckout}
            loadingCheckout={loadingCheckout}
          />
        </div>
      </div>

      {/* Quantity Mismatch Alert */}
      <QuantityMismatchAlert
        isOpen={showQuantityMismatchAlert}
        onClose={() => setShowQuantityMismatchAlert(false)}
        mismatchedItems={mismatchedItems}
        onRemoveAll={handleRemoveAll}
        onSetToAvailable={handleSetToAvailable}
        loading={processingQuantityMismatch}
      />

      {/* Multi-store confirmation dialog */}
      <Dialog open={showMultiStoreDialog} onOpenChange={setShowMultiStoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base md:text-lg">Multiple stores will fulfill this order</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {fulfillableStores.length} stores will fulfill your items. Review counts and totals below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            {fulfillableStores.map((s: any, sIdx: number) => (
              <div key={s.store_id ?? `store-${sIdx}`} className="border rounded-lg p-2 sm:p-3 text-xs sm:text-sm space-y-1">
                <div className="font-medium">{s.store_name}</div>
                <div className="text-gray-600">{(s.items?.length || 0)} items</div>
                <div className="text-gray-900">Subtotal LKR {(s.subtotal || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-right font-semibold text-xs sm:text-sm md:text-base">Overall total: LKR {(backendData?.overall_total || 0).toFixed(2)}</div>
          <DialogFooter>
            <Button variant="outline" onClick={handleConfirmSplitNo} className="text-xs sm:text-sm">No, I'll adjust</Button>
            <Button onClick={handleConfirmSplitYes} className="text-xs sm:text-sm">Yes, place {fulfillableStores.length} orders</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete store dialog */}
      <Dialog open={confirmStoreId != null} onOpenChange={(open) => { if (!open) setConfirmStoreId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base md:text-lg">Delete all items from this store?</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              This will remove all items from the selected store from your cart.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDeleteStore} className="text-xs sm:text-sm">Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDeleteStore} className="text-xs sm:text-sm">Yes, delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default CheckoutPage;