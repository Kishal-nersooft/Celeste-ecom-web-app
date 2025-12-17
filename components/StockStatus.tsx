import React from 'react';
import { Product } from '../store';
import { analyzeStockStatus, getStockStatusForUI, getSimpleStockStatus } from '../lib/stock-utils';

interface StockStatusProps {
  product: Product;
  variant?: 'simple' | 'detailed';
  className?: string;
}

const StockStatus: React.FC<StockStatusProps> = ({ 
  product, 
  variant = 'simple', 
  className = '' 
}) => {
  // Add error boundary for stock status
  try {
    if (variant === 'simple') {
      if (!product.inventory) {
        return (
          <div className={`flex items-center gap-2 ${className}`}>
            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
            <span className="text-xs text-gray-600">Stock Unknown</span>
          </div>
        );
      }
      
      const can_order = product.inventory.can_order;
      const in_stock = product.inventory.in_stock;
      
      // New logic: can_order true = normal, can_order false = unavailable
      // in_stock true = normal, in_stock false = out of stock
      // Both false = out of stock
      if (!in_stock) {
        return (
          <div className={`flex items-center gap-2 ${className}`}>
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-xs text-red-600 font-bold">Out of Stock</span>
          </div>
        );
      } else if (!can_order) {
        return (
          <div className={`flex items-center gap-2 ${className}`}>
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-xs text-red-600 font-bold">Unavailable</span>
          </div>
        );
      } else {
        // In stock and can order - show normal (no text, just green dot)
        return (
          <div className={`flex items-center gap-2 ${className}`}>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          </div>
        );
      }
    }

  // Detailed variant
  const stockAnalysis = analyzeStockStatus(product);
  const stockUI = getStockStatusForUI(stockAnalysis);

  const getStatusColor = (color: string) => {
    switch (color) {
      case 'green': return 'text-green-600 bg-green-50 border-green-200';
      case 'orange': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'red': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${getStatusColor(stockUI.color)} ${className}`}>
        <span>{stockUI.icon}</span>
        <span>{stockUI.displayText}</span>
      </div>
    );
  } catch (error) {
    // Fallback UI when stock status fails
    console.warn('StockStatus component error:', error);
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium text-gray-600 bg-gray-50 border-gray-200 ${className}`}>
        <span>❓</span>
        <span>Stock Unknown</span>
      </div>
    );
  }
};

export default StockStatus;
