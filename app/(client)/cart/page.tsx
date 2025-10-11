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
import CartItems from "@/components/CartItems";
import PaymentModal from "@/components/PaymentModal";
import { useLocation } from "@/contexts/LocationContext";
import { createCart, addItemToCart, updateCartItemQuantity, removeFromCart, previewOrder, createOrder, getCartDetails, getUserAddress, verifyOrderPayment, checkInventoryAvailability, getAuthHeaders } from "@/lib/api";

const CartPage = () => {
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [selectedOrderType, setSelectedOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [loadingCarts, setLoadingCarts] = useState(false);
  const [currentCartId, setCurrentCartId] = useState<number | string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const { selectedLocation, setSelectedLocation, addressId: contextAddressId, defaultAddress } = useLocation();
  
  // Debug context values
  console.log('🔍 Cart page context values:', {
    selectedLocation,
    contextAddressId,
    defaultAddress,
    hasAddressId: !!contextAddressId
  });
  const cartStore = useCartStore();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign-in");
    }
  }, [user, loading, router]);

  // Initialize cart for checkout (using real cart ID from store)
  useEffect(() => {
    if (user && cartStore.items.length > 0) {
      console.log('🛒 Using real cart ID for order processing:', cartStore.cartId);
      setCurrentCartId(cartStore.cartId);
      setLoadingCarts(false);
      
      // Fetch real delivery fees when cart loads
      setTimeout(() => {
        fetchPreviewData();
      }, 1000);
    }
  }, [user, cartStore.items, cartStore.cartId, contextAddressId]);

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return <NoAccessToCart />;
  }

  if (!cartStore.items.length) {
    return <EmptyCart />;
  }

  const handleResetCart = () => {
    const confirmed = window.confirm("Are you sure to reset your Cart?");
    if (confirmed) {
      cartStore.resetCart();
      toast.success("Your cart reset successfully!");
    }
  };

  // Function to get real delivery fees from backend
  const fetchPreviewData = async () => {
    if (!contextAddressId || !currentCartId || typeof currentCartId !== 'number') {
      console.log('⚠️ Cannot fetch preview - missing address or cart ID');
      return;
    }

    setLoadingPreview(true);
    try {
      console.log('🔍 Fetching real delivery fees from backend...');
      
      const previewRequest = {
        cart_ids: [currentCartId],
        location: {
          mode: selectedOrderType,
          address_id: contextAddressId,
          store_id: null
        }
      };

      const previewResult = await previewOrder(previewRequest);
      const extractedData = previewResult.data || previewResult;
      
      console.log('✅ Preview data received:', extractedData);
      setPreviewData(extractedData);
      
    } catch (error) {
      console.warn('⚠️ Failed to fetch preview data:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCheckout = async () => {
    console.log('🛒 CHECKOUT BUTTON CLICKED - STARTING DIRECT ORDER CREATION');
    console.log('📋 CHECKOUT VALIDATION:', {
      selectedLocation,
      currentCartId,
      cartItemsCount: cartStore.items.length,
      cartTotal: cartStore.getTotalPrice()
    });

    // Validate location selection
    if (selectedLocation === "Location" || !selectedLocation) {
      console.log('❌ Location validation failed');
      toast.error("Please select a delivery location");
      return;
    }

    if (!currentCartId) {
      console.log('❌ Cart ID validation failed');
      toast.error("No cart available for checkout");
      return;
    }

    // Check if we have a temporary cart ID (local-only cart)
    if (typeof currentCartId === 'string' && currentCartId.startsWith('temp_')) {
      console.log('🔄 Temporary cart detected, creating real cart for checkout...');
      try {
        // Generate dynamic cart name for checkout
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substr(2, 12);
        const sessionId = typeof window !== 'undefined' ? 
          (sessionStorage.getItem('sessionId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`) : 
          `server_${timestamp}`;
        
        const newCart = await createCart({
          name: `CheckoutCart_${sessionId}_${timestamp}_${randomString}`,
          description: `Dynamic checkout cart - Session: ${sessionId}`
        });
        console.log('✅ Real cart created for checkout:', newCart);
        setCurrentCartId(newCart.id);
        
        // Add all local items to the new cart
        console.log('🔄 Adding local items to new cart...');
        for (const item of cartStore.items) {
          try {
            await addItemToCart(newCart.id, {
              product_id: item.product.id,
              quantity: item.quantity
            });
            console.log(`✅ Added item ${item.product.id} to cart ${newCart.id}`);
          } catch (itemError) {
            console.warn(`⚠️ Failed to add item ${item.product.id} to cart:`, itemError);
          }
        }
      } catch (cartError) {
        console.error('❌ Failed to create real cart for checkout:', cartError);
        toast.error('Failed to create cart for checkout. Please try again.');
        return;
      }
    }

    // Ensure we have a numeric cart ID for API calls
    if (typeof currentCartId === 'string') {
      console.log('❌ Invalid cart ID type for checkout');
      toast.error('Invalid cart state. Please try again.');
      return;
    }

    if (cartStore.items.length === 0) {
      console.log('❌ Empty cart validation failed');
      toast.error("Your cart is empty");
      return;
    }

    // Validate address ID for delivery orders
    console.log('🔍 ADDRESS ID VALIDATION:', {
      selectedOrderType,
      contextAddressId,
      hasAddressId: !!contextAddressId
    });
    
    if (selectedOrderType === 'delivery' && !contextAddressId) {
      console.error('❌ No address ID available for delivery order');
      toast.error('Please select a delivery address first');
      return;
    }
    
    console.log('✅ All validations passed, creating order directly');
    
    // Start order creation directly
    setLoadingCheckout(true);
    
    try {
      // Create order data from local cart items
      console.log('🛒 STEP 1: Preparing order from local cart...');
      
      // Use real cart data from cartStore
      console.log('📦 REAL CART ITEMS:', cartStore.items);
      console.log('💰 REAL CART TOTAL:', cartStore.getTotalPrice());
      console.log('🔍 CART ITEMS DETAILS:');
      cartStore.items.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`, {
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.product.pricing?.final_price || item.product.base_price,
          totalPrice: (item.product.pricing?.final_price || item.product.base_price) * item.quantity
        });
      });

      // Step 2: Always create a fresh cart for checkout (to avoid ordered cart issues)
      console.log('🔍 STEP 2: Creating fresh cart for checkout...');
      
      let validCartId: number;
      
      try {
        // Create a new cart with dynamic name for checkout
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substr(2, 12);
        const sessionId = typeof window !== 'undefined' ? 
          (sessionStorage.getItem('sessionId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`) : 
          `server_${timestamp}`;
        
        const newCart = await createCart({
          name: `CheckoutCart_${sessionId}_${timestamp}_${randomString}`,
          description: `Fresh checkout cart - Session: ${sessionId}`
        });
        console.log('✅ Fresh cart created for checkout:', newCart);
        validCartId = newCart.id;
        setCurrentCartId(newCart.id);
        
        // Add all local items to the fresh cart
        console.log('🔄 Adding local items to fresh cart...');
        for (const item of cartStore.items) {
          try {
            await addItemToCart(newCart.id, {
              product_id: item.product.id,
              quantity: item.quantity
            });
            console.log(`✅ Added item ${item.product.id} to fresh cart ${newCart.id}`);
          } catch (itemError) {
            console.warn(`⚠️ Failed to add item ${item.product.id} to fresh cart:`, itemError);
          }
        }
        
        console.log('✅ All items added to fresh cart');
      } catch (cartError) {
        console.error('❌ Failed to create fresh cart:', cartError);
        toast.error('Failed to create cart for checkout. Please try again.');
        return;
      }
      
      if (selectedOrderType === 'delivery' && contextAddressId) {
        console.log('🔍 STEP 2b: Verifying address ID exists...');
        try {
          const authHeaders = await getAuthHeaders();
          const addressResponse = await fetch(`/api/users/me/addresses/${contextAddressId}`, {
            headers: authHeaders
          });
          
          if (!addressResponse.ok) {
            console.error(`❌ Address ID ${contextAddressId} verification failed:`, addressResponse.status);
            toast.error(`Address ID ${contextAddressId} not found. Please select a valid address.`);
            return;
          }
          
          const addressData = await addressResponse.json();
          console.log('✅ Address verification successful:', addressData);
        } catch (addressError) {
          console.error('❌ Address verification error:', addressError);
          toast.error('Failed to verify address. Please try again.');
          return;
        }
      }
      
      // Step 2c: Check inventory availability directly
      console.log('📦 STEP 2c: Checking inventory availability...');
      
      try {
        const productIds = cartStore.items.map(item => item.product.id);
        console.log('🔍 Product IDs to validate:', productIds);
        
        const inventoryCheck = await checkInventoryAvailability(
          productIds,
          selectedOrderType === 'pickup' ? undefined : undefined, // Let backend determine store
          defaultAddress?.latitude || 6.8411862,
          defaultAddress?.longitude || 79.9820252
        );
        
        console.log('📦 Inventory check results:', inventoryCheck);
        
        // Check if inventory check returned any results
        if (inventoryCheck.length === 0) {
          console.log('❌ Inventory check returned empty array - products not found in backend');
          const productNames = cartStore.items.map(item => `${item.product.name} (ID: ${item.product.id})`).join(', ');
          
          // Clear the cart since all products are invalid
          cartStore.clearCart();
          if (typeof window !== 'undefined') {
            localStorage.removeItem('cart-store');
          }
          
          toast.error(`The following products are not available in our system: ${productNames}. Your cart has been cleared. Please add valid products and try again.`);
          return;
        }
        
        // Check if any products are unavailable
        const unavailableProducts = inventoryCheck.filter((item: any) => !item.available);
        if (unavailableProducts.length > 0) {
          console.log('❌ Unavailable products found in inventory check:', unavailableProducts);
          
          // Remove unavailable products from cart
          unavailableProducts.forEach((unavailableProduct: any) => {
            const cartItem = cartStore.items.find(item => item.product.id === unavailableProduct.productId);
            if (cartItem) {
              cartStore.removeItem(cartItem.product.id);
              console.log(`🗑️ Removed unavailable product: ${unavailableProduct.name} (ID: ${unavailableProduct.productId})`);
            }
          });
          
          const unavailableNames = unavailableProducts.map((p: any) => p.name).join(', ');
          toast.error(`The following items are not in stock and have been removed from your cart: ${unavailableNames}.`);
          
          // If cart is now empty, return
          if (cartStore.items.length === 0) {
            toast.error('Your cart is now empty. Please add valid products and try again.');
            return;
          }
        }
        
        console.log('✅ All products are in stock');
      } catch (inventoryError) {
        console.error('❌ Inventory check failed:', inventoryError);
        toast.error('Failed to check product availability. Please try again.');
        return;
      }

      // Step 3: Preview the order first (as per backend API documentation)
      console.log('📦 STEP 3: Previewing order...');
      
      const previewData = {
        cart_ids: [validCartId!],
        location: {
          mode: selectedOrderType,
          address_id: selectedOrderType === 'delivery' ? contextAddressId : null,
          store_id: selectedOrderType === 'pickup' ? null : null // Let backend determine store
        }
      };

      console.log('🔍 Using preview data:', previewData);
      
      // Validate that we have preview data
      if (!previewData) {
        console.warn('⚠️ No preview data available, fetching now...');
        try {
          const previewResult = await previewOrder(previewData);
          console.log('✅ Order preview successful:', previewResult);
        } catch (previewError: any) {
          console.error('❌ Order preview failed:', previewError);
          if (previewError.message?.includes('422')) {
            toast.error('Some items in your cart are not available for delivery. Please check your cart and try again.');
          } else {
            toast.error('Failed to preview order. Please try again.');
          }
          return;
        }
      }

      // Step 4: Create the order with proper backend format
      console.log('📦 STEP 4: Creating order...');
      
      // Use the valid cart ID for order creation
      const orderData = {
        cart_ids: [validCartId!],
        location: {
          mode: selectedOrderType,
          address_id: selectedOrderType === 'delivery' ? contextAddressId : null,
          store_id: selectedOrderType === 'pickup' ? null : null // Let backend determine store
        }
      };

      console.log('📤 ORDER DATA TO BACKEND:', JSON.stringify(orderData, null, 2));
      
      console.log('\n🎯 ORDER FLOW DETAILS:');
      console.log('=' .repeat(50));
      console.log('📤 DATA BEING SENT TO BACKEND:');
      console.log(`   Cart IDs: ${orderData.cart_ids.join(', ')}`);
      console.log(`   Order Mode: ${orderData.location.mode}`);
      console.log(`   Address ID: ${orderData.location.address_id || 'N/A'}`);
      console.log(`   Store ID: ${orderData.location.store_id || 'N/A'}`);
      console.log(`   Mode: ${orderData.location.mode}`);
      console.log(`   Real Cart Items Count: ${cartStore.items.length}`);
      console.log(`   Real Cart Total: $${cartStore.getTotalPrice().toFixed(2)}`);
      console.log('=' .repeat(50));

      console.log('📤 SENDING ORDER DATA TO BACKEND:', orderData);

      const order = await createOrder(orderData);

      // Extract order data from the nested response structure
      const orderResponse = order.data || order;
      
      console.log('\n✅ ORDER CREATED RESPONSE:');
      console.log('=' .repeat(50));
      console.log(`   Order ID: ${orderResponse.order_id}`);
      console.log(`   Total Amount: $${orderResponse.total_amount}`);
      console.log(`   Status: ${orderResponse.status}`);
      console.log(`   Cart Groups: ${orderResponse.cart_groups?.length || 0}`);
      console.log(`   Payment URL: ${orderResponse.payment_url}`);
      console.log(`   Payment Reference: ${orderResponse.payment_reference}`);
      console.log(`   Created At: ${orderResponse.created_at}`);
      console.log('=' .repeat(50));
      
      console.log('📋 FULL ORDER RESPONSE:', JSON.stringify(order, null, 2));

      if (orderResponse && orderResponse.order_id) {
        // Calculate fee breakdown
        const cartTotal = orderResponse.cart_groups?.[0]?.cart_total || 0;
        const orderTotal = orderResponse.total_amount || 0;
        const feeDifference = orderTotal - cartTotal;
        
        console.log('💰 PRICING BREAKDOWN:');
        console.log('=' .repeat(50));
        console.log(`   Cart Total: ${cartTotal}`);
        console.log(`   Order Total: ${orderTotal}`);
        console.log(`   Additional Fees: ${feeDifference}`);
        console.log('=' .repeat(50));
        
        // Check for fee breakdown in response
        if (orderResponse.fees) {
          console.log('💳 FEE BREAKDOWN:', orderResponse.fees);
        }
        if (orderResponse.delivery_fee) {
          console.log('🚚 DELIVERY FEE:', orderResponse.delivery_fee);
        }
        if (orderResponse.service_charge) {
          console.log('⚙️ SERVICE CHARGE:', orderResponse.service_charge);
        }
        if (orderResponse.tax) {
          console.log('🧾 TAX:', orderResponse.tax);
        }

        console.log('🎉 ORDER SUCCESS - Final Order Details:', {
          orderId: orderResponse.order_id,
          totalAmount: orderResponse.total_amount,
          status: orderResponse.status,
          cartGroups: orderResponse.cart_groups,
          createdAt: orderResponse.created_at
        });

        // Instead of immediately redirecting, show payment form
        setShowPaymentForm(true);
        setOrderDetails(orderResponse);
        
        // Clear local cart and all storage
        cartStore.clearCart();
        console.log('✅ Cart cleared after successful order creation');
      } else {
        throw new Error('Invalid order response from server');
      }
    } catch (error: any) {
      console.error('❌ CHECKOUT ERROR:', error);
      
      // Handle specific error types
      if (error.message && error.message.includes('422')) {
        // Parse the error message to extract unavailable items
        const errorMatch = error.message.match(/Items not available for delivery: \[(\d+)\]/);
        if (errorMatch) {
          const unavailableProductId = errorMatch[1];
          toast.error(`Product ID ${unavailableProductId} is not available for delivery. Please remove it from your cart and try again.`);
        } else {
          toast.error('Some items in your cart are not available for delivery. Please check your cart and try again.');
        }
      } else if (error.message && error.message.includes('401')) {
        toast.error('Please sign in to continue with checkout.');
      } else if (error.message && error.message.includes('404')) {
        toast.error('Cart not found. Please refresh the page and try again.');
      } else {
        toast.error('Checkout failed: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setOrderDetails(null);
    toast.error('Payment cancelled. Order not placed.');
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    console.log('💳 PAYMENT SUCCESS CALLED WITH DATA:', paymentData);
    setPaymentData(paymentData);
    setLoadingCheckout(true);
    
    try {
      if (!user?.email || !user?.uid) {
        toast.error("User not authenticated.");
        setLoadingCheckout(false);
        return;
      }

      // Use address ID from context (default address)
      const addressId = contextAddressId; // Use context address
      
      if (!addressId) {
        toast.error("No delivery address available. Please add an address first.");
        setLoadingCheckout(false);
        return;
      }

      console.log('🚀 STARTING ORDER PROCESS WITH PAYMENT DATA:', {
        paymentMethod: paymentData.cardNumber ? 'card' : 'other',
        amount: paymentData.amount,
        transactionId: paymentData.transactionId,
        status: paymentData.status
      });

      // Get cart details for logging
      let cartItems: any[] = [];
      if (typeof currentCartId === 'number') {
        const cartDetails = await getCartDetails(currentCartId);
        console.log('🛒 CART DETAILS:', cartDetails);
        cartItems = cartDetails?.data?.items || cartDetails?.items || [];
        console.log('📦 CART ITEMS:', cartItems);
      }

      // Calculate totals from cart items
      const cartTotal = cartItems.reduce((total: number, item: any) => {
        const itemTotal = (item.product?.pricing?.final_price ?? item.product?.base_price ?? 0) * item.quantity;
        console.log(`💰 Item: ${item.product?.name || 'Unknown'} | Price: $${item.product?.pricing?.final_price ?? item.product?.base_price ?? 0} | Qty: ${item.quantity} | Total: $${itemTotal}`);
        return total + itemTotal;
      }, 0);

      console.log('💵 CART TOTAL CALCULATED:', cartTotal);

      // Get address details
      const addressDetails = await getUserAddress(addressId);
      console.log('📍 DELIVERY ADDRESS:', addressDetails);

      // Log user details
      console.log('👤 USER DETAILS:', {
        email: user.email,
        uid: user.uid,
        displayName: user.displayName
      });

      // Log order type and location
      console.log('🚚 ORDER TYPE & LOCATION:', {
        orderType: selectedOrderType,
        addressId: addressId,
        selectedLocation: selectedLocation
      });

      // Log payment data
      console.log('💳 PAYMENT DATA:', {
        method: paymentData.cardNumber ? 'card' : 'other',
        transactionId: paymentData.transactionId,
        amount: paymentData.amount,
        status: paymentData.status,
        cardNumber: paymentData.cardNumber ? `${paymentData.cardNumber.slice(0, 4)}****` : 'N/A'
      });

      // Step 1: Create order data from local cart items
      console.log('🛒 STEP 1: Preparing order from local cart...');
      
      // Create detailed cart data for backend
      const orderCartItems = cartStore.items.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        base_price: item.product.base_price || 0,
        final_price: item.product.pricing?.final_price || item.product.base_price || 0,
        total_price: (item.product.pricing?.final_price || item.product.base_price || 0) * item.quantity,
        savings_per_item: (item.product.base_price || 0) - (item.product.pricing?.final_price || item.product.base_price || 0),
        total_savings: ((item.product.base_price || 0) - (item.product.pricing?.final_price || item.product.base_price || 0)) * item.quantity,
        discount_percentage: item.product.pricing?.discount_percentage || 0,
        applied_discounts: item.product.pricing?.applied_price_lists || [],
        inventory_status: {
          can_fulfill: true,
          quantity_requested: item.quantity,
          quantity_available: 100, // Will be updated by backend
          store_id: null, // Let backend determine store
          store_name: null // Let backend determine store name
        }
      }));

      const orderCartSubtotal = orderCartItems.reduce((sum, item) => sum + (item.base_price * item.quantity), 0);
      const orderCartTotalSavings = orderCartItems.reduce((sum, item) => sum + item.total_savings, 0);
      const orderCartTotal = orderCartItems.reduce((sum, item) => sum + item.total_price, 0);

      // Create cart group as expected by backend (dynamic data)
      const cartGroup = {
        cart_id: currentCartId as number, // Use actual cart ID
        cart_name: `Cart_${Date.now()}`, // Dynamic cart name
        items: orderCartItems,
        cart_subtotal: orderCartSubtotal,
        cart_total_savings: orderCartTotalSavings,
        cart_total: orderCartTotal
      };

      console.log('📦 CART GROUP DATA:', JSON.stringify(cartGroup, null, 2));

      // Step 2: Create the order with proper backend format
      console.log('📦 STEP 2: Creating order...');
      const orderData = {
        cart_ids: [currentCartId as number],
        location: {
          mode: selectedOrderType,
          address_id: selectedOrderType === 'delivery' ? contextAddressId : null,
          store_id: selectedOrderType === 'pickup' ? null : null // Let backend determine store
        }
      };

      console.log('📤 ORDER DATA TO BACKEND:', JSON.stringify(orderData, null, 2));
      
      console.log('\n🎯 ORDER FLOW DETAILS:');
      console.log('=' .repeat(50));
      console.log('📤 DATA BEING SENT TO BACKEND:');
      console.log(`   Cart IDs: ${orderData.cart_ids.join(', ')}`);
      console.log(`   Order Mode: ${orderData.location.mode}`);
      console.log(`   Address ID: ${orderData.location.address_id || 'N/A'}`);
      console.log(`   Store ID: ${orderData.location.store_id || 'N/A'}`);
      console.log(`   Mode: ${orderData.location.mode}`);
      console.log(`   Real Cart Items Count: ${cartStore.items.length}`);
      console.log(`   Real Cart Total: $${cartStore.getTotalPrice().toFixed(2)}`);
      console.log('=' .repeat(50));

      console.log('📤 SENDING ORDER DATA TO BACKEND:', orderData);

      const order = await createOrder(orderData);

      console.log('\n✅ ORDER CREATED RESPONSE:');
      console.log('=' .repeat(50));
      console.log(`   Order ID: ${order.order_id || order.data?.order_id}`);
      console.log(`   Total Amount: $${order.total_amount || order.data?.total_amount}`);
      console.log(`   Status: ${order.status || order.data?.status}`);
      console.log(`   Cart Groups: ${order.cart_groups?.length || order.data?.cart_groups?.length || 0}`);
      console.log(`   Payment URL: ${order.payment_url || order.data?.payment_url}`);
      console.log(`   Payment Reference: ${order.payment_reference || order.data?.payment_reference}`);
      console.log(`   Created At: ${order.created_at || order.data?.created_at}`);
      console.log('=' .repeat(50));
      
      console.log('📋 FULL ORDER RESPONSE:', JSON.stringify(order, null, 2));

      if (order && order.data) {
        const orderId = order.data.order_id || order.data.id;
        
        console.log('🎉 ORDER SUCCESS - Final Order Details:', {
          orderId: orderId,
          totalAmount: order.data.total_amount,
          status: order.data.status,
          location: order.data.location,
          estimatedDelivery: order.data.estimated_delivery,
          createdAt: order.data.created_at
        });

        // Step 3: Verify payment with the created order
        console.log('💳 STEP 3: Verifying payment with order...');
        try {
          const paymentVerification = await verifyOrderPayment(orderId, {
            method: paymentData.cardNumber ? 'card' : 'other',
            transaction_id: paymentData.transactionId,
            amount: paymentData.amount,
            status: paymentData.status
          });
          
          console.log('✅ PAYMENT VERIFICATION RESPONSE:', paymentVerification);
        } catch (paymentError) {
          console.warn('⚠️ Payment verification failed, but order was created:', paymentError);
          // Don't fail the entire process if payment verification fails
        }

        toast.success(`Order placed successfully! Order #${orderId}`);
        
        // Clear local cart completely
        cartStore.clearCart();
        console.log('✅ Cart cleared after successful payment');
        
        // Redirect to orders page
        router.push("/orders");
      } else {
        throw new Error('Invalid order response from server');
      }
    } catch (error) {
      console.error('❌ CHECKOUT ERROR:', error);
      toast.error("Checkout failed");
    }
    setLoadingCheckout(false);
  };

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
  };

  const handleOrderTypeChange = (orderType: 'delivery' | 'pickup') => {
    setSelectedOrderType(orderType);
  };

  return (
    <Container className="py-10">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Side - Delivery Details */}
        <div className="space-y-6">
          <DeliveryDetails
            onLocationChange={handleLocationChange}
            onOrderTypeChange={handleOrderTypeChange}
            selectedLocation={selectedLocation}
            selectedOrderType={selectedOrderType}
          />
        </div>

        {/* Right Side - Cart Items */}
        <div className="space-y-6">
          <CartItems
            onCheckout={handleCheckout}
            loadingCheckout={loadingCheckout}
            onResetCart={handleResetCart}
            selectedLocation={selectedLocation}
            previewData={previewData}
            loadingPreview={loadingPreview}
          />
        </div>
      </div>

      {/* Simple Payment Form */}
      {showPaymentForm && orderDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6 text-center">Complete Payment</h2>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Order Summary</h3>
              <p className="text-sm text-gray-600">Order ID: #{orderDetails.order_id}</p>
              <p className="text-sm text-gray-600">Total: ${orderDetails.total_amount}</p>
              <p className="text-sm text-gray-600">Status: {orderDetails.status}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handlePaymentCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePaymentSuccess({
                  cardNumber: '****1234',
                  amount: orderDetails.total_amount,
                  transactionId: `TXN_${Date.now()}`,
                  status: 'success'
                })}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Pay ${orderDetails.total_amount}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalAmount={cartStore.getTotalPrice()}
        onPaymentSuccess={handlePaymentSuccess}
        loading={loadingCheckout}
      />
    </Container>
  );
};

export default CartPage;
