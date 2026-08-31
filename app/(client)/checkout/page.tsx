"use client";
import Container from "@/components/Container";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import EmptyCart from "@/components/EmptyCart";
import NoAccessToCart from "@/components/NoAccessToCart";
import Loader from "@/components/Loader";
import AuthRetryScreen from "@/components/AuthRetryScreen";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import useCartStore from "@/store";
import DeliveryDetails from "@/components/DeliveryDetails";
import { useLocation } from "@/contexts/LocationContext";
import {
  previewOrder,
  createOrder,
  getAuthHeaders,
  removeFromCart,
  checkPaymentStatus,
  type CheckoutDeliveryOption,
} from "@/lib/api";
import { clearStaleAddressData, validateAddressOwnership, handleAddressValidationError } from "@/lib/address-utils";
import QuantityMismatchAlert from "@/components/QuantityMismatchAlert";
import OrderSummary from "@/components/OrderSummary";
import PaymentMethod from "@/components/PaymentMethod";
import QuantityButtons from "@/components/QuantityButtons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { CalendarClock, Timer, Store, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SuggestedAddonsDialog from "@/components/SuggestedAddonsDialog";

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
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<CheckoutDeliveryOption>('meet_outside');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledLocal, setScheduledLocal] = useState<string>("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [refreshingPreview, setRefreshingPreview] = useState(false);
  const [showQuantityMismatchAlert, setShowQuantityMismatchAlert] = useState(false);
  const [mismatchedItems, setMismatchedItems] = useState<any[]>([]);
  const [processingQuantityMismatch, setProcessingQuantityMismatch] = useState(false);
  const [showMultiStoreDialog, setShowMultiStoreDialog] = useState(false);
  const [splitDecisionMade, setSplitDecisionMade] = useState(false);
  const [splitOrderSelected, setSplitOrderSelected] = useState<boolean>(false);
  const [editorMode, setEditorMode] = useState(false);
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
  
  const { user, loading, unresolved, isGuest } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showSuggestedAddons, setShowSuggestedAddons] = useState(false);

  // Auto-open suggested addons when arriving from cart preview
  useEffect(() => {
    const shouldSuggest = searchParams?.get("suggest") === "1";
    if (shouldSuggest) setShowSuggestedAddons(true);
  }, [searchParams]);

  useEffect(() => {
    if (isGuest) {
      router.push("/login?returnUrl=" + encodeURIComponent("/checkout"));
    }
  }, [isGuest, router]);

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
        try {
          await cartStore.switchCart(cartStore.cartId);
        } catch (error) {
          console.error('❌ Failed to sync cart:', error);
        }
      }
    };

    ensureCartItemsData();
  }, [user, cartStore.cartId, cartStore.items.length]);

  // Read latest preview for skeleton vs refresh without putting it in callback deps
  // (that previously recreated this function after every response and re-fetched in a loop).
  const previewDataRef = React.useRef(previewData);
  previewDataRef.current = previewData;
  const previewRequestIdRef = React.useRef(0);
  const pickupStoreId = selectedOrderType === "pickup" ? selectedStore?.id ?? null : null;

  // Fetch preview data function - extracted to be reusable
  const fetchPreviewData = React.useCallback(async () => {
    // Don't fetch if user is not authenticated
    if (!user || loading) {
      return;
    }

    if (!contextAddressId || !cartStore.cartId || cartStore.items.length === 0) {
      return;
    }

    const shouldShowSkeleton = !previewDataRef.current;
    const requestId = ++previewRequestIdRef.current;
    try {
      if (shouldShowSkeleton) setLoadingPreview(true);
      else setRefreshingPreview(true);
      
      // Prepare location data based on order type
      const locationData = selectedOrderType === 'pickup' 
        ? {
            address_id: null, // No address needed for pickup
            mode: selectedOrderType,
            store_id: pickupStoreId ? parseInt(String(pickupStoreId)) : null, // Use selected store for pickup
            delivery_service_level: undefined // No delivery service for pickup
          }
        : {
            address_id: contextAddressId, // Address required for delivery
            mode: selectedOrderType,
            store_id: null, // No store for delivery
            delivery_service_level: selectedDeliveryService,
            delivery_option: selectedDeliveryOption,
          };

      const response = await previewOrder({
        cart_ids: [cartStore.cartId],
        location: locationData,
        split_order: true // Enable split orders by default
      });

      if (requestId !== previewRequestIdRef.current) {
        return;
      }

      setPreviewData(response);
    } catch (error: any) {
      if (requestId !== previewRequestIdRef.current) {
        return;
      }

      console.error('❌ Failed to fetch preview data:', error);
      
      // Handle authentication errors specifically
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        router.push("/login?returnUrl=" + encodeURIComponent("/checkout"));
        return;
      }
      
      // Handle address validation errors
      if (error.message?.includes('422') && error.message?.includes('Address') && error.message?.includes('not found')) {
        handleAddressValidationError();
        toast.error('Address data has been cleared. Please select your address again.');
        return;
      }
      
      toast.error('Failed to load order details');
    } finally {
      if (requestId === previewRequestIdRef.current) {
        if (shouldShowSkeleton) setLoadingPreview(false);
        setRefreshingPreview(false);
      }
    }
  }, [user, loading, contextAddressId, cartStore.cartId, cartStore.items.length, selectedOrderType, selectedDeliveryService, selectedDeliveryOption, pickupStoreId, router]);

  const previewRefreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Match product cards: instant local cart update, debounced backend sync, then refresh preview.
  const schedulePreviewRefresh = React.useCallback(() => {
    if (previewRefreshTimeoutRef.current) {
      clearTimeout(previewRefreshTimeoutRef.current);
    }
    previewRefreshTimeoutRef.current = setTimeout(async () => {
      const waitStart = Date.now();
      await new Promise<void>((resolve) => {
        const t = setInterval(() => {
          const syncing = useCartStore.getState().isSyncing;
          const elapsed = Date.now() - waitStart;
          if (!syncing || elapsed > 2000) {
            clearInterval(t);
            resolve();
          }
        }, 100);
      });
      await fetchPreviewData();
    }, 400);
  }, [fetchPreviewData]);

  React.useEffect(() => {
    return () => {
      if (previewRefreshTimeoutRef.current) {
        clearTimeout(previewRefreshTimeoutRef.current);
      }
    };
  }, []);

  const refreshCheckoutAfterSuggestions = React.useCallback(async () => {
    try {
      // Wait for debounced cart sync (addItem/removeItem/updateQuantity) to finish.
      const waitStart = Date.now();
      await new Promise<void>((resolve) => {
        const t = setInterval(() => {
          const syncing = useCartStore.getState().isSyncing;
          const elapsed = Date.now() - waitStart;
          if (!syncing || elapsed > 2000) {
            clearInterval(t);
            resolve();
          }
        }, 100);
      });

      // Pull the latest cart state from backend so preview reflects newly added items.
      const cartId = useCartStore.getState().cartId;
      if (cartId) {
        await useCartStore.getState().switchCart(cartId);
      }

      await fetchPreviewData();
    } catch (e) {
      console.error("Failed to refresh checkout after suggestions popup:", e);
      // Even if refresh fails, don't block checkout UX.
    }
  }, [fetchPreviewData]);

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

  const isFarDelivery = React.useMemo(() => {
    const be = previewData?.data || previewData;
    const candidates = [
      be?.location?.delivery_service_level,
      be?.delivery_service_level,
      be?.delivery?.service_level,
      be?.fulfillable_stores?.[0]?.delivery_service_level,
      be?.fulfillable_stores?.[0]?.delivery?.service_level,
    ];
    return candidates.some((v) => String(v ?? "").toLowerCase().trim() === "far_delivery");
  }, [previewData]);

  const getScheduleLeadTimeMs = React.useCallback(() => {
    // Backend rule: delivery/pickup = 3 hrs, far_delivery = 2 days
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

    if (selectedOrderType === "pickup") return THREE_HOURS_MS;

    if (isFarDelivery) return TWO_DAYS_MS;

    return THREE_HOURS_MS;
  }, [selectedOrderType, isFarDelivery]);

  const formatForDatetimeLocal = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
      date.getMinutes()
    )}`;
  };

  const roundUpToNextMinutes = (d: Date, stepMinutes: number) => {
    const ms = d.getTime();
    const stepMs = stepMinutes * 60 * 1000;
    return new Date(Math.ceil(ms / stepMs) * stepMs);
  };

  const scheduleLeadTimeMs = getScheduleLeadTimeMs();
  const minScheduledDateLocal = formatForDatetimeLocal(roundUpToNextMinutes(new Date(Date.now() + scheduleLeadTimeMs), 5));

  const scheduledAtUtc = React.useMemo(() => {
    if (!isScheduled) return null;
    if (!scheduledLocal) return null;
    const dt = new Date(scheduledLocal);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString(); // always UTC with Z
  }, [isScheduled, scheduledLocal]);

  const scheduleValidationError = React.useMemo(() => {
    if (!isScheduled) return null;
    if (!scheduledLocal) return "Please select a schedule date and time.";
    const dt = new Date(scheduledLocal);
    if (Number.isNaN(dt.getTime())) return "Invalid scheduled date/time.";
    const min = Date.now() + scheduleLeadTimeMs;
    if (dt.getTime() < min) {
      const leadHours = scheduleLeadTimeMs / (60 * 60 * 1000);
      if (leadHours >= 24) return "Scheduled time must be at least 2 days from now.";
      return "Scheduled time must be at least 3 hours from now.";
    }
    return null;
  }, [isScheduled, scheduledLocal, scheduleLeadTimeMs]);

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
      if (scheduleValidationError) {
        toast.error(scheduleValidationError);
        return;
      }

      setLoadingCheckout(true);

      // Extract pricing data from preview
      const backendData = previewData?.data || previewData;
      const fulfillableStores = backendData?.fulfillable_stores || [];
      const primaryStore = fulfillableStores?.[0] || {};

      // If user opted to adjust (multi-store "No, I'll adjust"), block checkout until only one store remains.
      if (editorMode && fulfillableStores.length > 1 && splitOrderSelected === false) {
        toast.error("Please delete items from other stores until only one store remains.");
        return;
      }

      const shouldSplitOrders =
        splitDecisionMade ? splitOrderSelected : fulfillableStores.length > 1;
      
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
            delivery_service_level: selectedDeliveryService,
            delivery_option: selectedDeliveryOption,
          };

      const checkoutData = {
        cart_ids: [cartStore.cartId],
        location: orderLocationData,
        split_order: shouldSplitOrders ? true : false,
        // Pricing
        subtotal: shouldSplitOrders ? undefined : (primaryStore.subtotal || 0),
        delivery_charge: shouldSplitOrders ? undefined : (primaryStore.delivery_cost || 0),
        total_amount: shouldSplitOrders
          ? (backendData.overall_total || 0)
          : (primaryStore.total || backendData.overall_total || 0),
        // Platform identifier for backend analytics
        platform: "web",
        // Payment: new card → saved_card true; saved card → saved_card false + source_token_id
        saved_card: selectedCardId === null,
        // Gateway handles save-card UX; we always allow it for new-card checkout
        save_card: selectedCardId === null,
        ...(selectedCardId != null && { source_token_id: selectedCardId }),
        ...(isScheduled && scheduledAtUtc
          ? {
              is_scheduled: true,
              scheduled_at: scheduledAtUtc,
            }
          : { is_scheduled: false }),
      };

      const checkoutResponse = await createOrder(checkoutData);

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

  const handleEnterEditMode = () => {
    if ((fulfillableStores?.length || 0) < 2) return;
    setEditorMode(true);
    setShowMultiStoreDialog(false);
  };

  const handleDiscardAdjustDecision = () => {
    // This does not restore deleted items — it only discards the "I'll adjust" decision
    // and brings back the multi-store choice popup.
    setEditorMode(false);
    setConfirmStoreId(null);
    setSplitOrderSelected(false);
    setSplitDecisionMade(false);
    setShowMultiStoreDialog(true);
  };

  const handlePromptDeleteStore = (storeId: number) => {
    setConfirmStoreId(storeId);
  };

  const handleConfirmDeleteStore = async () => {
    if (confirmStoreId == null) return;
    if (!cartStore.cartId) {
      setConfirmStoreId(null);
      toast.error("Cart ID is required.");
      return;
    }

    try {
      setLoadingPreview(true);

      const store = fulfillableStores.find((s: any) => s.store_id === confirmStoreId);
      const deletions: Promise<any>[] = [];

      for (const item of (store?.items || [])) {
        const productId = item.product_id ?? item.product?.id;
        if (!productId) {
          console.warn("⚠️ Skipping delete for item with missing product id:", item);
          continue;
        }
        const qty =
          typeof item.quantity === "number" && item.quantity > 0
            ? item.quantity
            : cartStore.items.find((ci: any) => ci?.product?.id === productId)?.quantity;

        // Keep local cart (CartPreviewPanel) in sync immediately, without triggering store's debounced backend delete
        await cartStore.deleteCartProduct(productId, { skipBackendSync: true });

        // Backend supports optional quantity param. Prefer removing the full quantity for this store item.
        deletions.push(removeFromCart(cartStore.cartId, productId, qty));
      }

      await Promise.allSettled(deletions);
      setConfirmStoreId(null);

      // Re-sync cart from backend to avoid any divergence (shared carts, partial removals, etc.)
      await cartStore.switchCart(cartStore.cartId);

      // Refresh preview with split_order: false (single-store intent) so the UI updates immediately.
      const refreshLocationData =
        selectedOrderType === "pickup"
          ? {
              address_id: null,
              mode: selectedOrderType,
              store_id: selectedStore?.id ? parseInt(selectedStore.id) : null,
              delivery_service_level: undefined,
            }
          : {
              address_id: contextAddressId!,
              mode: selectedOrderType,
              store_id: null,
              delivery_service_level: selectedDeliveryService,
              delivery_option: selectedDeliveryOption,
            };

      const refreshed = await previewOrder({
        cart_ids: [cartStore.cartId],
        location: refreshLocationData,
        split_order: false,
      });

      setPreviewData(refreshed);
      const stores = (refreshed?.data || refreshed)?.fulfillable_stores || [];

      // If the user deleted items down to a single store, exit edit mode.
      if (stores.length === 1) {
        setEditorMode(false);
        toast.success("Ready to place single-store order");
      } else if (stores.length > 1) {
        // Keep edit mode so the user can delete from other stores too.
        setEditorMode(true);
        setShowMultiStoreDialog(false);
      } else {
        setEditorMode(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete items from this store.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCancelDeleteStore = () => {
    setConfirmStoreId(null);
  };

  if (loading && !unresolved) {
    return <Loader />;
  }

  if (unresolved) {
    return <AuthRetryScreen />;
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
      <SuggestedAddonsDialog
        open={showSuggestedAddons}
        onOpenChange={(open) => {
          setShowSuggestedAddons(open);
          if (!open) {
            void refreshCheckoutAfterSuggestions();
            if (searchParams?.get("suggest") === "1") router.replace("/checkout");
          }
        }}
        onContinue={() => {
          setShowSuggestedAddons(false);
          void refreshCheckoutAfterSuggestions();
          if (searchParams?.get("suggest") === "1") {
            router.replace("/checkout");
          }
        }}
        title="Popular items to add before checkout"
        description="Quick add-ons that go well with your cart."
      />
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* Left Side - Delivery Details and Payment Method */}
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          <DeliveryDetails
            onLocationChange={handleLocationChange}
            selectedLocation={selectedLocation}
            selectedDeliveryService={selectedDeliveryService}
            onDeliveryServiceChange={setSelectedDeliveryService}
            selectedDeliveryOption={selectedDeliveryOption}
            onDeliveryOptionChange={setSelectedDeliveryOption}
            loading={loadingPreview}
          />

          {loadingPreview ? (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Timer
                      className="h-4 w-4 shrink-0 text-neutral-400 sm:h-[18px] sm:w-[18px] md:h-5 md:w-5"
                      aria-hidden
                    />
                    <div className="h-4 sm:h-5 w-36 rounded-md bg-gray-200 animate-pulse md:w-40" />
                  </div>
                  <div className="h-7 w-12 shrink-0 rounded-full bg-gray-200 animate-pulse" />
                </div>
              </CardHeader>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2 min-w-0">
                    <Timer
                      className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-5 md:w-5 shrink-0 text-neutral-600"
                      aria-hidden
                    />
                    <span className="truncate">Schedule order</span>
                  </CardTitle>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isScheduled}
                    aria-label={isScheduled ? "Turn off scheduled order" : "Schedule this order for later"}
                    onClick={() => {
                      setIsScheduled((prev) => {
                        const next = !prev;
                        if (!next) setScheduledLocal("");
                        return next;
                      });
                    }}
                    className={[
                      "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
                      isScheduled ? "bg-black" : "bg-neutral-300",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
                        isScheduled ? "translate-x-6" : "translate-x-1",
                      ].join(" ")}
                    />
                  </button>
                </div>
              </CardHeader>
              {(isScheduled || (selectedOrderType === "delivery" && isFarDelivery)) && (
                <CardContent className="space-y-3">
                  {selectedOrderType === "delivery" && isFarDelivery && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      This address is eligible for far delivery. Scheduled orders require a minimum 2-day lead time.
                    </div>
                  )}
                  {isScheduled && (
                    <div className="space-y-2">
                      <div className="relative rounded-xl border-2 border-neutral-200 bg-neutral-50/90 p-1 shadow-sm transition-colors hover:border-neutral-300 focus-within:border-black focus-within:bg-white focus-within:shadow-md focus-within:ring-2 focus-within:ring-black/10">
                        <CalendarClock
                          className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-neutral-500 sm:h-[18px] sm:w-[18px]"
                          aria-hidden
                        />
                        <Input
                          id="scheduled-at"
                          type="datetime-local"
                          value={scheduledLocal}
                          min={minScheduledDateLocal}
                          onChange={(e) => setScheduledLocal(e.target.value)}
                          className="h-11 border-0 bg-transparent pl-10 pr-2 text-sm font-medium text-neutral-900 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm [color-scheme:light]"
                        />
                      </div>
                      {scheduleValidationError && (
                        <div className="text-xs text-red-600">{scheduleValidationError}</div>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          <PaymentMethod
            selectedCardId={selectedCardId}
            onCardSelect={setSelectedCardId}
            previewLoading={loadingPreview}
          />
        </div>

        {/* Right Side - Order Summary */}
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          {editorMode && fulfillableStores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-sm sm:text-base md:text-lg">
                  <span>Edit Items by Store</span>
                  {fulfillableStores.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDiscardAdjustDecision}
                      disabled={loadingPreview}
                      className="text-xs sm:text-sm"
                    >
                      Discard changes
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {fulfillableStores.map((store: any) => {
                    return (
                    <div key={store.store_id} className="border rounded-lg p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                          {store.store_name}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handlePromptDeleteStore(store.store_id)}
                          disabled={loadingPreview}
                          className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5"
                        >
                          Delete All
                        </Button>
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
                          const fullProduct = cartStore.items.find((ci: any) => ci.product.id === it.product_id)?.product || cartProduct || beProduct;
                          return (
                            <div key={`${store.store_id}-${it.product_id ?? it.id ?? idx}`} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                                {hasValidImage ? (
                                  <img src={imageUrl as string} alt={productName} loading="lazy" className="object-cover w-full h-full" />
                                ) : (
                                  <span className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-300 rounded" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="truncate">{productName}</div>
                                <div className="text-[10px] sm:text-xs text-gray-500">Qty: {it.quantity}</div>
                              </div>
                              <div className="text-xs sm:text-sm font-medium">LKR {unitPrice.toFixed(2)}</div>
                              {fullProduct && (
                                <div className="flex-shrink-0">
                                  <QuantityButtons
                                    product={fullProduct}
                                    className="text-[10px] sm:text-xs"
                                    onQuantityChange={schedulePreviewRefresh}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );})}
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
            onQuantityChange={schedulePreviewRefresh}
            onEditMultiStore={handleEnterEditMode}
            editMultiStoreDisabled={editorMode}
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
        <DialogContent className="max-w-[92vw] gap-5 rounded-2xl border-0 p-6 shadow-xl sm:max-w-xl">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Store className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-[15px] font-semibold leading-snug">
                  Split across {fulfillableStores.length} stores
                </DialogTitle>
                <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
                  Items will be fulfilled separately. You&apos;ll place {fulfillableStores.length} orders at checkout.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[min(50vh,320px)] overflow-y-auto pr-0.5">
            <div className="grid grid-cols-2 gap-3">
              {fulfillableStores.map((s: any, sIdx: number) => {
                const storeItems = s.items || [];
                const itemCount = storeItems.length;
                const previewItems = storeItems.slice(0, 4);

                return (
                  <div
                    key={s.store_id ?? `store-${sIdx}`}
                    className="flex min-h-[120px] flex-col rounded-xl border border-border/50 bg-muted/40 p-3"
                  >
                    <div className="mb-2.5 flex flex-wrap gap-1">
                      {previewItems.map((it: any, idx: number) => {
                        const beProduct = it.product;
                        const cartProduct = cartStore.items.find(
                          (ci: any) => ci.product.id === it.product_id
                        )?.product;
                        const imageUrl =
                          beProduct?.image_urls?.[0] ||
                          beProduct?.imageUrl ||
                          cartProduct?.image_urls?.[0] ||
                          cartProduct?.imageUrl;
                        const hasImage =
                          imageUrl &&
                          typeof imageUrl === "string" &&
                          imageUrl.trim() !== "" &&
                          imageUrl.startsWith("http");

                        return (
                          <div
                            key={`${s.store_id}-${it.product_id ?? idx}`}
                            className="relative h-9 w-9 overflow-hidden rounded-md ring-1 ring-background"
                          >
                            {hasImage ? (
                              <Image
                                src={imageUrl as string}
                                alt=""
                                width={36}
                                height={36}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-muted">
                                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {itemCount > 4 && (
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-[10px] font-medium text-muted-foreground ring-1 ring-background">
                          +{itemCount - 4}
                        </div>
                      )}
                      {itemCount === 0 && (
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted ring-1 ring-background">
                          <Store className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                      {s.store_name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </p>
                    <p className="mt-auto pt-2 text-sm font-semibold tabular-nums text-foreground">
                      LKR {(s.subtotal || 0).toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5">
            <span className="text-sm text-muted-foreground">Order total</span>
            <span className="text-sm font-semibold tabular-nums">
              LKR {(backendData?.overall_total || 0).toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              onClick={handleConfirmSplitNo}
              disabled={loadingPreview}
              className="h-10 flex-1 text-muted-foreground hover:text-foreground"
            >
              Adjust items
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSplitYes}
              disabled={loadingPreview}
              className="h-10 flex-1"
            >
              Place {fulfillableStores.length} orders
            </Button>
          </div>
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