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
import { previewOrder, createOrder, getAuthHeaders, removeFromCart, checkPaymentStatus } from "@/lib/api";
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

// Global type declaration for Mastercard Checkout
declare global {
  interface Window {
    Checkout?: {
      configure: (config: { session: { id: string } }) => void;
      showPaymentPage: () => void;
    };
  }
}

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
  // Payment gateway state
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [paymentSessionData, setPaymentSessionData] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  // Payment window state (ref = synchronous access for polling / closed checks; state for effects)
  const [paymentWindow, setPaymentWindow] = useState<Window | null>(null);
  const paymentWindowRef = React.useRef<Window | null>(null);
  /** Set true before closing the gateway tab after a successful payment (avoids treating that close as user cancel; state updates are async). */
  const paymentSucceededClosingRef = React.useRef(false);
  /** Single payment popup: loading spinner → cancelled message when gateway tab is closed */
  const [paymentModal, setPaymentModal] = useState<'none' | 'loading' | 'cancelled'>('none');
  const [currentPaymentRef, setCurrentPaymentRef] = useState<string | null>(null);
  /** Backend returns HTML for 3DS challenge when status is needs_3ds (e.g. saved-card OTP). */
  const [threeDsHtml, setThreeDsHtml] = useState<string | null>(null);
  // Store polling control to stop it when needed
  const pollingControlRef = React.useRef<{
    stop: (opts?: { switchToCancelled?: boolean }) => void;
  } | null>(null);
  const { selectedLocation, setSelectedLocation, addressId: contextAddressId, defaultAddress, deliveryType, setDeliveryType, selectedStore } = useLocation();
  
  const cartStore = useCartStore();
  
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?returnUrl=" + encodeURIComponent("/checkout"));
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

  // Fetch preview data function - extracted to be reusable
  const fetchPreviewData = React.useCallback(async () => {
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
        console.log('🔄 Authentication required, redirecting to login');
        router.push("/login?returnUrl=" + encodeURIComponent("/checkout"));
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
  }, [user, loading, contextAddressId, cartStore.cartId, cartStore.items.length, selectedOrderType, selectedDeliveryService, selectedStore, router]);

  // Fetch preview data when address is available
  useEffect(() => {
    fetchPreviewData();
  }, [fetchPreviewData]);

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

  // When the payment gateway tab is closed before success, stop polling and switch the same modal to "cancelled"
  useEffect(() => {
    if (!paymentWindow) return;

    const checkWindowClosed = setInterval(() => {
      const win = paymentWindowRef.current;
      if (win && win.closed) {
        clearInterval(checkWindowClosed);
        if (paymentSucceededClosingRef.current) {
          paymentSucceededClosingRef.current = false;
          setPaymentWindow(null);
          paymentWindowRef.current = null;
          return;
        }
        pollingControlRef.current?.stop({ switchToCancelled: true });
        pollingControlRef.current = null;
        setPaymentWindow(null);
        paymentWindowRef.current = null;
      }
    }, 1000);

    return () => clearInterval(checkWindowClosed);
  }, [paymentWindow]);

  const PAYMENT_STATUS_POLL_MS = 2000;

  // Poll GET /payments/status/{ref} every 2s until success, failure, window closed, or timeout
  const startPaymentStatusPolling = (paymentRef: string) => {
    setIsProcessingPayment(true);
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let safetyTimeout: NodeJS.Timeout | null = null;
    let isPollingActive = true;
    const maxPollAttempts = 300; // 2s * 300 ≈ 10 minutes

    const stopPolling = (opts?: { keepModalOpen?: boolean; switchToCancelled?: boolean }) => {
      isPollingActive = false;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
        safetyTimeout = null;
      }
      setIsProcessingPayment(false);
      if (opts?.keepModalOpen) {
        return;
      }
      if (opts?.switchToCancelled) {
        setPaymentModal('cancelled');
      } else {
        setPaymentModal('none');
      }
    };

    pollingControlRef.current = {
      stop: (opts) => stopPolling(opts),
    };

    let pollCount = 0;

    const pollStatus = async () => {
      if (!isPollingActive) return;

      const win = paymentWindowRef.current;
      if (win && win.closed) {
        stopPolling({ switchToCancelled: true });
        setPaymentWindow(null);
        paymentWindowRef.current = null;
        return;
      }

      if (pollCount >= maxPollAttempts) {
        stopPolling();
        setThreeDsHtml(null);
        toast.error('Payment status check timed out. Please check your orders page.');
        setLoadingCheckout(false);
        return;
      }

      pollCount++;

      try {
        const statusResponse = await checkPaymentStatus(paymentRef);

        const status =
          statusResponse?.data?.status ??
          statusResponse?.status ??
          (statusResponse?.data && typeof statusResponse.data === 'string' ? statusResponse.data : null);

        const normalizedStatus = String(status).toLowerCase().trim();

        if (normalizedStatus === 'success') {
          stopPolling({ keepModalOpen: true });

          const w = paymentWindowRef.current;
          if (w && !w.closed) {
            paymentSucceededClosingRef.current = true;
            w.close();
          }
          paymentWindowRef.current = null;
          setPaymentWindow(null);
          setThreeDsHtml(null);

          setTimeout(() => {
            setPaymentModal('none');
            router.push(`/orders?paymentSuccess=true&paymentRef=${encodeURIComponent(paymentRef)}`);
            toast.success('Payment successful! Your order has been placed.');
          }, 500);
        } else if (normalizedStatus === 'failed' || normalizedStatus === 'declined') {
          stopPolling();
          setThreeDsHtml(null);
          toast.error('Payment was declined. Please try again.');
          setLoadingCheckout(false);
        }
      } catch {
        if (!isPollingActive) return;
      }
    };

    pollInterval = setInterval(() => {
      void pollStatus();
    }, PAYMENT_STATUS_POLL_MS);

    void pollStatus();

    safetyTimeout = setTimeout(() => {
      stopPolling();
      setThreeDsHtml(null);
    }, 600000);
  };

  // Open payment in a same-origin page so the Mastercard SDK loads correctly (no document.write).
  const openPaymentInNewTab = (sessionId: string, paymentRef: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/checkout/payment?${new URLSearchParams({
      sessionId: sessionId,
      paymentRef: paymentRef,
      embedded: "1",
    }).toString()}`;
    // Do not pass noopener in the features string — with noopener, window.open() returns null
    // (tab still opens) so we never show the in-page modal or track window.closed.
    const newWindow = window.open(url, "_blank", "width=800,height=700");
    if (!newWindow) {
      toast.error("Please allow popups to complete payment");
      return null;
    }
    try {
      newWindow.opener = null;
    } catch {
      /* cross-origin or already detached */
    }
    return newWindow;
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

      const checkoutData = {
        cart_ids: [cartStore.cartId],
        location: orderLocationData,
        split_order: fulfillableStores.length > 1 ? true : false,
        // Pricing
        subtotal: fulfillableStores.length > 1 ? undefined : (primaryStore.subtotal || 0),
        delivery_charge: fulfillableStores.length > 1 ? undefined : (primaryStore.delivery_cost || 0),
        total_amount: fulfillableStores.length > 1 ? (backendData.overall_total || 0) : (primaryStore.total || backendData.overall_total || 0),
        // Platform identifier for backend analytics
        platform: "web",
        // Payment: new card → saved_card true; saved card → saved_card false + source_token_id
        saved_card: selectedCardId === null,
        // Gateway handles save-card UX; we always allow it for new-card checkout
        save_card: selectedCardId === null,
        ...(selectedCardId != null && { source_token_id: selectedCardId }),
      };

      console.log('📤 Creating checkout session:', checkoutData);
      const checkoutResponse = await createOrder(checkoutData);
      console.log('✅ Checkout session created:', checkoutResponse);

      // Extract payment info from response
      const paymentInfo =
        checkoutResponse?.data?.payment_info ??
        checkoutResponse?.payment_info ??
        checkoutResponse;

      if (!paymentInfo?.payment_reference) {
        throw new Error('Payment reference not received from server');
      }

      const payStatus = String(paymentInfo.status ?? '').toLowerCase().trim();
      const threeDsChallenge =
        payStatus === 'needs_3ds' ||
        (typeof paymentInfo.three_ds_html === 'string' && paymentInfo.three_ds_html.length > 0);

      console.log('💳 Payment info:', {
        session_id: paymentInfo.session_id,
        payment_reference: paymentInfo.payment_reference,
        merchant_id: paymentInfo.merchant_id,
        status: paymentInfo.status,
        three_ds: threeDsChallenge,
      });

      // Store payment session data for callback verification (when session exists)
      if (typeof window !== 'undefined' && paymentInfo.session_id) {
        sessionStorage.setItem('payment_session', JSON.stringify({
          session_id: paymentInfo.session_id,
          payment_reference: paymentInfo.payment_reference,
          success_indicator: paymentInfo.success_indicator,
          cart_id: cartStore.cartId
        }));
      }

      setCurrentPaymentRef(paymentInfo.payment_reference);
      setLoadingCheckout(false);

      // 3DS / OTP challenge (e.g. saved card): render gateway HTML inline, poll until paid
      if (threeDsChallenge && paymentInfo.three_ds_html) {
        setThreeDsHtml(paymentInfo.three_ds_html);
        setPaymentModal('none');
        startPaymentStatusPolling(paymentInfo.payment_reference);
        return;
      }

      // Hosted checkout session (new card): open payment page in new tab
      if (!paymentInfo.session_id) {
        throw new Error('Payment session information not received from server');
      }

      const newPaymentWindow = openPaymentInNewTab(paymentInfo.session_id, paymentInfo.payment_reference);

      if (!newPaymentWindow) {
        toast.error('Failed to open payment window. Please allow popups and try again.');
        setLoadingCheckout(false);
        return;
      }

      paymentSucceededClosingRef.current = false;
      paymentWindowRef.current = newPaymentWindow;
      setPaymentWindow(newPaymentWindow);

      setPaymentModal('loading');

      if (paymentInfo.payment_reference) {
        startPaymentStatusPolling(paymentInfo.payment_reference);
      }

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
          
          <PaymentMethod
            selectedCardId={selectedCardId}
            onCardSelect={setSelectedCardId}
          />
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
            onQuantityChange={fetchPreviewData}
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

      {/* 3DS / bank OTP challenge (inline HTML from gateway, e.g. saved-card flow) */}
      <Dialog
        open={!!threeDsHtml}
        onOpenChange={(open) => {
          if (!open && threeDsHtml) {
            pollingControlRef.current?.stop();
            pollingControlRef.current = null;
            setThreeDsHtml(null);
            setCurrentPaymentRef(null);
            toast.error('Payment verification was cancelled.');
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-2">
          <DialogHeader>
            <DialogTitle>Verify your payment</DialogTitle>
            <DialogDescription>
              Complete the verification below. This page will update when your payment finishes.
            </DialogDescription>
          </DialogHeader>
          {threeDsHtml && (
            <iframe
              title="Payment verification"
              className="w-full min-h-[70vh] flex-1 rounded-md border border-gray-200 bg-white"
              srcDoc={threeDsHtml}
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Payment gateway: same dialog transitions from loading → cancelled when the payment tab is closed */}
      <Dialog
        open={paymentModal !== 'none'}
        onOpenChange={(open) => {
          if (!open && paymentModal === 'loading' && isProcessingPayment) {
            return;
          }
          if (!open) {
            setPaymentModal('none');
            setCurrentPaymentRef(null);
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (paymentModal === 'loading' && isProcessingPayment) e.preventDefault();
          }}
        >
          {paymentModal === 'loading' && (
            <>
              <DialogHeader>
                <DialogTitle>Payment in progress</DialogTitle>
                <DialogDescription>
                  Please complete your payment in the new window that opened.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
                <p className="text-center text-sm text-gray-600">
                  Do not close this page. We will update this when your payment finishes.
                </p>
              </div>
            </>
          )}
          {paymentModal === 'cancelled' && (
            <>
              <DialogHeader>
                <DialogTitle>Payment was cancelled</DialogTitle>
                <DialogDescription>
                  The payment window was closed before the payment completed.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-600 mb-4">
                  Your order has not been placed. You can tap Place Order again when you are ready.
                </p>
                <p className="text-xs text-gray-500">
                  Your cart is unchanged. No charge has been made.
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setPaymentModal('none');
                    setCurrentPaymentRef(null);
                  }}
                >
                  OK
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default CheckoutPage;