'use client';
import Container from "@/components/Container";
import { FileX, Package, CheckCircle, XCircle, Clock, Truck, CheckSquare, X, RotateCcw, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Order } from "@/store";
import { getUserOrders } from "@/lib/api";
import toast from "react-hot-toast";
import PriceFormatter from "@/components/PriceFormatter";
import ReorderDialog from "@/components/ReorderDialog";
import Loader from "@/components/Loader";

type OrderStatusFilter = 'ongoing' | 'completed' | 'cancelled';

const OrdersPageContent = () => {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<OrderStatusFilter>('ongoing');
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter orders based on status
  const getFilteredOrders = () => {
    return orders.filter(order => {
      const status = order.status?.toUpperCase();
      switch (activeFilter) {
        case 'ongoing':
          return ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED'].includes(status);
        case 'completed':
          return status === 'DELIVERED';
        case 'cancelled':
          return status === 'CANCELLED';
        default:
          return true;
      }
    });
  };

  // Get status display info
  const getStatusInfo = (status: string) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case 'PENDING':
        return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'CONFIRMED':
        return { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckSquare };
      case 'PROCESSING':
        return { label: 'Processing', color: 'bg-purple-100 text-purple-800', icon: Package };
      case 'PACKED':
        return { label: 'Packed', color: 'bg-indigo-100 text-indigo-800', icon: Package };
      case 'SHIPPED':
        return { label: 'Shipped', color: 'bg-orange-100 text-orange-800', icon: Truck };
      case 'DELIVERED':
        return { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'CANCELLED':
        return { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
    }
  };

  // Fetch orders function - extracted to be reusable
  const fetchOrders = useCallback(async (showLoading = true) => {
    if (!authLoading && user) {
      if (showLoading) setLoading(true);
      try {
        // Get orders from backend API
        const response = await getUserOrders(1, 50, true, true, true);
        
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
        console.log('Orders Data:', response.data || response);
        
        // Convert backend orders to local Order format based on API schema
        const convertedOrders: Order[] = backendOrders.map((order: any) => {
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
            status: order.status?.toUpperCase() || "PENDING",
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
            transactionId: order.transaction_id
          };
        });
        
        setOrders(convertedOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load orders');
        setOrders([]);
      } finally {
        if (showLoading) setLoading(false);
      }
    } else if (!authLoading && !user) {
      setLoading(false);
      router.push("/sign-in");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    fetchOrders();
    
    // Check if redirected from checkout with success
    const success = searchParams.get('success');
    const orderId = searchParams.get('orderId');
    
    if (success === 'true' && orderId) {
      // Show success message and refresh orders
      toast.success('Order placed successfully!');
      // Remove query params from URL
      router.replace('/orders', { scroll: false });
      // Refresh orders after a short delay to ensure backend has processed
      setTimeout(() => {
        fetchOrders(false); // Don't show loading spinner for refresh
      }, 1000);
    }
  }, [user, authLoading, router, fetchOrders, searchParams]);

  // Reorder handlers
  const handleReorderClick = (order: Order) => {
    setSelectedOrder(order);
    setShowReorderDialog(true);
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

  if (loading || authLoading || !user) {
    return (
      <div>
        <Container className="py-10">
          <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="flex gap-2">
                <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
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

  const filteredOrders = getFilteredOrders();

  return (
    <div>
      <Container className="py-4 sm:py-6 md:py-10">
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">My Orders</h1>
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2">
              <Button
                variant={activeFilter === 'ongoing' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('ongoing')}
                className={`whitespace-nowrap text-xs sm:text-sm ${
                  activeFilter === 'ongoing' 
                    ? 'bg-black text-white hover:bg-gray-800' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Ongoing
              </Button>
              <Button
                variant={activeFilter === 'completed' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('completed')}
                className={`whitespace-nowrap text-xs sm:text-sm ${
                  activeFilter === 'completed' 
                    ? 'bg-black text-white hover:bg-gray-800' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Completed
              </Button>
              <Button
                variant={activeFilter === 'cancelled' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('cancelled')}
                className={`whitespace-nowrap text-xs sm:text-sm ${
                  activeFilter === 'cancelled' 
                    ? 'bg-black text-white hover:bg-gray-800' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Cancelled
              </Button>
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders?.length ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
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
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="truncate">{new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
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
