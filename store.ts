import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Product {
  id: number;
  ref?: string;
  name: string;
  description?: string;
  brand?: string;
  base_price: number;
  unit_measure: string;
  image_urls: string[];
  ecommerce_category_id?: number;
  ecommerce_subcategory_id?: number;
  created_at?: string;
  updated_at?: string;
  categories?: any[];
  product_tags?: any[];
  pricing?: {
    base_price: number;
    final_price: number;
    discount_applied: number;
    discount_percentage: number;
    applied_price_lists: string[];
  };
  inventory?: {
    can_order: boolean;
    max_available: number;
    in_stock: boolean;
    ondemand_delivery_available: boolean;
    reason_unavailable: string | null;
  };
  future_pricing?: {
    min_quantity: number;
    final_price: number;
    discount_percentage: number;
  }[];
  // Legacy fields for backward compatibility
  price?: number;
  unit?: string;
  categoryId?: string;
  imageUrl?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  itemId?: number; // Cart item ID from backend
}

export interface OrderItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string; // For compatibility with backend
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  totalAmount?: number; // For compatibility with backend
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  customerName?: string;
  email?: string;
  deliveryLocation?: string;
  orderType: 'delivery' | 'pickup';
  fulfillmentMode?: 'delivery' | 'pickup'; // For compatibility with backend
  deliveryCharge?: number; // For compatibility with backend
  orderNumber?: string; // For compatibility with backend
  createdAt: Date;
  updatedAt: Date;
}

export interface Cart {
  id: number;
  name: string;
  description?: string;
  items: CartItem[];
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  itemCount: number;
  totalPrice: number;
  isOrdered?: boolean; // Whether this cart has been used in an order
  status?: 'active' | 'ordered' | 'completed'; // Cart status from backend
}


interface CartState {
  // Legacy single cart properties (for backward compatibility)
  items: CartItem[];
  orders: Order[];
  cartId: number | null;
  isCartCreated: boolean;
  isSyncing: boolean;
  
  // Multi-cart properties
  carts: Cart[];
  activeCartId: number | null;
  isLoadingCarts: boolean;
  
  // Legacy cart functions (now work with active cart)
  addItem: (product: Product) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  updateItemQuantity: (productId: number, newQuantity: number) => Promise<void>;
  deleteCartProduct: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalPrice: () => number;
  getSubTotalPrice: () => number;
  getItemCount: (productId: number) => number;
  getGroupedItems: () => CartItem[];
  placeOrder: (userId: string, customerName?: string, email?: string, deliveryLocation?: string, orderType?: 'delivery' | 'pickup') => Order;
  getOrders: () => Order[];
  resetCart: () => Promise<void>;
  setCartId: (cartId: number | null) => void;
  setIsCartCreated: (isCreated: boolean) => void;
  
  // New multi-cart functions
  createNewCart: (name?: string, description?: string) => Promise<Cart>;
  switchCart: (cartId: number) => Promise<void>;
  loadUserCarts: () => Promise<void>;
  deleteCart: (cartId: number) => Promise<void>;
  getActiveCart: () => Cart | null;
  getCartById: (cartId: number) => Cart | null;
  updateCartName: (cartId: number, name: string) => Promise<void>;
  syncActiveCartWithBackend: () => Promise<void>;
}

// Debounce utility
let debounceTimeouts: { [key: string]: NodeJS.Timeout } = {};

