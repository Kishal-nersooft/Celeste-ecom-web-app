'use client';
import Container from "@/components/Container";
import OrdersComponent from "@/components/OrdersComponent";
import { FileX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import useCartStore, { Order } from "@/store";
import { getUserOrders, getOrderById } from "@/lib/api";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";

const OrdersPage = () => {
  const { user, loading: authLoading } = useAuth();
  const cartStore = useCartStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    const fetchOrders = async () => {
      if (!authLoading && user) {
        setLoading(true);
        try {
          // If specific order ID is requested, fetch that order
          if (orderId) {
            console.log('🔍 FETCHING SPECIFIC ORDER:', orderId);
            const orderResponse = await getOrderById(orderId);
            console.log('🔍 ORDER DETAILS RESPONSE:', JSON.stringify(orderResponse, null, 2));
            
            const orderData = orderResponse.data || orderResponse;
            setSelectedOrder(orderData);
            setShowOrderDetails(true);
            setLoading(false);
            return;
          }

          // Get orders from backend API
          const response = await getUserOrders(1, 50);
          console.log('🔍 ORDERS API RESPONSE:', JSON.stringify(response, null, 2));
          
          // Handle the API response structure based on documentation
          let backendOrders = [];
          if (Array.isArray(response)) {
            // Direct array response from /orders/ endpoint
            backendOrders = response;
          } else if (response.data && Array.isArray(response.data)) {
            backendOrders = response.data;
          } else if (response.orders && Array.isArray(response.orders)) {
            backendOrders = response.orders;
          }
          
          console.log('🔍 EXTRACTED ORDERS:', backendOrders);
          
          // Convert backend orders to local Order format based on API schema
          const convertedOrders: Order[] = backendOrders.map((order: any) => ({
            id: order.id?.toString() || 'unknown',
            orderNumber: order.id?.toString() || 'unknown',
            customerName: user.displayName || "Customer",
            email: user.email || "",
            totalAmount: order.total_amount || 0,
            status: order.status?.toUpperCase() || "PENDING",
            createdAt: order.created_at || new Date().toISOString(),
            userId: order.user_id || user.uid,
            items: order.items || [],
            payment: null,
            location: null,
            // Store additional fields for detailed view
            storeId: order.store_id,
            updatedAt: order.updated_at,
            sourceCartId: order.items?.[0]?.source_cart_id
          }));
          
          setOrders(convertedOrders);
        } catch (error) {
          console.error('Error fetching orders:', error);
          toast.error('Failed to load orders');
          
          // Fallback to local store orders
          const userOrders = cartStore.getOrders().filter(order => order.userId === user.uid);
          setOrders(userOrders);
        } finally {
          setLoading(false);
        }
      } else if (!authLoading && !user) {
        setLoading(false);
        router.push("/sign-in");
      }
    };

    fetchOrders();
  }, [user, authLoading, router, cartStore, orderId]);

  if (loading || authLoading || !user) {
    return <div>Loading orders...</div>;
  }

  // Show specific order details if requested
  if (showOrderDetails && selectedOrder) {
    return (
      <div>
        <Container className="py-10">
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl md:text-3xl">
                  Order #{selectedOrder.order_id}
                </CardTitle>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowOrderDetails(false);
                    setSelectedOrder(null);
                    router.push('/orders');
                  }}
                >
                  Back to Orders
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-700">Total Amount</h3>
                  <p className="text-2xl font-bold text-green-600">${selectedOrder.total_amount}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-700">Status</h3>
                  <p className={`text-lg font-semibold ${
                    selectedOrder.status === 'pending' ? 'text-yellow-600' :
                    selectedOrder.status === 'completed' ? 'text-green-600' :
                    selectedOrder.status === 'cancelled' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {selectedOrder.status?.toUpperCase()}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-700">Order Date</h3>
                  <p className="text-lg">{new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Order Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Order Items</h3>
                  <div className="border rounded-lg p-4">
                    <div className="space-y-2">
                      {selectedOrder.items.map((item: any, itemIndex: number) => (
                        <div key={itemIndex} className="flex justify-between items-center py-2 border-b">
                          <div>
                            <p className="font-medium">Product ID: {item.product_id}</p>
                            <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                            <p className="text-sm text-gray-600">Unit Price: ${item.unit_price}</p>
                            {item.source_cart_id && (
                              <p className="text-sm text-gray-500">From Cart: {item.source_cart_id}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${item.total_price}</p>
                            <p className="text-sm text-gray-600">Store: {item.store_id}</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2 font-semibold">
                        <span>Total:</span>
                        <span>${selectedOrder.total_amount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Store Information */}
              {selectedOrder.store_id && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Store Information</h3>
                  <p className="text-sm text-gray-600">Store ID: {selectedOrder.store_id}</p>
                </div>
              )}

              {/* Payment Information */}
              {selectedOrder.payment_url && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Payment Information</h3>
                  <p className="text-sm text-blue-700">
                    Payment Reference: {selectedOrder.payment_reference}
                  </p>
                  <p className="text-sm text-blue-700">
                    Payment URL: <a href={selectedOrder.payment_url} className="underline" target="_blank" rel="noopener noreferrer">View Payment</a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div>
      <Container className="py-10">
        {orders?.length ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl">Order List</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px] md:w-auto">
                        Order Number
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Date
                      </TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Email
                      </TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <OrdersComponent orders={orders} />
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <FileX className="h-24 w-24 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900">
              No orders found
            </h2>
            <p className="mt-2 text-sm text-gray-600 text-center max-w-md">
              It looks like you haven&apos;t placed any orders yet. Start
              shopping to see your orders here!
            </p>
            <Button asChild className="mt-6">
              <Link href="/">Browse Products</Link>
            </Button>
          </div>
        )}
      </Container>
    </div>
  );
};

export default OrdersPage;
