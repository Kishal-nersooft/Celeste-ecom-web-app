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
  // Legacy fields for backward compatibility
  price?: number;
  unit?: string;
  categoryId?: string;
  imageUrl?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export enum OrderStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  customerName?: string;
  email?: string;
  deliveryLocation?: string;
  orderType?: 'delivery' | 'pickup';
  payment?: {
    method: string;
    transaction_id: string;
    amount: number;
    status: string;
  };
  location?: {
    mode: 'delivery' | 'pickup';
    id: number;
    address?: string;
  };
}

interface CartState {
  items: CartItem[];
  orders: Order[];
  cartId: number | string | null;
  isCartCreated: boolean;
  addItem: (product: Product) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  deleteCartProduct: (productId: number) => Promise<void>;
  resetCart: () => Promise<void>;
  clearCart: () => void;
  clearInvalidCart: () => void;
  getTotalPrice: () => number;
  getSubTotalPrice: () => number;
  getItemCount: (productId: number) => number;
  getGroupedItems: () => CartItem[];
  placeOrder: (userId: string, customerName?: string, email?: string, deliveryLocation?: string, orderType?: 'delivery' | 'pickup') => Order;
  getOrders: () => Order[];
  createCart: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
  resetCartOnPermissionError: () => Promise<void>;
  validateCart: () => Promise<boolean>;
}

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orders: [],
      cartId: null,
      isCartCreated: false,
      createCart: async () => {
        try {
          const { createCart } = await import('./lib/api');
          // Generate a completely unique cart name using timestamp and random string
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substr(2, 12);
          const sessionId = typeof window !== 'undefined' ? 
            (sessionStorage.getItem('sessionId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`) : 
            `server_${timestamp}`;
          
          const cartData = {
            name: `Cart_${sessionId}_${timestamp}_${randomString}`,
            description: `Dynamic shopping cart - Session: ${sessionId}`
          };
          
          console.log('🛒 Creating dynamic cart with data:', cartData);
          const cart = await createCart(cartData);
          set({ cartId: cart.id, isCartCreated: true });
          console.log('✅ Cart created successfully with ID:', cart.id);
          
          // Store session ID for future cart operations
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('sessionId', sessionId);
          }
        } catch (error: any) {
          console.error('❌ Failed to create cart:', error);
          // If it's a conflict error, try with a different name
          if (error.message?.includes('409') || error.message?.includes('Conflict')) {
            console.log('🔄 Cart name conflict, trying with different name...');
            try {
              const { createCart } = await import('./lib/api');
              const timestamp = Date.now();
              const randomId = Math.random().toString(36).substr(2, 15);
              const sessionId = typeof window !== 'undefined' ? 
                (sessionStorage.getItem('sessionId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`) : 
                `server_${timestamp}`;
              
              const cartData = {
                name: `Cart_${sessionId}_${timestamp}_${randomId}_retry`,
                description: `Dynamic shopping cart retry - Session: ${sessionId}`
              };
              
              const cart = await createCart(cartData);
              set({ cartId: cart.id, isCartCreated: true });
              console.log('✅ Cart created with unique retry ID:', cart.id);
              
              // Store session ID for future cart operations
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('sessionId', sessionId);
              }
            } catch (retryError) {
              console.error('❌ Failed to create cart even with unique name:', retryError);
              throw retryError;
            }
          } else {
            throw error;
          }
        }
      },
      clearCart: () => {
        set({ cartId: null, isCartCreated: false, items: [] });
        // Clear session storage to prevent old cart IDs from persisting
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cart-store');
          sessionStorage.removeItem('sessionId');
        }
        console.log('🛒 Cart cleared completely');
      },
      resetCartOnPermissionError: async () => {
        console.log('🔄 Resetting cart due to permission error...');
        set({ cartId: null, isCartCreated: false, items: [] });
        // Clear the persisted data to prevent the old cart ID from coming back
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cart-store');
        }
        try {
          await get().createCart();
          console.log('✅ New cart created after permission error');
        } catch (error) {
          console.error('❌ Failed to create new cart after permission error:', error);
        }
      },
      clearInvalidCart: () => {
        console.log('🔄 Clearing invalid cart ID...');
        set({ cartId: null, isCartCreated: false, items: [] });
        // Clear the persisted data to prevent the old cart ID from coming back
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cart-store');
        }
      },
      validateCart: async () => {
        const state = get();
        if (!state.cartId || !state.isCartCreated) return true;
        
        // Only validate numeric cart IDs
        if (typeof state.cartId !== 'number') return true;
        
        try {
          const { getCartDetails } = await import('./lib/api');
          await getCartDetails(state.cartId);
          return true;
        } catch (error: any) {
          if (error.message?.includes('404') || error.message?.includes('403')) {
            console.log('❌ Cart validation failed, clearing invalid cart...');
            state.clearInvalidCart();
            return false;
          }
          return true; // Other errors don't necessarily mean cart is invalid
        }
      },
      addItem: async (product) => {
        const state = get();
        
        // Clear invalid cart ID if it's still 113 (known invalid cart)
        if (state.cartId === 113) {
          console.log('🔄 Detected invalid cart ID 113, clearing...');
          state.clearInvalidCart();
        }
        
        // Check if current cart is available for modification
        if (state.cartId && typeof state.cartId === 'number' && state.isCartCreated) {
          try {
            const { isCartAvailableForModification } = await import('./lib/api');
            const isAvailable = await isCartAvailableForModification(state.cartId);
            if (!isAvailable) {
              console.log('🔄 Current cart is not available (likely ordered), creating new cart...');
              state.clearCart();
            }
          } catch (error) {
            console.warn('⚠️ Failed to check cart availability, creating new cart:', error);
            state.clearCart();
          }
        }
        
        // Always create a new cart for each session to avoid permission issues
        if (!state.isCartCreated || !state.cartId) {
          console.log('🔄 Creating new cart for this session...');
          try {
            await state.createCart();
          } catch (error) {
            console.warn('⚠️ Failed to create cart in backend, continuing with local cart:', error);
            // Set a temporary cart ID for local use
            set({ cartId: `temp_${Date.now()}`, isCartCreated: false });
          }
        }
        
        // Add item to local state
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.product.id === product.id
          );
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          } else {
            return { items: [...state.items, { product, quantity: 1 }] };
          }
        });
        
        // Try to sync with backend (non-blocking)
        const currentState = get();
        if (currentState.cartId && currentState.isCartCreated) {
          currentState.syncWithBackend().catch(error => {
            console.warn('⚠️ Backend sync failed, continuing with local cart:', error);
          });
        } else if (currentState.cartId && typeof currentState.cartId === 'string' && currentState.cartId.startsWith('temp_')) {
          // If we have a temporary cart ID, try to create a real cart and sync
          console.log('🔄 Attempting to create real cart for sync...');
          currentState.createCart().then(() => {
            const newState = get();
            if (newState.cartId && newState.isCartCreated) {
              newState.syncWithBackend().catch(error => {
                console.warn('⚠️ Backend sync failed after cart creation:', error);
              });
            }
          }).catch(error => {
            console.warn('⚠️ Failed to create real cart for sync:', error);
          });
        }
      },
      removeItem: async (productId) => {
        const state = get();
        
        // Update local state
        set((state) => ({
          items: state.items.reduce((acc, item) => {
            if (item.product.id === productId) {
              if (item.quantity > 1) {
                acc.push({ ...item, quantity: item.quantity - 1 });
              }
            } else {
              acc.push(item);
            }
            return acc;
          }, [] as CartItem[]),
        }));
        
        // Try to sync with backend (non-blocking)
        if (state.cartId && state.isCartCreated) {
          state.syncWithBackend().catch(error => {
            console.warn('⚠️ Backend sync failed, continuing with local cart:', error);
          });
        }
      },
      deleteCartProduct: async (productId) => {
        const state = get();
        
        // Update local state
        set((state) => ({
          items: state.items.filter(
            ({ product }) => product?.id !== productId
          ),
        }));
        
        // Try to sync with backend (non-blocking)
        if (state.cartId && state.isCartCreated) {
          state.syncWithBackend().catch(error => {
            console.warn('⚠️ Backend sync failed, continuing with local cart:', error);
          });
        }
      },
      resetCart: async () => {
        const state = get();
        set({ items: [] });
        
        // Try to sync with backend (non-blocking)
        if (state.cartId && state.isCartCreated) {
          state.syncWithBackend().catch(error => {
            console.warn('⚠️ Backend sync failed, continuing with local cart:', error);
          });
        }
      },
      syncWithBackend: async () => {
        const state = get();
        
        // If no cart exists or cart creation failed, create a new one
        if (!state.cartId || !state.isCartCreated) {
          console.log('🔄 No valid cart found, creating new cart...');
          try {
            await state.createCart();
          } catch (error) {
            console.error('❌ Failed to create cart:', error);
            return;
          }
        }
        
        const currentState = get();
        if (!currentState.cartId || !currentState.isCartCreated) {
          console.error('❌ Still no valid cart after creation attempt');
          return;
        }
        
        try {
          const { addItemToCart } = await import('./lib/api');
          
          // Add items to the valid cart
          for (const localItem of currentState.items) {
            try {
              // Ensure cartId is a number before making API call
              if (typeof currentState.cartId !== 'number') {
                console.warn('⚠️ Cart ID is not numeric, skipping backend sync');
                continue;
              }
              
              await addItemToCart(currentState.cartId, {
                product_id: localItem.product.id,
                quantity: localItem.quantity
              });
              console.log(`✅ Item ${localItem.product.id} added to cart ${currentState.cartId}`);
            } catch (itemError: any) {
              // If we get a 403 error, the cart doesn't belong to us - reset and create a new one
              if (itemError.status === 403 || itemError.message?.includes('403') || itemError.message?.includes('permission')) {
                console.log('❌ Cart permission denied (403), resetting cart...');
                console.log('❌ Error details:', itemError.details);
                await currentState.resetCartOnPermissionError();
                // Retry with the new cart
                const newState = get();
                if (newState.cartId && typeof newState.cartId === 'number') {
                  try {
                    await addItemToCart(newState.cartId, {
                      product_id: localItem.product.id,
                      quantity: localItem.quantity
                    });
                    console.log(`✅ Item ${localItem.product.id} added to new cart ${newState.cartId}`);
                  } catch (retryError) {
                    console.error('❌ Failed to add item to new cart:', retryError);
                  }
                }
              } else {
                console.log(`⚠️ Item ${localItem.product.id} might already exist in cart or other error:`, itemError.message);
              }
            }
          }
          
          console.log('🔄 Cart synced with backend successfully');
        } catch (error) {
          console.error('❌ Failed to sync cart with backend:', error);
          // Don't throw the error - let the user continue with local cart
        }
      },
      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + (item.product.pricing?.final_price ?? item.product.base_price ?? 0) * item.quantity,
          0
        );
      },
      getSubTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + (item.product.pricing?.final_price ?? item.product.base_price ?? 0) * item.quantity,
          0
        );
      },
      getItemCount: (productId) => {
        const item = get().items.find((item) => item.product.id === productId);
        return item ? item.quantity : 0;
      },
      getGroupedItems: () => get().items,
      placeOrder: (userId, customerName, email, deliveryLocation, orderType) => {
        const state = get();
        const orderItems: OrderItem[] = state.items.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.pricing?.final_price ?? item.product.base_price ?? 0,
          quantity: item.quantity,
          imageUrl: item.product.image_urls?.[0] || item.product.imageUrl,
        }));

        const order: Order = {
          id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orderNumber: `ORD-${Date.now()}`,
          userId,
          items: orderItems,
          totalAmount: state.getTotalPrice(),
          status: OrderStatus.PENDING,
          createdAt: new Date().toISOString(),
          customerName,
          email,
          deliveryLocation,
          orderType,
        };

        set((state) => ({
          orders: [...state.orders, order],
          items: [], // Clear cart after placing order
        }));

        return order;
      },
      getOrders: () => get().orders,
    }),
    { name: "cart-store" }
  )
);

export { useCartStore };
export default useCartStore;
