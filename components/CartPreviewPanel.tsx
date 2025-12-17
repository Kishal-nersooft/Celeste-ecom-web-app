"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, ArrowRight, Plus, AlertTriangle, Package, MoreVertical } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import useCartStore from "@/store";
import PriceFormatter from "./PriceFormatter";
import QuantityButtons from "./QuantityButtons";
import toast from "react-hot-toast";
import EmptyCart from "./EmptyCart";
import { useLocation } from "@/contexts/LocationContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CartPreviewPanelProps {
  children: React.ReactNode;
}

const CartPreviewPanel = ({ children }: CartPreviewPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewCartDialog, setShowNewCartDialog] = useState(false);
  const [isCreatingCart, setIsCreatingCart] = useState(false);
  const [isClearingCart, setIsClearingCart] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cartStore = useCartStore();
  const { addressId, selectedLocation } = useLocation();

  const handleDeleteProduct = async (productId: number) => {
    await cartStore.deleteCartProduct(productId);
    toast.success("Product removed from cart!");
  };

  const handleCreateNewCart = async () => {
    setMenuOpen(false);
    const hasItems = cartStore.items.length > 0;
    
    if (hasItems) {
      setShowNewCartDialog(true);
    } else {
      await createNewCart();
    }
  };

  const createNewCart = async () => {
    try {
      setIsCreatingCart(true);
      const newCart = await cartStore.createNewCart();
      toast.success(`New cart "${newCart.name}" created!`);
      setShowNewCartDialog(false);
    } catch (error) {
      console.error('Failed to create new cart:', error);
      toast.error('Failed to create new cart. Please try again.');
    } finally {
      setIsCreatingCart(false);
    }
  };

  const handleClearCart = async () => {
    setMenuOpen(false);
    try {
      setIsClearingCart(true);
      await cartStore.clearCart();
      toast.success("Cart cleared successfully!");
    } catch (error) {
      console.error('Failed to clear cart:', error);
      toast.error('Failed to clear cart. Please try again.');
    } finally {
      setIsClearingCart(false);
    }
  };


  // Use only local cart calculations - no backend data
  const safeItems = cartStore.items || [];
  const totalPrice = safeItems.length > 0 ? cartStore.getTotalPrice() : 0;
  const itemCount = safeItems.length;
  const activeCart = cartStore.getActiveCart();
  
  // Debug: Log cart items
  if (safeItems.length > 0) {
    console.log('🔍 CartPreviewPanel - Cart items:', safeItems.map(item => ({
      productId: item.product?.id,
      productName: item.product?.name,
      hasImage: !!item.product?.image_urls?.length,
      hasPricing: !!item.product?.pricing
    })));
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px] flex flex-col">
        <SheetHeader className="mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-xl">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              <span className="hidden sm:inline">Cart({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
              <span className="sm:hidden">Cart({itemCount})</span>
            </SheetTitle>
            
            {/* Menu Dropdown Button */}
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCreateNewCart}
                    disabled={isCreatingCart || isClearingCart}
                    className="w-full justify-start gap-2 text-xs"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Cart
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearCart}
                    disabled={isCreatingCart || isClearingCart}
                    className="w-full justify-start gap-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isClearingCart ? "Clearing..." : "Clear Cart"}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </SheetHeader>

        {safeItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyCart />
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 md:space-y-4 pr-1 sm:pr-2">
              {safeItems.map((item) => {
                if (!item || !item.product) return null;
                return (
                  <div
                    key={item.product.id}
                    className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    {item.product.image_urls?.[0] || item.product.imageUrl ? (
                      <Image
                        src={(item.product.image_urls?.[0] || item.product.imageUrl) as string}
                        alt={item.product.name}
                        width={60}
                        height={60}
                        className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-md object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-200 rounded-md flex items-center justify-center flex-shrink-0">
                        <Package className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1">
                        {item.product.name}
                      </h3>
                      <div className="text-gray-600 text-xs sm:text-sm mb-2">
                        {item.product.pricing?.discount_applied && item.product.pricing.discount_applied > 0 ? (
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                            <span className="bg-red-500 text-white text-[9px] sm:text-xs px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded font-bold">
                              {Math.round(item.product.pricing.discount_percentage || 0)}% OFF
                            </span>
                            <PriceFormatter 
                              amount={item.product.pricing.final_price || 0} 
                              className="text-red-600 font-semibold"
                            />
                            <PriceFormatter 
                              amount={item.product.pricing.base_price || 0} 
                              className="line-through text-gray-400 text-xs"
                            />
                          </div>
                        ) : (
                          <PriceFormatter 
                            amount={item.product.pricing?.final_price || item.product.base_price || item.product.price || 0} 
                          />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between gap-1 sm:gap-2">
                        <QuantityButtons
                          product={item.product}
                          className="text-[10px] sm:text-xs"
                          onQuantityChange={() => {
                            // No need to refresh preview data - cart is purely local
                            // The cart state will automatically update the UI
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProduct(item.product.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                        >
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="mt-3 sm:mt-4 md:mt-6 space-y-2 sm:space-y-3 md:space-y-4">
              <Separator />
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <h3 className="font-semibold text-xs sm:text-sm">Order Summary</h3>
                  <div className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                    Delivery fees calculated at checkout
                  </div>
                </div>
                
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>Subtotal</span>
                  <span>
                    <PriceFormatter amount={cartStore.getSubTotalPrice()} />
                  </span>
                </div>
                
                {/* Delivery fees, service charges, and tax calculated at checkout */}
                
                <Separator />
                <div className="flex justify-between font-semibold text-sm sm:text-base md:text-lg">
                  <span>Subtotal</span>
                  <span>
                    <PriceFormatter amount={totalPrice} />
                  </span>
                </div>
              </div>

              {/* Go to Checkout Button */}
              <Link href="/checkout" onClick={() => setIsOpen(false)}>
                <Button className="w-full mt-2 sm:mt-3 md:mt-4 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 py-2">
                  <span className="hidden sm:inline">Go to Checkout</span>
                  <span className="sm:hidden">Checkout</span>
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </SheetContent>
      
      {/* New Cart Confirmation Dialog */}
      <Dialog open={showNewCartDialog} onOpenChange={setShowNewCartDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Create New Cart?
            </DialogTitle>
            <DialogDescription>
              You currently have {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart. 
              Creating a new cart will start fresh with an empty cart.
            </DialogDescription>
          </DialogHeader>
          
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Your current cart will be saved and you can switch back to it later.
            </AlertDescription>
          </Alert>
          
          <DialogFooter className="flex gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowNewCartDialog(false)}
              disabled={isCreatingCart}
            >
              Cancel
            </Button>
            <Button
              onClick={createNewCart}
              disabled={isCreatingCart}
              className="flex items-center gap-2"
            >
              {isCreatingCart ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create New Cart
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};

export default CartPreviewPanel;