import React, { useState } from 'react';
import { Product } from '../store';
import { analyzeStockStatus, getStockStatusForUI } from '../lib/stock-utils';

interface DetailedStockStatusProps {
  product: Product;
  className?: string;
}

const DetailedStockStatus: React.FC<DetailedStockStatusProps> = ({ 
  product, 
  className = '' 
}) => {
  const [showDetails, setShowDetails] = useState(false);
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

  // Get circle color based on status
  const getCircleColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'orange': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (stockAnalysis.totalStores === 0) {
    return (
      <div className={`p-3 rounded-lg border ${getStatusColor(stockUI.color)} ${className}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getCircleColor(stockUI.color)}`}></div>
          <div>
            <p className="font-medium">{stockUI.displayText}</p>
            <p className="text-sm opacity-75">{stockUI.details}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border ${getStatusColor(stockUI.color)} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getCircleColor(stockUI.color)}`}></div>
          <div>
            <p className="font-medium">{stockUI.displayText}</p>
            <p className="text-sm opacity-75">{stockUI.details}</p>
          </div>
        </div>
        
        {stockAnalysis.totalStores > 1 && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm underline hover:no-underline"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        )}
      </div>

      {showDetails && stockAnalysis.stockDetails.length > 0 && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <h4 className="text-sm font-medium mb-2">Store Availability:</h4>
          <div className="space-y-2">
            {stockAnalysis.stockDetails.map((store) => (
              <div key={store.storeId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>Store {store.storeId}</span>
                  {store.isNearby && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                      Nearby
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={store.inStock && store.available > 0 ? 'text-green-600' : 'text-red-500'}>
                    {store.inStock && store.available > 0 ? '✅' : '❌'}
                  </span>
                  <span className="font-medium">
                    {store.available} available
                  </span>
                  {(store.onHold > 0 || store.reserved > 0) && (
                    <span className="text-xs opacity-75">
                      ({store.onHold} on hold, {store.reserved} reserved)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedStockStatus;
