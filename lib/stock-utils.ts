import { Product } from "../store";

export interface StockAnalysis {
  overallStatus: 'in_stock' | 'partial_stock' | 'out_of_stock' | 'no_data';
  message: string;
  totalStores: number;
  inStockStores: number;
  outOfStockStores: number;
  totalAvailable: number;
  stockDetails: {
    storeId: number;
    available: number;
    onHold: number;
    reserved: number;
    inStock: boolean;
    isNearby: boolean;
  }[];
}

export interface StockStatusUI {
  status: 'in_stock' | 'partial_stock' | 'out_of_stock' | 'no_data' | 'unknown';
  displayText: string;
  color: 'green' | 'orange' | 'red' | 'gray';
  icon: string;
  details: string;
}

export interface InventoryObject {
  can_order: boolean;
  max_available: number;
  in_stock: boolean;
  ondemand_delivery_available: boolean;
  reason_unavailable: string | null;
  store_id?: number;
  quantity_available?: number;
  can_fulfill?: boolean;
}

/**
 * Extracts store-specific inventory from product.inventory
 * Handles both single object and array formats
 */
export function getStoreInventory(product: Product, targetStoreId?: number): InventoryObject | null {
  if (!product.inventory) {
    return null;
  }

  // If inventory is an array, find the specific store's inventory
  if (Array.isArray(product.inventory)) {
    if (targetStoreId) {
      // Try to find inventory for the target store
      const storeInventory = product.inventory.find((inv: any) => inv.store_id === targetStoreId);
      if (storeInventory) {
        return storeInventory;
      }
    }
    // If no match or no target store, return first available
    return product.inventory[0] || null;
  }

  // If inventory is a single object, return it
  return product.inventory as InventoryObject;
}

/**
 * Analyzes stock status from product inventory data
 */
export function analyzeStockStatus(product: Product, targetStoreId?: number): StockAnalysis {
  const inventory = getStoreInventory(product, targetStoreId);
  
  if (!inventory) {
    return {
      overallStatus: 'no_data',
      message: 'No inventory data available',
      totalStores: 1,
      inStockStores: 0,
      outOfStockStores: 1,
      totalAvailable: 0,
      stockDetails: []
    };
  }
  
  const { can_order, max_available, in_stock } = inventory;
  
  // Determine overall status based on new logic
  let overallStatus: StockAnalysis['overallStatus'];
  let message: string;
  
  if (!in_stock) {
    overallStatus = 'out_of_stock';
    message = 'Out of stock';
  } else if (!can_order) {
    overallStatus = 'out_of_stock';
    message = 'Unavailable';
  } else {
    overallStatus = 'in_stock';
    message = 'In stock';
  }
  
  return {
    overallStatus,
    message,
    totalStores: 1,
    inStockStores: in_stock && can_order ? 1 : 0,
    outOfStockStores: !in_stock || !can_order ? 1 : 0,
    totalAvailable: max_available || 0,
    stockDetails: [{
      storeId: inventory.store_id || 1,
      available: max_available || 0,
      onHold: 0,
      reserved: 0,
      inStock: in_stock && can_order,
      isNearby: true
    }]
  };
}

/**
 * Gets UI-ready stock status information
 */
export function getStockStatusForUI(stockAnalysis: StockAnalysis): StockStatusUI {
  switch (stockAnalysis.overallStatus) {
    case 'in_stock':
      return {
        status: 'in_stock',
        displayText: 'In Stock',
        color: 'green',
        icon: '✅',
        details: `${stockAnalysis.totalAvailable} available across ${stockAnalysis.totalStores} stores`
      };
    case 'partial_stock':
      return {
        status: 'partial_stock',
        displayText: 'Limited Stock',
        color: 'orange',
        icon: '⚠️',
        details: `${stockAnalysis.totalAvailable} available at ${stockAnalysis.inStockStores} of ${stockAnalysis.totalStores} stores`
      };
    case 'out_of_stock':
      return {
        status: 'out_of_stock',
        displayText: 'Out of Stock',
        color: 'red',
        icon: '❌',
        details: 'Not available at any store'
      };
    case 'no_data':
      return {
        status: 'no_data',
        displayText: 'Stock Unknown',
        color: 'gray',
        icon: '❓',
        details: 'Inventory data not available'
      };
    default:
      return {
        status: 'unknown',
        displayText: 'Unknown',
        color: 'gray',
        icon: '❓',
        details: 'Unable to determine stock status'
      };
  }
}

