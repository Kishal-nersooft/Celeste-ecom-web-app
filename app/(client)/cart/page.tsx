"use client";
import Container from "@/components/Container";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import AuthRetryScreen from "@/components/AuthRetryScreen";
import NoAccessToCart from "@/components/NoAccessToCart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Trash2, ArrowRight, Calendar, Package, AlertTriangle } from "lucide-react";
import useCartStore from "@/store";
import PriceFormatter from "@/components/PriceFormatter";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getProductById } from "@/lib/api";
import { useLocation } from "@/contexts/LocationContext";
import { useLocationPicker } from "@/components/LocationSelector";

const CartPage = () => {
  const { user, loading, unresolved, isGuest } = useAuth();
  const router = useRouter();
  const cartStore = useCartStore();
  const { hasValidLocation } = useLocation();
  const locationPicker = useLocationPicker();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cartToDelete, setCartToDelete] = useState<number | null>(null);
  const [isCreatingCart, setIsCreatingCart] = useState(false);
  const [isDeletingCart, setIsDeletingCart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productDetails, setProductDetails] = useState<{[key: number]: any}>({});
  const [loadingProducts, setLoadingProducts] = useState<{[key: number]: boolean}>({});

  useEffect(() => {
    if (isGuest) {
      router.push("/login?returnUrl=" + encodeURIComponent("/cart"));
    }
  }, [isGuest, router]);

  useEffect(() => {
    if (user && cartStore.carts.length === 0) {
      loadCarts();
    }
  }, [user]); // Remove cartStore from dependencies to prevent infinite loops

  // Filter only active carts (status: "active", not "ordered")
  const activeCarts = cartStore.carts.filter(cart => {
    // Show only carts with status 'active' or no status (legacy carts)
    const isActive = cart.status === 'active' || !cart.status;
    return isActive;
  });

  // Fetch product details for all cart items
  useEffect(() => {
    if (activeCarts.length > 0) {
      const allProductIds = new Set<number>();
      
      activeCarts.forEach(cart => {
        cart.items.forEach(item => {
          if (item.product?.id) {
            allProductIds.add(item.product.id);
          }
        });
      });
      
      // Fetch product details for all unique product IDs
      allProductIds.forEach(productId => {
        fetchProductDetails(productId);
      });
    }
  }, [activeCarts]);

  const loadCarts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await cartStore.loadUserCarts();
    } catch (error) {
      console.error('Failed to load carts:', error);
      setError('Failed to load carts. Please try again.');
      toast.error('Failed to load carts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewCart = async () => {
    try {
      setIsCreatingCart(true);
      const newCart = await cartStore.createNewCart();
      toast.success(`New cart "${newCart.name}" created!`);
    } catch (error) {
      console.error('Failed to create new cart:', error);
      toast.error('Failed to create new cart. Please try again.');
    } finally {
      setIsCreatingCart(false);
    }
  };

  const handleSwitchCart = async (cartId: number) => {
    try {
      await cartStore.switchCart(cartId);
      const cart = cartStore.getCartById(cartId);
      toast.success(`Switched to "${cart?.name || 'Cart'}"`);
    } catch (error) {
      console.error('Failed to switch cart:', error);
      toast.error('Failed to switch cart. Please try again.');
    }
  };

  const handleDeleteCart = async (cartId: number) => {
    try {
      setIsDeletingCart(true);
      await cartStore.deleteCart(cartId);
      toast.success('Cart deleted successfully!');
      setShowDeleteDialog(false);
      setCartToDelete(null);
    } catch (error) {
      console.error('Failed to delete cart:', error);
      toast.error('Failed to delete cart. Please try again.');
    } finally {
      setIsDeletingCart(false);
    }
  };

  const openDeleteDialog = (cartId: number) => {
    setCartToDelete(cartId);
    setShowDeleteDialog(true);
  };

  const fetchProductDetails = async (productId: number) => {
    if (productDetails[productId] || loadingProducts[productId]) {
      return; // Already fetched or currently loading
    }

    try {
      setLoadingProducts(prev => ({ ...prev, [productId]: true }));
      
      const product = await getProductById(productId.toString());
      
      setProductDetails(prev => ({
        ...prev,
        [productId]: product
      }));
    } catch (error) {
      console.error(`❌ Failed to fetch product details for ID ${productId}:`, error);
      // Set a placeholder for failed products
      setProductDetails(prev => ({
        ...prev,
        [productId]: {
          id: productId,
          name: 'Product Not Found',
          base_price: 0,
          image_urls: [],
          pricing: {
            base_price: 0,
            final_price: 0,
            discount_applied: 0,
            discount_percentage: 0,
            applied_price_lists: []
          }
        }
      }));
    } finally {
      setLoadingProducts(prev => ({ ...prev, [productId]: false }));
    }
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

  const cartBeingDeleted =
    cartToDelete != null ? activeCarts.find((cart) => cart.id === cartToDelete) : null;
  const deleteItemCount =
    cartBeingDeleted?.itemCount ?? cartBeingDeleted?.items.length ?? 0;

  // Error state
  if (error) {
    return (
      <Container className="py-10">
        <div className="text-center">
          <Alert className="max-w-md mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button onClick={loadCarts} className="mt-4">
            Try Again
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4 sm:py-6 md:py-8 lg:py-10">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-1 sm:mb-2">My Carts</h1>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 hidden sm:block">Manage your active shopping carts</p>
          </div>
          <Button
            onClick={handleCreateNewCart}
            disabled={isCreatingCart}
            className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4 py-1.5 sm:py-2"
          >
            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">{isCreatingCart ? 'Creating...' : 'Create New Cart'}</span>
            <span className="sm:hidden">{isCreatingCart ? '...' : 'New Cart'}</span>
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading carts...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && activeCarts.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Active Carts</h3>
            <p className="text-gray-500 mb-6">You don't have any active shopping carts yet.</p>
            <Button onClick={handleCreateNewCart} disabled={isCreatingCart}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Cart
            </Button>
          </div>
        )}

        {/* Carts Grid */}
        {!isLoading && activeCarts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {activeCarts.map((cart) => {
              return (
              <Card
                key={cart.id}
                className={`relative flex h-full flex-col ${cart.isActive ? 'ring-2 ring-blue-500' : ''}`}
              >
                <CardHeader className="pb-2 sm:pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm sm:text-base md:text-lg font-semibold truncate">
                      {cart.name}
                    </CardTitle>
                    {cart.isActive && (
                      <Badge variant="default" className="bg-blue-500">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                      {cart.itemCount} items
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                      {new Date(cart.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex flex-1 flex-col gap-4">
                  {/* Cart Items Preview — fixed height for 2 rows; scroll to see more */}
                  <div className="h-24 shrink-0 space-y-2 overflow-y-auto pr-1">
                    {cart.items.map((item, index) => {
                      // Add safety checks for item structure
                      if (!item || !item.product) {
                        return (
                          <div
                            key={index}
                            className="flex h-11 shrink-0 items-center gap-2 text-sm text-gray-500"
                          >
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-xs font-medium">
                              {item?.quantity || 0}
                            </div>
                            <span className="truncate flex-1">Unknown Product</span>
                            <span className="text-xs font-medium">$0.00</span>
                          </div>
                        );
                      }
                      
                      const productId = item.product.id;
                      const fetchedProduct = productDetails[productId];
                      const isLoading = loadingProducts[productId];
                      
                      // Use fetched product details if available, otherwise fall back to cart item data
                      const productImage = fetchedProduct?.image_urls?.[0] || 
                                        item.product.image_urls?.[0] || 
                                        item.product.imageUrl || 
                                        '/images/placeholder.png';
                      const productName = fetchedProduct?.name || 
                                        item.product.name || 
                                        'Unknown Product';
                      const unitPrice = fetchedProduct?.pricing?.final_price || 
                                      fetchedProduct?.base_price || 
                                      item.product.pricing?.final_price || 
                                      item.product.base_price || 
                                      0;
                      const totalPrice = unitPrice * item.quantity;
                      
                      return (
                        <div key={index} className="flex h-11 shrink-0 items-center gap-2 text-sm">
                          {/* Product Image */}
                          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                            {isLoading ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              </div>
                            ) : (
                              <img 
                                src={productImage} 
                                alt={productName}
                                loading="lazy"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                          
                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium">
                              {isLoading ? 'Loading...' : productName}
                            </div>
                            <div className="text-xs text-gray-500">
                              Qty: {item.quantity} × <PriceFormatter amount={unitPrice} className="inline" />
                            </div>
                          </div>
                          
                          {/* Total Price */}
                          <div className="text-xs font-medium">
                            <PriceFormatter amount={totalPrice} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total Price */}
                  <div className="mt-auto border-t pt-3">
                    <div className="flex items-center justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <PriceFormatter amount={cart.totalPrice} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 sm:gap-2">
                    {!cart.isActive && (
                      <Button
                        onClick={() => handleSwitchCart(cart.id)}
                        className="flex-1 text-xs sm:text-sm"
                        size="sm"
                      >
                        Switch to This Cart
                      </Button>
                    )}
                    {cart.isActive && (
                      <Button
                        onClick={() => {
                          if (!hasValidLocation) {
                            toast.error("Please select a delivery location to continue");
                            locationPicker?.openPicker();
                            return;
                          }
                          router.push("/checkout");
                        }}
                        className="flex-1 text-xs sm:text-sm"
                        size="sm"
                      >
                        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Checkout
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(cart.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={showDeleteDialog}
          onOpenChange={(open) => {
            if (isDeletingCart) return;
            setShowDeleteDialog(open);
            if (!open) setCartToDelete(null);
          }}
        >
          <DialogContent className="max-w-[340px] gap-5 rounded-2xl border-0 p-6 shadow-xl sm:max-w-sm">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-[15px] font-semibold leading-snug">
                Delete this cart?
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
                All items in this cart will be permanently removed. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>

            {cartBeingDeleted && (
              <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                <div className="flex shrink-0 -space-x-2">
                  {cartBeingDeleted.items.slice(0, 3).map((item, index) => {
                    if (!item?.product) return null;
                    const productId = item.product.id;
                    const fetchedProduct = productDetails[productId];
                    const img =
                      fetchedProduct?.image_urls?.[0] ||
                      item.product.image_urls?.[0] ||
                      item.product.imageUrl;
                    return (
                      <div
                        key={productId ?? index}
                        className="relative h-8 w-8 overflow-hidden rounded-full ring-2 ring-background"
                      >
                        {img ? (
                          <Image
                            src={img as string}
                            alt=""
                            width={32}
                            height={32}
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
                  {deleteItemCount > 3 && (
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-background">
                      +{deleteItemCount - 3}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {cartBeingDeleted.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {deleteItemCount} {deleteItemCount === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeletingCart}
                className="h-10 flex-1 text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => cartToDelete && handleDeleteCart(cartToDelete)}
                disabled={isDeletingCart}
                className="h-10 flex-1 gap-1.5"
              >
                {isDeletingCart ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-destructive-foreground/30 border-t-destructive-foreground" />
                    Deleting
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete cart
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Container>
  );
};

export default CartPage;