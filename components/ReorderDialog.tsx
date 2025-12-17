"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Package, Store, Clock, MapPin, AlertTriangle } from "lucide-react";
import { Order } from "@/store";
import Image from "next/image";
import { useRouter } from "next/navigation";
import useCartStore from "@/store";
import { getProductById, addItemToCart, createCart, removeFromCart } from "@/lib/api";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";

interface ReorderDialogProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const ReorderDialog: React.FC<ReorderDialogProps> = ({
  order,
  isOpen,
  onClose
}) => {
  const router = useRouter();
  const cartStore = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showClearCartDialog, setShowClearCartDialog] = useState(false);
  const [cartToClear, setCartToClear] = useState<any>(null);

  if (!order) return null;

  const handleReorder = async () => {
    // Check if user has items in current cart
    const hasCartItems = cartStore.items && cartStore.items.length > 0;
    
    if (hasCartItems) {
      // Store the order for processing after confirmation
      setCartToClear(order);
      setShowClearCartDialog(true);
      return;
    }
    
    // No existing cart items, proceed with reorder
    await processReorder(order);
  };

  const processReorder = async (orderToReorder: Order) => {
    setIsProcessing(true);
    onClose();
    
    try {
      toast.loading('Processing reorder...', { id: 'reorder' });
      
      console.log('🔄 Starting reorder process for order:', orderToReorder.id);
      
      // Step 1: Always create a new cart for reorder
      const cartName = `Reorder from Order #${orderToReorder.orderNumber || orderToReorder.id}`;
      const cartDescription = `Reordered on ${new Date().toLocaleDateString()}`;
      
      console.log('📦 Creating new cart...');
      
      let cartId: number;
      try {
        const newCart = await createCart({
          name: cartName,
          description: cartDescription
        });
        
        cartId = newCart.data?.id || newCart.id;
        console.log('✅ New cart created:', cartId);
      } catch (error: any) {
        // If 409 Conflict, it means there are already active carts
        // Find an active cart and use it, clearing its items
        if (error.message?.includes('409')) {
          console.log('⚠️ Cart creation failed with 409, loading user carts to find active cart...');
          await cartStore.loadUserCarts();
          
          // Find active carts (ONLY status='active', exclude 'ordered' carts)
          const activeCarts = cartStore.carts.filter(cart => cart.status === 'active');
          console.log(`🔍 Found ${activeCarts.length} active carts (excluding ordered carts)`);
          console.log('🔍 Active cart IDs:', activeCarts.map(c => c.id));
          
          if (activeCarts.length > 0) {
            cartId = activeCarts[0].id;
            console.log('📍 Using existing active cart and clearing items:', cartId);
            
            // Clear all items from the cart
            const itemsToRemove = activeCarts[0].items;
            const uniqueProductIds = new Set(itemsToRemove.map(item => item.product.id));
            
            for (const productId of uniqueProductIds) {
              try {
                await removeFromCart(cartId, productId);
                console.log(`✅ Removed product ${productId} from cart`);
              } catch (error) {
                console.error(`Failed to remove product ${productId} from cart:`, error);
              }
            }
            
            console.log('✅ Cleared existing cart items');
          } else {
            throw error; // Re-throw if no active carts found
          }
        } else {
          throw error; // Re-throw if it's a different error
        }
      }
      
      // Step 3: Add items to cart one by one
      const addedItems = [];
      const skippedItems = [];
      
      for (const orderItem of orderToReorder.items || []) {
        try {
          console.log(`🔄 Fetching product ${orderItem.productId}...`);
          
          // Fetch fresh product data
          const freshProduct = await getProductById(orderItem.productId.toString());
          
          if (freshProduct) {
            console.log(`✅ Adding ${freshProduct.name} to cart...`);
            
            // Add to cart with original quantity
            await addItemToCart(cartId, {
              product_id: freshProduct.id,
              quantity: orderItem.quantity
            });
            
            console.log(`✅ Added ${freshProduct.name} (qty: ${orderItem.quantity}) to cart`);
            
            // Store the full product data (we already fetched it)
            addedItems.push({
              product: freshProduct,
              quantity: orderItem.quantity
            });
          } else {
            console.warn(`⚠️ Product ${orderItem.productId} not found, skipping`);
            skippedItems.push({
              productId: orderItem.productId,
              name: orderItem.name,
              reason: 'Product not found'
            });
          }
        } catch (error) {
          console.error(`❌ Failed to add product ${orderItem.productId} to cart:`, error);
          skippedItems.push({
            productId: orderItem.productId,
            name: orderItem.name,
            reason: 'Failed to fetch or add product'
          });
        }
      }
      
      console.log(`✅ Reorder complete: ${addedItems.length} items added, ${skippedItems.length} skipped`);
      
      // Step 4: Sync with backend to get the updated cart with all items
      console.log('🔄 Step 4: Syncing cart with backend...');
      
      // Set the cart ID first
      cartStore.setCartId(cartId);
      cartStore.setIsCartCreated(true);
      
      // Reload user carts from backend
      console.log('📥 Loading user carts...');
      await cartStore.loadUserCarts();
      
      // Now switch to the cart with full product data
      console.log('🔄 Switching to cart:', cartId);
      await cartStore.switchCart(cartId);
      
      // Verify the items are loaded correctly
      const currentItems = cartStore.items;
      console.log('✅ Cart items after sync:', currentItems.length);
      console.log('✅ Items data:', currentItems.map(item => ({
        id: item.product?.id,
        name: item.product?.name,
        hasImage: !!item.product?.image_urls?.length,
        hasPricing: !!item.product?.pricing,
        pricing: item.product?.pricing
      })));
      
      // Step 5: Show results and navigate
      if (skippedItems.length > 0) {
        toast.error(`Some items couldn't be added (${skippedItems.length} unavailable)`, { id: 'reorder' });
      } else {
        toast.success(`${addedItems.length} items added to cart`, { id: 'reorder' });
      }
      
      console.log('✅ Navigating to checkout...');
      router.push('/checkout');
      
    } catch (error: any) {
      console.error('❌ Reorder failed:', error);
      toast.error('Failed to process reorder. Please try again.', { id: 'reorder' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmClearCart = async () => {
    setShowClearCartDialog(false);
    
    if (cartToClear) {
      await processReorder(cartToClear);
    }
    
    setCartToClear(null);
  };

  const handleCancelClearCart = () => {
    setShowClearCartDialog(false);
    setCartToClear(null);
  };

  const totalItems = order.items?.length || 0;
  const totalAmount = order.totalAmount || 0;

  return (
    <>
      {/* Loading Overlay */}
      {isProcessing && <Loader />}

      {/* Clear Cart Confirmation Dialog */}
      <Dialog open={showClearCartDialog} onOpenChange={handleCancelClearCart}>
        <DialogContent className="w-[90vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
              Clear Cart?
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Clear current cart and add reorder items?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              onClick={handleCancelClearCart}
              variant="outline"
              className="text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmClearCart}
              className="bg-black hover:bg-gray-800 text-xs sm:text-sm"
            >
              Yes, Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Reorder Dialog */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[90vw] max-w-lg mx-auto">
          <DialogHeader className="pb-2 sm:pb-3">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Reorder Items
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Order #{order.id} • {totalItems} items
            </DialogDescription>
          </DialogHeader>

        <Card className="border border-gray-200 w-full">
          <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4 w-full max-w-full">
            {/* Store Info */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Store className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-gray-900 flex-shrink-0">Store</span>
              <div className="flex items-center gap-2 ml-auto text-[10px] sm:text-xs text-gray-500">
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  #{order.id}
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap truncate">
                  <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {(order.deliveryLocation || 'Location').substring(0, 15)}
                </span>
              </div>
            </div>

            {/* Products List - Compact */}
            <div className="space-y-1.5 sm:space-y-2">
              {order.items?.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-1.5 sm:p-2 bg-gray-50 rounded-lg">
                  {/* Product Image - Smaller */}
                  <div className="relative w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Details - Compact */}
                  <div className="flex-1 min-w-0 overflow-hidden max-w-full">
                    <h4 className="text-[10px] sm:text-xs font-medium text-gray-900 truncate block" title={item.name}>
                      {item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                      <span className="text-[9px] sm:text-xs text-gray-600">Qty: {item.quantity}</span>
                      <span className="text-[9px] sm:text-xs text-gray-600">{item.price.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Total - Smaller */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] sm:text-xs font-semibold text-gray-900">
                      {(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Total - Compact */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 min-w-0">
                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">Total ({totalItems} items)</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-gray-900 flex-shrink-0">
                {totalAmount.toFixed(2)}
              </div>
            </div>

            {/* Action Buttons - Simplified */}
            <div className="pt-2">
              <Button
                onClick={handleReorder}
                className="w-full bg-black hover:bg-gray-800 text-white font-bold text-xs sm:text-sm"
                size="sm"
                disabled={isProcessing}
              >
                <ShoppingCart className="h-3 w-3 mr-1.5 sm:mr-2" />
                Reorder Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default ReorderDialog;