/**
 * Gets a simple stock status for quick display
 */
export function getSimpleStockStatus(product: Product, targetStoreId?: number): {
  status: 'in_stock' | 'out_of_stock' | 'limited_stock' | 'unknown';
  icon: string;
  color: string;
} {
  const inventory = getStoreInventory(product, targetStoreId);
  
  if (!inventory) {
    return { status: 'unknown', icon: '❓', color: 'text-gray-400' };
  }
  
  const { can_order, in_stock } = inventory;
  
  // New logic: can_order true = normal, can_order false = unavailable
  // in_stock true = normal, in_stock false = out of stock
  // Both false = out of stock
  if (!in_stock) {
    return { status: 'out_of_stock', icon: '❌', color: 'text-red-500' };
  } else if (!can_order) {
    return { status: 'out_of_stock', icon: '❌', color: 'text-red-500' };
  } else {
    return { status: 'in_stock', icon: '✅', color: 'text-green-600' };
  }
}

/**
 * Checks if a product is available for adding to cart
 */
export function isProductAvailable(product: Product, targetStoreId?: number): boolean {
  const inventory = getStoreInventory(product, targetStoreId);
  
  if (!inventory) {
    return false;
  }
  
  const { can_order, in_stock } = inventory;
  return can_order && in_stock;
}

/**
 * Gets the total available quantity across all stores
 */
export function getTotalAvailableQuantity(product: Product, targetStoreId?: number): number {
  const inventory = getStoreInventory(product, targetStoreId);
  
  if (!inventory) {
    return 0;
  }
  
  return inventory.max_available || 0;
}

/**
 * Checks if user can add more items to cart based on current cart quantity
 */
export function canAddMoreToCart(product: Product, currentCartQuantity: number, targetStoreId?: number): {
  canAdd: boolean;
  maxAvailable: number;
  reason?: string;
} {
  const inventory = getStoreInventory(product, targetStoreId);
  
  if (!inventory) {
    return {
      canAdd: false,
      maxAvailable: 0,
      reason: 'No inventory data available'
    };
  }
  
  const { can_order, in_stock, max_available } = inventory;
  
  // If not in stock, cannot add
  if (!in_stock) {
    return {
      canAdd: false,
      maxAvailable: 0,
      reason: 'Out of stock'
    };
  }
  
  // If cannot order, cannot add
  if (!can_order) {
    return {
      canAdd: false,
      maxAvailable: 0,
      reason: 'Unavailable'
    };
  }
  
  const totalAvailable = max_available || 0;
  const canAdd = currentCartQuantity < totalAvailable;
  
  return {
    canAdd,
    maxAvailable: totalAvailable,
    reason: canAdd ? undefined : `Only ${totalAvailable} items available`
  };
}

/**
 * Gets stock availability message for UI
 */
export function getStockAvailabilityMessage(product: Product, currentCartQuantity: number = 0, targetStoreId?: number): string {
  const inventory = getStoreInventory(product, targetStoreId);
  
  if (!inventory) {
    return 'Stock information not available';
  }
  
  const { can_order, in_stock, max_available } = inventory;
  
  if (!in_stock) {
    return 'Out of stock';
  }
  
  if (!can_order) {
    return 'Unavailable';
  }
  
  const remaining = (max_available || 0) - currentCartQuantity;
  if (remaining <= 3) {
    return `Only ${remaining} left in stock`;
  }
  
  return `${max_available || 0} available`;
}