const debounce = (key: string, fn: () => Promise<void>, delay: number) => {
  if (debounceTimeouts[key]) {
    clearTimeout(debounceTimeouts[key]);
  }
  debounceTimeouts[key] = setTimeout(fn, delay);
};

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // Legacy single cart properties
      items: [],
      orders: [],
      cartId: null,
      isCartCreated: false,
      isSyncing: false,
      
      // Multi-cart properties
      carts: [],
      activeCartId: null,
      isLoadingCarts: false,

      addItem: async (product: Product) => {
        const state = get();
        
        // Check if item already exists in active cart
        const existingItem = state.items.find(item => item && item.product && item.product.id === product.id);
        
        let updatedItems;
        if (existingItem) {
          // Update quantity locally
          updatedItems = state.items.map(item =>
            item && item.product && item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
          set({ items: updatedItems });
        } else {
          // Add new item locally
          updatedItems = [...state.items, { product, quantity: 1 }];
          set({ items: updatedItems });
        }

        // Create cart if no active cart exists
        let newCartId = state.activeCartId;
        if (!state.activeCartId) {
          try {
            // Preserve the items before creating cart
            const itemsToPreserve = updatedItems;
            const newCart = await get().createNewCart();
            newCartId = newCart.id;
            console.log('✅ New cart created for first item:', newCartId);
            
            // Restore the items after cart creation (createNewCart clears items)
            set({ 
              items: itemsToPreserve,
              activeCartId: newCartId,
              cartId: newCartId 
            });
          } catch (error) {
            console.error('❌ Failed to create cart:', error);
            // Rollback: remove the item that was added
            set({ items: state.items });
            return;
          }
        }

        // Update the active cart in the carts array with current items
        const currentState = get();
        set({
          carts: currentState.carts.map(cart => 
            cart.id === currentState.activeCartId 
              ? {
                  ...cart,
                  items: currentState.items,
                  itemCount: currentState.items.length,
                  totalPrice: currentState.items.reduce((total, item) => {
                    if (!item || !item.product) return total;
                    const price = item.product.pricing?.final_price || item.product.base_price || 0;
                    return total + (price * item.quantity);
                  }, 0)
                }
              : cart
          )
        });

        // Debounced backend sync
        debounce('addItem', async () => {
          const currentState = get();
          if (!currentState.activeCartId) return;

          try {
            set({ isSyncing: true });
            const { addItemToCart } = await import('./lib/api');
            await addItemToCart(currentState.activeCartId, { 
              product_id: product.id, 
              quantity: 1 
            });
            console.log('✅ Item synced to backend');
          } catch (error) {
            console.error('❌ Failed to sync item:', error);
          } finally {
            set({ isSyncing: false });
          }
        }, 500);
      },

      removeItem: async (productId: number) => {
        const state = get();
        const existingItem = state.items.find(item => item && item.product && item.product.id === productId);
        
        if (!existingItem) return;

        let newItems;
        if (existingItem.quantity > 1) {
          // Decrease quantity locally
          newItems = state.items.map(item =>
            item && item.product && item.product.id === productId
              ? { ...item, quantity: item.quantity - 1 }
              : item
          );
        } else {
          // Remove item completely locally
          newItems = state.items.filter(item => item && item.product && item.product.id !== productId);
        }
        
        set({ items: newItems });

        // Update the active cart in the carts array
        set(state => ({
          carts: state.carts.map(cart => 
            cart.id === state.activeCartId 
              ? {
                  ...cart,
                  items: newItems,
                  itemCount: newItems.length,
                  totalPrice: newItems.reduce((total, item) => {
                    if (!item || !item.product) return total;
                    const price = item.product.pricing?.final_price || item.product.base_price || 0;
                    return total + (price * item.quantity);
                  }, 0)
                }
              : cart
          )
        }));

        // Debounced backend sync
        debounce('removeItem', async () => {
          const currentState = get();
          if (!currentState.activeCartId) return;

          try {
            set({ isSyncing: true });
            const { removeFromCart } = await import('./lib/api');
            await removeFromCart(currentState.activeCartId, productId);
            console.log('✅ Item removal synced to backend');
          } catch (error) {
            console.error('❌ Failed to sync removal:', error);
          } finally {
            set({ isSyncing: false });
          }
        }, 500);
      },

      updateItemQuantity: async (productId: number, newQuantity: number) => {
        if (newQuantity <= 0) {
          get().removeItem(productId);
          return;
        }

        // Update quantity locally
        const newItems = get().items.map(item =>
          item && item.product && item.product.id === productId
            ? { ...item, quantity: newQuantity }
            : item
        );
        set({ items: newItems });

        // Update the active cart in the carts array
        set(state => ({
          carts: state.carts.map(cart => 
            cart.id === state.activeCartId 
              ? {
                  ...cart,
                  items: newItems,
                  itemCount: newItems.length,
                  totalPrice: newItems.reduce((total, item) => {
                    if (!item || !item.product) return total;
                    const price = item.product.pricing?.final_price || item.product.base_price || 0;
                    return total + (price * item.quantity);
                  }, 0)
                }
              : cart
          )
        }));

        // Debounced backend sync
        debounce('updateQuantity', async () => {
          const currentState = get();
          if (!currentState.activeCartId) return;

          try {
            set({ isSyncing: true });
            const { updateCartItemQuantityByProductId } = await import('./lib/api');
            
            console.log(`🔄 Updating quantity for product ${productId} to ${newQuantity} in cart ${currentState.activeCartId}`);
            // Update quantity directly using the new API function
            await updateCartItemQuantityByProductId(currentState.activeCartId, productId, newQuantity);
            console.log('✅ Quantity update synced to backend');
          } catch (error) {
            console.error('❌ Failed to sync quantity update:', error);
          } finally {
            set({ isSyncing: false });
          }
        }, 300);
      },

      deleteCartProduct: async (productId: number) => {
        // Remove item completely locally
        const newItems = get().items.filter(item => item && item.product && item.product.id !== productId);
        set({ items: newItems });

        // Update the active cart in the carts array
        set(state => ({
          carts: state.carts.map(cart => 
            cart.id === state.activeCartId 
              ? {
                  ...cart,
                  items: newItems,
                  itemCount: newItems.length,
                  totalPrice: newItems.reduce((total, item) => {
                    if (!item || !item.product) return total;
                    const price = item.product.pricing?.final_price || item.product.base_price || 0;
                    return total + (price * item.quantity);
                  }, 0)
                }
              : cart
          )
        }));

        // Debounced backend sync
        debounce('deleteProduct', async () => {
          const currentState = get();
          if (!currentState.activeCartId) return;

          try {
            set({ isSyncing: true });
            const { removeFromCart } = await import('./lib/api');
            await removeFromCart(currentState.activeCartId, productId);
            console.log('✅ Product deletion synced to backend');
          } catch (error) {
            console.error('❌ Failed to sync product deletion:', error);
          } finally {
            set({ isSyncing: false });
          }
        }, 500);
      },

      clearCart: async () => {
        const state = get();
        
        // Clear locally
        set({ items: [] });

        // Update the active cart in the carts array
        set(state => ({
          carts: state.carts.map(cart => 
            cart.id === state.activeCartId 
              ? {
                  ...cart,
                  items: [],
                  itemCount: 0,
                  totalPrice: 0
                }
              : cart
          )
        }));

        // Clear backend immediately
        if (state.activeCartId) {
          try {
            const { deleteCart } = await import('./lib/api');
            await deleteCart(state.activeCartId);
            console.log('✅ Cart cleared from backend');
          } catch (error: any) {
            // Handle 409 Conflict gracefully - this means the cart is associated with a completed order
            if (error.message?.includes('409') || error.message?.includes('Conflict')) {
              console.log('ℹ️ Cart cannot be deleted (associated with completed order)');
            } else {
              console.error('❌ Failed to clear backend cart:', error);
            }
          }
        }

        // Reset cart state regardless of backend deletion success
        set({ 
          activeCartId: null, 
          cartId: null, 
          isCartCreated: false,
          carts: state.carts.filter(cart => cart.id !== state.activeCartId)
        });
      },

      getTotalPrice: () => {
        const items = get().items || [];
        return items.reduce((total, item) => {
          if (!item || !item.product) return total;
          const price = item.product.pricing?.final_price || item.product.base_price || 0;
          return total + (price * item.quantity);
        }, 0);
      },

      getSubTotalPrice: () => {
        return get().getTotalPrice();
      },

      getItemCount: (productId: number) => {
        const items = get().items || [];
        const item = items.find(item => item && item.product && item.product.id === productId);
        return item ? item.quantity : 0;
      },

      getGroupedItems: () => {
        return get().items;
      },

      placeOrder: (userId: string, customerName?: string, email?: string, deliveryLocation?: string, orderType: 'delivery' | 'pickup' = 'delivery') => {
        const items = get().items;
        const total = get().getTotalPrice();
        
        const order: Order = {
          id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          items: items.filter(item => item && item.product).map(item => ({
            productId: item.product.id,
            name: item.product.name,
            price: item.product.pricing?.final_price || item.product.base_price,
            quantity: item.quantity
          })),
          total,
          status: 'pending',
          customerName,
          email,
          deliveryLocation,
          orderType,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        set(state => ({ orders: [...state.orders, order] }));
        return order;
      },

      getOrders: () => {
        return get().orders;
      },

      resetCart: async () => {
        await get().clearCart();
        set({ orders: [] });
      },

      setCartId: (cartId: number | null) => {
        set({ cartId });
      },

      setIsCartCreated: (isCreated: boolean) => {
        set({ isCartCreated: isCreated });
      },

      // Multi-cart functions
      createNewCart: async (name?: string, description?: string) => {
        try {
          const { createCart } = await import('./lib/api');
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substr(2, 12);
          const sessionId = typeof window !== 'undefined' ? 
            (sessionStorage.getItem('sessionId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`) : 
            `server_${timestamp}`;
          
          const cartName = name || `Cart_${sessionId}_${timestamp}_${randomString}`;
          const cartDescription = description || `User cart - Session: ${sessionId}`;
          
          const cartResponse = await createCart({
            name: cartName,
            description: cartDescription
          });
          
          const newCartId = cartResponse.data?.id || cartResponse.id;
          
          const newCart: Cart = {
            id: newCartId,
            name: `Cart #${newCartId}`, // Use cart ID for naming
            description: cartDescription,
            items: [],
            createdAt: new Date().toISOString(),
            isActive: true,
            itemCount: 0,
            totalPrice: 0,
            isOrdered: false,
            status: 'active'
          };
          
          // Update state
          set(state => {
            const updatedCarts = state.carts.map(cart => ({ ...cart, isActive: false }));
            return {
              carts: [...updatedCarts, newCart],
              activeCartId: newCartId,
              cartId: newCartId,
              isCartCreated: true,
              items: [] // Clear current items when creating new cart
            };
          });
          
          console.log('✅ New cart created:', newCartId);
          return newCart;
        } catch (error) {
          console.error('❌ Failed to create new cart:', error);
          throw error;
        }
      },

      switchCart: async (cartId: number) => {
        try {
          const { getCartDetails, getProductById } = await import('./lib/api');
          
          // Get cart details from backend
          const cartDetails = await getCartDetails(cartId);
          const cartData = cartDetails?.data || cartDetails;
          
          // Convert backend items to CartItem format with full product data
          // Fetch complete product details for ALL items to ensure we have full data
          const cartItemsPromises = (cartData.items || []).map(async (item: any) => {
            const productId = item.product_id || item.product?.id;
            
            if (!productId) {
              console.warn('⚠️ Cart item has no product ID');
              return null;
            }
            
            try {
              // Always fetch complete product data to ensure we have everything
              console.log(`🔍 Fetching complete product data for ID: ${productId}`);
              const fullProduct = await getProductById(productId.toString());
              
              if (!fullProduct) {
                console.warn(`⚠️ Product ${productId} not found`);
                return null;
              }
              
              console.log(`✅ Got complete data for product ${productId}:`, fullProduct?.name);
              
              return {
                product: {
                  id: fullProduct.id,
                  name: fullProduct.name,
                  base_price: fullProduct.base_price || 0,
                  pricing: {
                    base_price: fullProduct.base_price || 0,
                    final_price: fullProduct.pricing?.final_price || fullProduct.final_price || fullProduct.base_price || 0,
                    discount_applied: fullProduct.pricing?.discount_applied || 0,
                    discount_percentage: fullProduct.pricing?.discount_percentage || 0,
                    applied_price_lists: fullProduct.pricing?.applied_price_lists || []
                  },
                  image_urls: fullProduct.image_urls || [],
                  unit_measure: fullProduct.unit_measure || 'piece',
                  ref: fullProduct.ref,
                  description: fullProduct.description,
                  brand: fullProduct.brand,
                  ecommerce_category_id: fullProduct.ecommerce_category_id,
                  ecommerce_subcategory_id: fullProduct.ecommerce_subcategory_id,
                  created_at: fullProduct.created_at,
                  updated_at: fullProduct.updated_at,
                  categories: fullProduct.categories,
                  product_tags: fullProduct.product_tags,
                  inventory: fullProduct.inventory,
                  price: fullProduct.price,
                  unit: fullProduct.unit,
                  categoryId: fullProduct.categoryId,
                  imageUrl: fullProduct.image_urls?.[0]
                },
                quantity: item.quantity || 1,
                itemId: item.id
              };
            } catch (error) {
              console.error(`❌ Failed to fetch product ${productId}:`, error);
              return null;
            }
          });
          
          const cartItems = (await Promise.all(cartItemsPromises)).filter(item => item !== null);
          
          console.log('✅ Cart items after fetching product data:', cartItems.map(item => ({
            id: item.product.id,
            name: item.product.name,
            hasImage: !!item.product.image_urls?.length,
            hasPricing: !!item.product.pricing?.final_price
          })));
          
          // Update all carts to set the new active one
          set(state => {
            const updatedCarts = state.carts.map(cart => ({
              ...cart,
              isActive: cart.id === cartId
            }));
            
            // Also update the active cart's items with fresh data
            const updatedCartsWithFreshData = updatedCarts.map(cart => 
              cart.id === cartId 
                ? {
                    ...cart,
                    items: cartItems,
                    itemCount: cartItems.length,
                    totalPrice: cartItems.reduce((total: number, item: any) => {
                      const price = item.product.pricing?.final_price || item.product.base_price || 0;
                      return total + (price * item.quantity);
                    }, 0)
                  }
                : cart
            );
            
            return {
              carts: updatedCartsWithFreshData,
              activeCartId: cartId,
              cartId: cartId,
              items: cartItems,
              isCartCreated: true
            };
          });
          
          console.log('✅ Switched to cart:', cartId, 'with', cartItems.length, 'items');
        } catch (error) {
          console.error('❌ Failed to switch cart:', error);
          throw error;
        }
      },

      loadUserCarts: async () => {
        try {
          set({ isLoadingCarts: true });
          const { getUserCarts } = await import('./lib/api');
          const response = await getUserCarts();
          
          // Convert backend cart format to our Cart interface
          console.log('🔍 Backend cart data:', response.owned_carts);
          const carts: Cart[] = (response.owned_carts || []).map((cart: any) => {
            console.log(`Processing cart ${cart.id}: status="${cart.status}"`);
            // Safely convert cart items
            const cartItems = (cart.items || []).map((item: any) => ({
              product: {
                id: item.product?.id || item.product_id || 0,
                name: item.product?.name || 'Unknown Product',
                base_price: item.product?.base_price || item.base_price || 0,
                pricing: {
                  base_price: item.product?.base_price || item.base_price || 0,
                  final_price: item.product?.pricing?.final_price || item.final_price || item.base_price || 0,
                  discount_applied: item.product?.pricing?.discount_applied || 0,
                  discount_percentage: item.product?.pricing?.discount_percentage || 0,
                  applied_price_lists: item.product?.pricing?.applied_price_lists || []
                },
                image_urls: item.product?.image_urls || [item.product?.imageUrl] || [],
                unit_measure: item.product?.unit_measure || 'piece',
                // Add other required fields
                ref: item.product?.ref,
                description: item.product?.description,
                brand: item.product?.brand,
                ecommerce_category_id: item.product?.ecommerce_category_id,
                ecommerce_subcategory_id: item.product?.ecommerce_subcategory_id,
                created_at: item.product?.created_at,
                updated_at: item.product?.updated_at,
                categories: item.product?.categories,
                product_tags: item.product?.product_tags,
                inventory: item.product?.inventory,
                // Legacy fields
                price: item.product?.price,
                unit: item.product?.unit,
                categoryId: item.product?.categoryId,
                imageUrl: item.product?.imageUrl
              },
              quantity: item.quantity || 1,
              itemId: item.id
            }));

            return {
              id: cart.id,
              name: `Cart #${cart.id}`, // Use cart ID instead of session name
              description: cart.description,
              items: cartItems,
              createdAt: cart.created_at || new Date().toISOString(),
              updatedAt: cart.updated_at,
              isActive: false, // Will be set based on activeCartId
              itemCount: cartItems.length,
              totalPrice: cartItems.reduce((total: number, item: any) => {
                const price = item.product.pricing?.final_price || item.product.base_price || 0;
                return total + (price * item.quantity);
              }, 0),
              isOrdered: cart.is_ordered || false,
              status: cart.status || 'active' // Default to active if no status
            };
          });
          
          // Set the first cart as active if no active cart is set
          const state = get();
          const activeCartId = state.activeCartId || (carts.length > 0 ? carts[0].id : null);
          
          const updatedCarts = carts.map(cart => ({
            ...cart,
            isActive: cart.id === activeCartId
          }));
          
          console.log('✅ Final processed carts:', updatedCarts.map(cart => ({
            id: cart.id,
            name: cart.name,
            status: cart.status,
            itemCount: cart.itemCount
          })));
          
          set({
            carts: updatedCarts,
            activeCartId: activeCartId,
            cartId: activeCartId,
            isLoadingCarts: false
          });
          
          // Load items for active cart
          if (activeCartId) {
            const activeCart = updatedCarts.find(cart => cart.id === activeCartId);
            if (activeCart) {
              set({ items: activeCart.items });
            }
          }
          
          console.log('✅ User carts loaded:', carts.length);
        } catch (error) {
          console.error('❌ Failed to load user carts:', error);
          set({ isLoadingCarts: false });
          throw error;
        }
      },

      deleteCart: async (cartId: number) => {
        try {
          const { deleteCart } = await import('./lib/api');
          await deleteCart(cartId);
          
          set(state => {
            const updatedCarts = state.carts.filter(cart => cart.id !== cartId);
            const newActiveCartId = state.activeCartId === cartId ? 
              (updatedCarts.length > 0 ? updatedCarts[0].id : null) : 
              state.activeCartId;
            
            const newActiveCart = updatedCarts.find(cart => cart.id === newActiveCartId);
            
            return {
              carts: updatedCarts,
              activeCartId: newActiveCartId,
              cartId: newActiveCartId,
              items: newActiveCart?.items || []
            };
          });
          
          console.log('✅ Cart deleted:', cartId);
        } catch (error) {
          console.error('❌ Failed to delete cart:', error);
          throw error;
        }
      },

      getActiveCart: () => {
        const state = get();
        return state.carts.find(cart => cart.id === state.activeCartId) || null;
      },

      getCartById: (cartId: number) => {
        const state = get();
        return state.carts.find(cart => cart.id === cartId) || null;
      },

      updateCartName: async (cartId: number, name: string) => {
        try {
          // Update in backend (if API supports it)
          // For now, just update locally
          set(state => ({
            carts: state.carts.map(cart => 
              cart.id === cartId ? { ...cart, name } : cart
            )
          }));
          
          console.log('✅ Cart name updated:', cartId);
        } catch (error) {
          console.error('❌ Failed to update cart name:', error);
          throw error;
        }
      },

      syncActiveCartWithBackend: async () => {
        const state = get();
        if (!state.activeCartId) return;
        
        try {
          const { getCartDetails } = await import('./lib/api');
          const cartDetails = await getCartDetails(state.activeCartId);
          
          // Convert backend items to our CartItem format
          const backendItems = cartDetails.items || [];
          const convertedItems = backendItems.map((item: any) => ({
            product: {
              id: item.product?.id || item.product_id,
              name: item.product?.name || 'Unknown Product',
              base_price: item.product?.base_price || item.base_price || 0,
              pricing: {
                base_price: item.product?.base_price || item.base_price || 0,
                final_price: item.product?.pricing?.final_price || item.final_price || item.base_price || 0,
                discount_applied: item.product?.pricing?.discount_applied || 0,
                discount_percentage: item.product?.pricing?.discount_percentage || 0,
                applied_price_lists: item.product?.pricing?.applied_price_lists || []
              },
              image_urls: item.product?.image_urls || [item.product?.imageUrl] || [],
              unit_measure: item.product?.unit_measure || 'piece',
              // Add other required fields
              ref: item.product?.ref,
              description: item.product?.description,
              brand: item.product?.brand,
              ecommerce_category_id: item.product?.ecommerce_category_id,
              ecommerce_subcategory_id: item.product?.ecommerce_subcategory_id,
              created_at: item.product?.created_at,
              updated_at: item.product?.updated_at,
              categories: item.product?.categories,
              product_tags: item.product?.product_tags,
              inventory: item.product?.inventory,
              // Legacy fields
              price: item.product?.price,
              unit: item.product?.unit,
              categoryId: item.product?.categoryId,
              imageUrl: item.product?.imageUrl
            },
            quantity: item.quantity || 1,
            itemId: item.id
          }));
          
          // Update the active cart with latest backend data
          set(state => ({
            carts: state.carts.map(cart => 
              cart.id === state.activeCartId 
                ? {
                    ...cart,
                    items: convertedItems,
                    itemCount: convertedItems.length,
                    totalPrice: convertedItems.reduce((total: number, item: any) => {
                      const price = item.product.pricing?.final_price || item.product.base_price || 0;
                      return total + (price * item.quantity);
                    }, 0)
                  }
                : cart
            ),
            items: convertedItems
          }));
          
          console.log('✅ Active cart synced with backend:', convertedItems.length, 'items');
        } catch (error) {
          console.error('❌ Failed to sync active cart:', error);
          throw error;
        }
      },

    }),
    { name: "cart-store" }
  )
);

export default useCartStore;