"use client";

import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, Trash2, CheckCircle } from "lucide-react";
import { Product } from "@/store";

interface QuantityMismatchItem {
  product: Product;
  requestedQuantity: number;
  availableQuantity: number;
}

interface QuantityMismatchAlertProps {
  isOpen: boolean;
  onClose: () => void;
  mismatchedItems: QuantityMismatchItem[];
  onRemoveAll: () => void;
  onSetToAvailable: () => void;
  loading?: boolean;
}

const QuantityMismatchAlert: React.FC<QuantityMismatchAlertProps> = ({
  isOpen,
  onClose,
  mismatchedItems,
  onRemoveAll,
  onSetToAvailable,
  loading = false
}) => {
  if (!isOpen || mismatchedItems.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Quantity Mismatch
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Alert Message */}
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Inventory Issue</AlertTitle>
            <AlertDescription>
              Some products in your cart have quantity mismatches. The quantities you requested 
              are not available in our inventory.
            </AlertDescription>
          </Alert>

          {/* Mismatched Items List */}
          <div className="space-y-3 mb-6">
            <h4 className="font-medium text-gray-900">Affected Products:</h4>
            {mismatchedItems.map((item, index) => (
              <div key={index} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{item.product.name}</h5>
                    <p className="text-sm text-gray-600">
                      You requested: <span className="font-medium">{item.requestedQuantity}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Available: <span className="font-medium text-green-600">{item.availableQuantity}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-red-600 font-medium">
                      -{item.requestedQuantity - item.availableQuantity}
                    </div>
                    <div className="text-xs text-gray-500">excess</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={onSetToAvailable}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Set to Available Count
            </Button>
            
            <Button
              onClick={onRemoveAll}
              disabled={loading}
              variant="destructive"
              className="w-full flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Remove All Items
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                Processing...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuantityMismatchAlert;
