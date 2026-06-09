'use client';
import Container from "@/components/Container";
import { FileX, Package, CheckCircle, XCircle, Clock, Truck, CheckSquare, X, RotateCcw, Plus, ShoppingBag, Phone, User, CalendarClock } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Order, DriverInfo, RiderInfo } from "@/store";
import { getAuthHeaders, getUserOrders, NEXT_PUBLIC_API_BASE_URL, API_BASE_URL } from "@/lib/api";
import {
  canCancelOrderAsCustomer,
  getOrderStatusFromPayload,
  getOrderStatusesForTab,
  normalizeOrderStatus,
  type OrderFilterTab,
} from "@/lib/order-status";
import toast from "react-hot-toast";
import PriceFormatter from "@/components/PriceFormatter";
import ReorderDialog from "@/components/ReorderDialog";
import Loader from "@/components/Loader";
import useCartStore from "@/store";

const OrdersPageContent = () => {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<OrderFilterTab>('ongoing');
  const isInitialOrdersLoad = useRef(true);
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetOrder, setCancelTargetOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const cartStore = useCartStore();
  const paymentSuccessHandled = React.useRef(false);

  // Get status display info
  const getStatusInfo = (status: string) => {
    const statusUpper = normalizeOrderStatus(status);
    switch (statusUpper) {
      case 'PENDING':
      case 'PAYMENT_PENDING':
        return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'CONFIRMED':
      case 'PAID':
        return { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckSquare };
      case 'PROCESSING':
      case 'PREPARING':
      case 'IN_PROGRESS':
        return { label: 'Processing', color: 'bg-purple-100 text-purple-800', icon: Package };
      case 'PACKED':
        return { label: 'Packed', color: 'bg-indigo-100 text-indigo-800', icon: Package };
      case 'READY':
        return { label: 'Ready', color: 'bg-indigo-100 text-indigo-800', icon: Package };
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
      case 'DISPATCHED':
        return { label: 'Shipped', color: 'bg-orange-100 text-orange-800', icon: Truck };
      case 'DELIVERED':
      case 'COMPLETED':
      case 'COMPLETE':
        return { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'CANCELLED':
      case 'CANCELED':
      case 'VOID':
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle };
      default:
        return { label: statusUpper.replace(/_/g, ' '), color: 'bg-gray-100 text-gray-800', icon: Clock };
    }
  };

  // Fetch orders function - extracted to be reusable
  const fetchOrders = useCallback(async (
    filter: OrderFilterTab,
    options: { showInitialLoading?: boolean; showOrdersLoading?: boolean } = {}
  ) => {
    const { showInitialLoading = false, showOrdersLoading = false } = options;

    if (!authLoading && user) {
      if (showInitialLoading) setInitialLoading(true);
      if (showOrdersLoading) setOrdersLoading(true);
      try {
        const statuses = getOrderStatusesForTab(filter);
        const response = await getUserOrders(1, 50, statuses, true, true, true, true);
        
        // Handle the new API response structure: { statusCode, message, data: { orders, pagination } }
        let backendOrders = [];
        
        if (response.statusCode && response.data) {
          // New structure with statusCode and data wrapper
          backendOrders = response.data.orders || [];
        } else if (Array.isArray(response)) {
          // Direct array response (fallback)
          backendOrders = response;
        } else if (response.data && Array.isArray(response.data)) {
          // Data wrapper with direct array
          backendOrders = response.data;
        } else if (response.orders && Array.isArray(response.orders)) {
          // Old structure with orders key
          backendOrders = response.orders;
        } else if (response.data?.orders && Array.isArray(response.data.orders)) {
          // Nested data.orders structure
          backendOrders = response.data.orders;
        }
        
        // Log clean orders data

        // Normalize driver data from backend (sent when status is Shipped or later)
        const mapDriver = (raw: any): DriverInfo | undefined => {
          const d = raw?.driver ?? raw?.driver_info ?? raw?.assigned_driver ?? raw?.delivery_driver;
          if (!d || typeof d !== 'object') return undefined;
          const name = d.name ?? d.driver_name ?? d.full_name;
          const phone = d.phone ?? d.phone_number ?? d.mobile ?? d.contact_number;
          const vehicle = d.vehicle_number ?? d.vehicle ?? d.vehicle_no;
          if (!name && !phone && !vehicle) return undefined;
          return { name, phone, vehicle_number: vehicle, vehicle };
        };

        // Normalize rider data from backend (sent when status is Shipped and include_rider=true)
        const mapRider = (raw: any): RiderInfo | undefined => {
          const r = raw?.rider;
          if (!r || typeof r !== 'object') return undefined;
          const name = r.name;
          const phone = r.phone ?? r.phone_number;
          const vehicle_type = r.vehicle_type;
          const vehicle_registration_number = r.vehicle_registration_number;
          if (!name && !phone && !vehicle_type && !vehicle_registration_number) return undefined;
          return { name, phone, vehicle_type, vehicle_registration_number };
        };

        // Convert backend orders to local Order format based on API schema
        const convertedOrders: Order[] = backendOrders.map((order: any) => {
          const scheduledAtRaw =
            order.scheduled_at ??
            order.scheduledAt ??
            order.scheduled_for ??
            null;
          const explicitlyNotScheduled =
            order.is_scheduled === false || order.isScheduled === false;
          const isScheduled =
            !explicitlyNotScheduled &&
            (order.is_scheduled === true ||
              order.isScheduled === true ||
              Boolean(
                typeof scheduledAtRaw === "string" && scheduledAtRaw.trim(),
              ));

          const normalizedStatus = getOrderStatusFromPayload(order);
          const statusUpper = normalizedStatus;
          const driver = mapDriver(order);
          const rider = mapRider(order);
          if ((statusUpper === 'SHIPPED' || statusUpper === 'DELIVERED') && (order.rider ?? order.driver ?? order.driver_info ?? order.assigned_driver)) {
          }

          // Use included product data directly from API response
          const itemsWithDetails = (order.items || []).map((item: any) => {
            // Handle product data - can be in item.product or null if not included
            const product = item.product || {};
            
            // Extract product name - try multiple possible fields
            const productName = product.name || 
                               product.title || 
                               product.product_name ||
                               `Product ${item.product_id}`;
            
            // Extract image URL - try multiple possible fields
            const imageUrl = product.image_urls?.[0] || 
                           product.image_url || 
                           product.imageUrl || 
                           product.image ||
                           product.primary_image ||
                           null;
            
            return {
              productId: item.product_id,
              name: productName,
              price: item.unit_price || 0,
              quantity: item.quantity || 0,
              imageUrl: imageUrl
            };
          });

          return {
            id: order.id?.toString() || 'unknown',
            orderNumber: order.id?.toString() || order.payment_reference || 'unknown',
            customerName: user.displayName || "Customer",
            email: user.email || "",
            totalAmount: order.total_amount || 0,
            status: normalizedStatus,
            createdAt: order.created_at || new Date().toISOString(),
            userId: order.user_id || user.uid,
            items: itemsWithDetails,
            payment: null,
            location: null,
            // Store additional fields for detailed view
            storeId: order.store_id,
            updatedAt: order.updated_at,
            sourceCartId: order.items?.[0]?.source_cart_id,
            fulfillmentMode: order.fulfillment_mode || 'delivery',
            deliveryCharge: order.delivery_charge || 0,
            paymentReference: order.payment_reference,
            transactionId: order.transaction_id,
            driver,
            rider,
            isScheduled,
            scheduledAt: typeof scheduledAtRaw === "string" && scheduledAtRaw.trim()
              ? scheduledAtRaw.trim()
              : undefined,
          };
        });
        
        setOrders(convertedOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load orders');
        setOrders([]);
      } finally {
        if (showInitialLoading) setInitialLoading(false);
        if (showOrdersLoading) setOrdersLoading(false);
      }
    } else if (!authLoading && !user) {
      setInitialLoading(false);
      router.push("/login?returnUrl=" + encodeURIComponent("/orders"));
    }
  }, [user, authLoading, router]);

  // Handle payment success redirect (separate effect to avoid re-triggering)
  useEffect(() => {
    if (authLoading) return;

    const paymentSuccess = searchParams.get('paymentSuccess');
    const paymentRef = searchParams.get('paymentRef');
    const success = searchParams.get('success');
    const orderId = searchParams.get('orderId');
    
    // Handle payment success redirect (only once)
    if (paymentSuccess === 'true' && paymentRef && !paymentSuccessHandled.current) {
      paymentSuccessHandled.current = true;
      
      // Remove query params from URL immediately (before async operations)
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/orders');
      }
      
      // Show success message immediately (don't wait for cart operations)
      toast.success('Payment successful! Your order has been placed.');
      
      // Handle cart operations in background (non-blocking)
      const handlePaymentSuccessRedirect = async () => {
        if (!user) return;

        try {
          // Create a new cart for future use (don't clear the old cart - it's already used for the order)
          // The old cart will remain in the carts list but won't be active anymore
          await cartStore.createNewCart();
        } catch (error) {
          console.error('Error creating new cart after payment success:', error);
          // Don't show error toast - cart operations are not critical
        }
      };
      
      // Run cart operations in background
      handlePaymentSuccessRedirect();
      
      // Refresh orders after a short delay to ensure backend has processed
      setTimeout(() => {
        fetchOrders(activeFilter);
      }, 1000);
    } else if (success === 'true' && orderId && !paymentSuccessHandled.current) {
      paymentSuccessHandled.current = true;
      // Show success message and refresh orders
      toast.success('Order placed successfully!');
      // Remove query params from URL
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/orders');
      }
      // Refresh orders after a short delay to ensure backend has processed
      setTimeout(() => {
        fetchOrders(activeFilter);
      }, 1000);
    }
  }, [searchParams, cartStore, fetchOrders, authLoading, user, activeFilter]);

  useEffect(() => {
    isInitialOrdersLoad.current = true;
  }, [user?.uid]);

  // Fetch orders when auth is ready or when the status tab changes (API filters via `status` query)
  useEffect(() => {
    if (authLoading || !user) return;

    if (isInitialOrdersLoad.current) {
      isInitialOrdersLoad.current = false;
      fetchOrders(activeFilter, { showInitialLoading: true });
      return;
    }

    fetchOrders(activeFilter, { showOrdersLoading: true });
  }, [user, authLoading, activeFilter, fetchOrders]);

  // Reorder handlers
  const handleReorderClick = (order: Order) => {
    setSelectedOrder(order);
    setShowReorderDialog(true);
  };

  const openCancelDialog = (order: Order) => {
    setCancelTargetOrder(order);
    setCancelReason("");
    setCancelDialogOpen(true);
  };

  const submitCancel = async () => {
    if (!cancelTargetOrder) return;
    setCancelSubmitting(true);
    try {
      const authHeaders = await getAuthHeaders();
      const baseUrl = NEXT_PUBLIC_API_BASE_URL || API_BASE_URL;
      const response = await fetch(`${baseUrl}/orders/${cancelTargetOrder.id}/cancel`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          reason: cancelReason.trim() ? cancelReason.trim() : undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || `Failed to cancel order (${response.status})`);
      }

      toast.success("Order cancelled");
      setCancelDialogOpen(false);
      setCancelTargetOrder(null);
      setCancelReason("");
      await fetchOrders(activeFilter);
    } catch (error) {
      console.error("Cancel order error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to cancel order");
    } finally {
      setCancelSubmitting(false);
    }
  };




  // Skeleton loader component
  const OrderSkeleton = () => (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Order Info Skeleton */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm mb-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            </div>

            {/* Order Items Skeleton */}
            <div className="space-y-3">
              {[1, 2].map((index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Total Skeleton */}
          <div className="lg:ml-6 lg:border-l lg:pl-6">
            <div className="text-right">
              <div className="flex justify-between items-center mb-2">
                <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (authLoading || initialLoading || !user) {
    return (
      <div>
        <Container className="py-10">
          <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="grid grid-cols-3 gap-1 sm:flex sm:gap-2 sm:w-auto">
                <div className="h-7 sm:h-10 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-7 sm:h-10 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-7 sm:h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Orders Skeleton */}
            <div className="space-y-4">
              {[1, 2, 3].map((index) => (
                <OrderSkeleton key={index} />
              ))}
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div>
      <Container className="py-4 sm:py-6 md:py-10">
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">My Orders</h1>
            <div className="grid grid-cols-3 gap-1 sm:flex sm:gap-2 sm:w-auto">
              <Button
                size="sm"
                variant={activeFilter === 'ongoing' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('ongoing')}
                disabled={ordersLoading}
                className={`h-7 px-1.5 text-[11px] sm:h-8 sm:px-3 sm:text-sm ${
                  activeFilter === 'ongoing' 
                    ? 'bg-black text-white hover:bg-gray-800' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1.5 shrink-0" />
                Ongoing
              </Button>
              <Button
                size="sm"
                variant={activeFilter === 'completed' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('completed')}
                disabled={ordersLoading}
                className={`h-7 px-1.5 text-[11px] sm:h-8 sm:px-3 sm:text-sm ${
                  activeFilter === 'completed' 
                    ? 'bg-black text-white hover:bg-gray-800' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1.5 shrink-0" />
                Completed
              </Button>
              <Button
                size="sm"
                variant={activeFilter === 'cancelled' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('cancelled')}
                disabled={ordersLoading}
                className={`h-7 px-1.5 text-[11px] sm:h-8 sm:px-3 sm:text-sm ${
                  activeFilter === 'cancelled' 
                    ? 'bg-black text-white hover:bg-gray-800' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1.5 shrink-0" />
                Cancelled
              </Button>
            </div>
          </div>

          {/* Orders List */}
          {ordersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((index) => (
                <OrderSkeleton key={index} />
              ))}
            </div>
          ) : orders?.length ? (
            <div className="space-y-4">
              {orders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <Card key={order.id} className="w-full hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Order Info */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <h3 className="text-sm sm:text-base md:text-lg font-semibold">
                              Order #{order.orderNumber}
                              <span className="text-xs sm:text-sm text-gray-500 font-normal ml-1">
                                ({order.items?.length || 0} items)
                              </span>
                            </h3>
                            <Badge className={`${statusInfo.color} text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                              <span className="truncate">{new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            {order.isScheduled && order.scheduledAt && !Number.isNaN(new Date(order.scheduledAt).getTime()) && (
                              <div className="flex items-center gap-1.5 sm:gap-2 text-violet-800">
                                <CalendarClock className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                                <span className="truncate font-medium">
                                  Scheduled for{" "}
                                  {new Date(order.scheduledAt).toLocaleDateString()} at{" "}
                                  {new Date(order.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              {order.fulfillmentMode === 'pickup' ? (
                                <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
                              ) : (
                                <Truck className="w-3 h-3 sm:w-4 sm:h-4" />
                              )}
                              <span>{order.fulfillmentMode === 'pickup' ? 'Pickup' : 'Delivery'}</span>
                            </div>
                            {order.deliveryCharge && order.deliveryCharge > 0 && (
                              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
                                <span>Delivery Fee:</span>
                                <span className="font-medium">
                                  (<PriceFormatter amount={order.deliveryCharge} className="text-[10px] sm:text-xs" />)
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Rider/Driver details - shown when status is Shipped or Delivered */}
                          {(() => {
                            const statusStr = String(order.status).toUpperCase();
                            const rider = order.rider;
                            const driver = order.driver;
                            const hasRider = rider && (rider.name || rider.phone || rider.vehicle_type || rider.vehicle_registration_number);
                            const hasDriver = driver && (driver.name || driver.phone || driver.vehicle_number || driver.vehicle);
                            const showDetails = (statusStr === 'SHIPPED' || statusStr === 'DELIVERED') && (hasRider || hasDriver);
                            if (!showDetails) return null;
                            return (
                              <div className="mb-3 sm:mb-4 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                                <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-orange-800 mb-2">
                                  <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  {hasRider ? 'Rider details' : 'Driver details'}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] sm:text-xs text-gray-700">
                                  {hasRider ? (
                                    <>
                                      {rider!.name && (
                                        <div className="flex items-center gap-1.5">
                                          <User className="w-3 h-3 shrink-0" />
                                          <span>{rider!.name}</span>
                                        </div>
                                      )}
                                      {rider!.phone && (
                                        <a href={`tel:${rider!.phone}`} className="flex items-center gap-1.5 hover:underline">
                                          <Phone className="w-3 h-3 shrink-0" />
                                          <span>{rider!.phone}</span>
                                        </a>
                                      )}
                                      {rider!.vehicle_type && (
                                        <div className="flex items-center gap-1.5">
                                          <Truck className="w-3 h-3 shrink-0" />
                                          <span className="capitalize">{rider!.vehicle_type}</span>
                                        </div>
                                      )}
                                      {rider!.vehicle_registration_number && (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-gray-500">Reg:</span>
                                          <span>{rider!.vehicle_registration_number}</span>
                                        </div>
                                      )}
                                    </>
                                  ) : driver ? (
                                    <>
                                      {driver.name && (
                                        <div className="flex items-center gap-1.5">
                                          <User className="w-3 h-3 shrink-0" />
                                          <span>{driver.name}</span>
                                        </div>
                                      )}
                                      {driver.phone && (
                                        <a href={`tel:${driver.phone}`} className="flex items-center gap-1.5 hover:underline">
                                          <Phone className="w-3 h-3 shrink-0" />
                                          <span>{driver.phone}</span>
                                        </a>
                                      )}
                                      {(driver.vehicle_number || driver.vehicle) && (
                                        <div className="flex items-center gap-1.5">
                                          <Truck className="w-3 h-3 shrink-0" />
                                          <span>{driver.vehicle_number || driver.vehicle}</span>
                                        </div>
                                      )}
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Order Items */}
                          <div className={`space-y-2 sm:space-y-3 ${order.items && order.items.length > 2 ? 'max-h-40 sm:max-h-48 overflow-y-auto' : ''}`}>
                            {order.items?.map((item, index) => (
                              <div key={index} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-md"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gray-300 rounded-md flex items-center justify-center ${item.imageUrl ? 'hidden' : ''}`}>
                                  <span className="text-gray-500 text-[10px] sm:text-xs">No Image</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 text-xs sm:text-sm truncate">{item.name}</h4>
                                  <p className="text-[10px] sm:text-xs text-gray-600">Qty: {item.quantity}</p>
                                </div>
                                <div className="text-right">
                                  <PriceFormatter
                                    amount={item.price * item.quantity}
                                    className="font-semibold text-xs sm:text-sm"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Order Total */}
                        <div className="lg:ml-6 lg:border-l lg:pl-6 pt-4 lg:pt-0">
                          <div className="text-right">
                            <div className="flex justify-between items-center mb-2 sm:mb-3">
                              <span className="text-xs sm:text-sm text-gray-600 mr-2 sm:mr-4">Total:</span>
                              <PriceFormatter
                                amount={order.totalAmount}
                                className="text-base sm:text-xl font-bold text-green-600"
                              />
                            </div>
                            
                            {/* Reorder Button - Only for completed orders */}
                            {activeFilter === 'completed' && (
                              <div className="mt-3 sm:mt-4">
                                <Button
                                  onClick={() => handleReorderClick(order)}
                                  className="w-full bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm"
                                  size="sm"
                                >
                                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                  Reorder
                                </Button>
                              </div>
                            )}

                            {/* Cancel Button - Customers can cancel up to PACKED */}
                            {activeFilter === "ongoing" && canCancelOrderAsCustomer(order.status) && (
                              <div className="mt-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openCancelDialog(order);
                                  }}
                                  className="w-full text-xs sm:text-sm border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                >
                                  <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                  Cancel order
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
            </CardContent>
          </Card>
                );
              })}
            </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            <FileX className="h-16 w-16 sm:h-24 sm:w-24 text-gray-400 mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
                No {activeFilter} orders found
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-gray-600 text-center max-w-md">
                {activeFilter === 'ongoing' && "You don't have any ongoing orders at the moment."}
                {activeFilter === 'completed' && "You don't have any completed orders yet."}
                {activeFilter === 'cancelled' && "You don't have any cancelled orders."}
            </p>
            <Button asChild className="mt-4 sm:mt-6 text-xs sm:text-sm">
              <Link href="/">Browse Products</Link>
            </Button>
          </div>
        )}
        </div>
      </Container>

      {/* Reorder Dialog */}
      <ReorderDialog
        order={selectedOrder}
        isOpen={showReorderDialog}
        onClose={() => {
          setShowReorderDialog(false);
          setSelectedOrder(null);
        }}
      />

      {/* Cancel Order Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          if (!open && cancelSubmitting) return;
          setCancelDialogOpen(open);
          if (!open) {
            setCancelTargetOrder(null);
            setCancelReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cancel order</DialogTitle>
            <DialogDescription>
              {cancelTargetOrder ? `Order #${cancelTargetOrder.orderNumber}` : "This order will be cancelled."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900" htmlFor="cancel-reason">
              Reason (optional)
            </label>
            <textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Changed my mind"
              className="min-h-24 w-full rounded-md border border-gray-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              disabled={cancelSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelSubmitting}
            >
              Keep order
            </Button>
            <Button
              type="button"
              onClick={submitCancel}
              disabled={cancelSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelSubmitting ? "Cancelling..." : "Cancel order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

const OrdersPage = () => {
  return (
    <Suspense fallback={<Loader />}>
      <OrdersPageContent />
    </Suspense>
  );
};

export default OrdersPage;
